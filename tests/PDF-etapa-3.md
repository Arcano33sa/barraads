# PDF etapa 3 - hardening y PWA

Versión de salida: 1.22.2. Validación local completada; validación física de iPad
pendiente. No se ha publicado ni actualizado una instalación del usuario.

## Cambio encontrado durante E3

Los estilos de botones podían anular el atributo HTML `hidden` de las acciones
PWA. Se añadió una regla limitada a `.pwa-actions-panel button[hidden]` para
ocultar Aplicar actualización/Instalar cuando no están disponibles. La prueba
confirma que Aplicar actualización vuelve a ocultarse al terminar la actualización.
La versión de index.html, settings.js, service-worker.js y app-version.json coincide.
No se cambió el modelo, el almacenamiento de recetas ni las fotografías.

## Pruebas realizadas

| Caso | Resultado y alcance |
| --- | --- |
| PDF individual desde ficha | Una página A4, foto principal incluida |
| PDF de seleccionadas desde controles | Tres recetas, tres páginas |
| PDF de todas desde controles | Siete recetas distintas, siete páginas |
| Receta corta y sin foto | Completa y con placeholder |
| Receta con foto | Imagen sintética procesada y guardada en IndexedDB |
| Notas largas | 13 notas completas |
| Muchas etiquetas | 35 etiquetas completas |
| Muchos pasos de ALQUIMIA | 19 pasos completos |
| Campos largos | Título, metadatos, ingredientes y unidades con salto de línea |
| Palabra sin espacios, tildes y signos | Ajuste al ancho; texto dentro de la hoja |
| Al gusto / histórico / ausencia | 0 sin unidad: Al gusto; 0 ml conservado; ausencia sin inventar cantidad |
| Fotografía principal dañada | Usa la siguiente válida sin cambiar datos |
| Todas las fotografías dañadas | Placeholder sin detener exportación |
| Medición geométrica | Ningún glifo fuera de página ni textos superpuestos |
| Revisión visual | Siete páginas renderizadas con Poppler e inspeccionadas |
| PNG/JPG | Con y sin fotografía, mismos hashes SHA-256 frente al commit de v1.21.1 |
| Buscar actualización | Detecta 1.22.2 desde una carga real de v1.21.1 |
| Aplicar actualización | Worker nuevo activa, recarga, versión 1.22.2 |
| Caché | Solo queda agora-sir-1.22.2 tras aplicar |
| Segunda búsqueda | Indica actualizada; botón Aplicar oculto |
| Recetas y fotos | JSON de recetas y hashes de foto/miniatura idénticos antes/después |
| PC offline | Recarga controlada por SW; PDF individual y de todas con fotografía |
| Tablet vertical y horizontal | Viewport, táctil y UA simulados en Chromium; menú y botones operables |
| Rama standalone | navigator.standalone simulado; estado Instalada y exportación funcional |
| Tablet offline | Recarga y exportación de todas en ambas orientaciones |
| Consola | Cero excepciones de página y cero mensajes de nivel error |
| Pruebas de datos | tests/al-gusto.test.mjs: 3/3 pasan |

La actualización se prueba en un servidor efímero y un contexto de navegador
vacío. Primero sirve el commit 19d9e02a9cef1c31b466674a23de5a055fdf735b (v1.21.1),
guarda datos ficticios y luego sirve el árbol de trabajo actual. Se pulsan los
botones reales; no se reemplazan las funciones de actualización ni el worker.

## Reproducción

`node tests/pdf-e3.cjs`

Requiere Playwright y Chrome. Admite PLAYWRIGHT_MODULE, CHROME_PATH y
BARRA_BASE_REF. Si Playwright no está instalado en el proyecto, intenta el runtime
local de Codex. El servidor temporal se cierra al terminar y el contexto aislado
no toca el perfil del usuario. Se requiere permiso para abrir el puerto local y
Chrome si el entorno está restringido.

Entrega: output/pdf/e3-validacion-completa.pdf (siete recetas ficticias).
Pruebas auxiliares y report.json: carpeta barra-pdf-e3 dentro del temporal del
sistema. Las pruebas previas de E2 cubren además 3/10 páginas y escala al 90.85%.

## Límite de la validación y comprobación física pendiente

Chromium con dimensiones/UA de iPad no equivale a Safari/WebKit. La bandera
standalone no equivale a una instalación nativa ni prueba su diálogo de descarga.
No se certifican iPad físico, Safari, instalación desde Inicio ni almacenamiento
bajo las restricciones de iPadOS.

Para cerrar esa parte cuando la versión esté disponible en un iPad:
1. Usar Buscar actualizaciones y Aplicar actualización; confirmar v1.22.2 y que
   siguen las recetas y fotografías existentes.
2. Desde la PWA instalada en Inicio, exportar una receta con foto, varias
   seleccionadas y todas, tanto en vertical como en horizontal.
3. Abrir los PDFs en Archivos y comprobar una receta por página, legibilidad y
   ausencia de cortes, especialmente la última línea de ALQUIMIA y Notas.
4. Activar modo avión, cerrar/abrir la PWA y repetir una exportación con foto.

Estos cuatro pasos son pendientes de dispositivo, no resultados aprobados.
