## v1.21.1 — Al Gusto: protecciones (E1)

- “Al Gusto” se reserva para cantidad cero: no puede agregarse ni renombrarse como unidad del catálogo, y una cantidad positiva con esa unidad es inválida.
- El editor conserva las unidades históricas, incluso si ya no existen en el catálogo. Si la cantidad es 0 y hay una unidad, muestra un aviso y permite corregir la cantidad o elegir explícitamente “Usar Al Gusto” antes de guardar.
- Se mantiene el formato `cantidad: 0, unidad: ""`, sin migrar recetas ni eliminar unidades de catálogos existentes.
- Versión y caché PWA actualizadas a v1.21.1. La verificación completa en pantalla corresponde a E2.
- Comprobación de las reglas de datos: `node --test tests/al-gusto.test.mjs`.

## v1.14.7 — Ficha optimizada para iPad vertical

- En tablet/iPad vertical, la cabecera de la Ficha pasa a dos columnas: fotografía a la izquierda e identidad/metadatos a la derecha.
- Se conservan foto principal, flechas, contador, visor, favoritos y los cinco datos superiores sin cambios de lógica.
- Escritorio, iPad horizontal y móvil mantienen su distribución previa.
- Service Worker/cache actualizado a v1.14.7 sin borrar datos locales ni IndexedDB.

## v1.14.5 — Inicio sin contenido demo
- Eliminadas las recetas/base demo heredadas de Inicio.
- Por Base se construye únicamente con recetas reales guardadas y su base principal.
- El filtro de Inicio solo ofrece bases que actualmente tienen recetas reales.
- Las filas de Inicio abren la Ficha real y usan la fotografía principal cuando existe.
- Sin cambios en Catálogo, ALQUIMIA, JSON, exportación ni datos existentes.

## Ajuste v1.14.8 — iPad/tablet vertical
- Se baja el botón Menú fuera de la zona de la barra de estado de iPadOS.
- Se respeta `safe-area-inset-top` y se garantiza una separación mínima visual.
- Sin cambios en escritorio, iPad horizontal, móvil ni en la lógica de navegación.



## Ajuste v1.14.9 — Al gusto

- Cantidad vacía ya no se representa ni interpreta visualmente como `0`.
- `0` real + unidad vacía se conserva como **Al gusto** en creación, edición, duplicado, persistencia y exportación.
- Ficha y exportaciones distinguen explícitamente entre cantidad ausente y cero real.
- Caché PWA actualizado a v1.14.9.

## Ajuste v1.14.11 — Al Gusto: edición y compatibilidad histórica

- Edición y reapertura conservan `cantidad: 0` + `unidad: ""` como **Al Gusto** visual.
- Duplicado conserva el contrato de datos de ingredientes Al Gusto sin convertir el cero en vacío.
- Cantidades históricas vacías siguen siendo ausencia de dato y no se convierten a cero.
- Registros históricos con `cantidad: 0` y una unidad real ya no se migran globalmente al cargar o guardar otras recetas.
- Ficha muestra **Al gusto** únicamente para `0 + unidad vacía`; un histórico `0 + unidad` conserva su lectura original.
- Caché/versionado PWA actualizado a v1.14.11 sin borrar datos locales ni fotografías.


## Ajuste v1.14.12 — Al Gusto: JSON, exportaciones y hardening final

- El contrato persistido se mantiene como `cantidad: 0` + `unidad: ""`; una cantidad vacía continúa como `null` y no se convierte a cero.
- Exportaciones PNG/JPG/PDF y exportaciones múltiples muestran “Al gusto” únicamente cuando la cantidad es cero y la unidad está vacía.
- Un registro histórico con cantidad cero y unidad explícita conserva su unidad en la exportación; no se migra visualmente a “Al gusto”.
- Respaldo/restauración JSON conserva cero numérico y unidad vacía mediante la sanitización existente, sin crear unidades fantasma ni duplicar recetas.
- Caché/versionado PWA actualizado a v1.14.12, manteniendo datos locales, favoritos, configuración y fotografías fuera del ciclo destructivo de actualización.


## Ajuste v1.15.0 — Mixer Etapa 1/3

- Nuevo módulo **Mixer** inmediatamente debajo de Favoritas.
- Selector A-Z alimentado solo por recetas reales guardadas, sin duplicar ni modificar recetas.
- Lectura de nombre, base principal, categoría, cristalería e ingredientes.
- Campos temporales `Rendimiento original` y `Quiero preparar`, originalmente planteados en ml; desde v1.18.0 la unidad de proporción es dinámica ml/oz.
- Sugerencia de rendimiento únicamente cuando todos los ingredientes positivos usan `ml`; `0 + unidad vacía` se muestra como **Al gusto** y no suma.
- Sin conversiones automáticas, sin cambios de modelo de receta, JSON o exportaciones.
- Caché/versionado PWA actualizado a v1.15.0 e inclusión de `js/mixer.js` en el app shell offline.
## Ajuste v1.16.0 — Mixer Etapa 2/3

- Motor proporcional temporal: `factor = volumen objetivo / rendimiento original`.
- Resultado por ingrediente con columnas Ingrediente / Original / Necesario, sin conversiones de unidad ni escritura en storage.
- `0 + unidad vacía` se presenta como **Al gusto** en origen y resultado; cantidades históricas ausentes se presentan como **Sin cantidad** y no se calculan.
- Validación de rendimiento/objetivo mayor que cero, actualización automática al editar valores y limpieza segura al cambiar de receta.
- Resultado responsive: grilla compacta en escritorio/iPad horizontal y filas apiladas en móvil/iPad vertical, sin scroll horizontal global.
- PWA/cache y versión visible actualizados a v1.16.0.



## Ajuste v1.17.0 — Mixer final
- Mixer queda cerrado como calculadora aislada de solo lectura: no modifica recetas ni persiste rendimiento, objetivo, factor o resultados.
- Validación endurecida para valores vacíos, 0, negativos, NaN/Infinity y precisión decimal; sin depender de truthy/falsy para cantidades 0.
- “Al gusto” permanece ligado exclusivamente a cantidad 0 + unidad vacía; cantidades históricas vacías no se convierten en 0.
- Sugerencia automática de rendimiento solo cuando toda la receta calculable es inequívocamente ml (permitiendo filas “Al gusto” sin volumen).
- Cambio de receta limpia estado temporal y evita mezclar ingredientes/resultados.
- Responsive reforzado para PC, iPad horizontal/vertical, móvil y PWA standalone sin scroll horizontal general.
- Cache/versión PWA actualizados a v1.17.0.


## Ajuste v1.18.0 — Mixer: unidad dinámica de proporción
- `Define la proporción` ya no queda fijado a ml: incorpora selector compacto ml/oz.
- Recetas homogéneas en ml u oz seleccionan automáticamente su unidad y pueden sugerir el rendimiento sin convertir.
- En recetas mixtas o ambiguas la unidad queda por elegir manualmente; Mixer no infiere ni convierte.
- Al cambiar la unidad se limpian los valores temporales para impedir reinterpretar números como si hubieran sido convertidos.
- Resultado, sufijos y accesibilidad muestran la unidad elegida.
- PWA/cache actualizados a v1.18.0.


## Ajuste v1.19.0 — Mixer Histórico Etapa 1/2
- Guardado manual de cálculos válidos desde Mixer; calcular o cambiar valores no persiste nada automáticamente.
- Colección local aislada `mixer.history.v1` con snapshot del cálculo, unidad de proporción, factor, fecha/hora e ingredientes.
- Conservación explícita de “Al gusto” y cantidades históricas vacías sin convertirlas en cero.
- Respaldo/restauración JSON incluye `data.mixerHistorico` y acepta respaldos antiguos sin esa colección.
- Acceso “Histórico” preparado para la vista alfabética de la Etapa 2.
- PWA/cache actualizados a v1.19.0.


## Ajuste v1.20.0 — Mixer Histórico Etapa 2/2

- Histórico de Mixer en pantalla propia, sin convertirlo en módulo del menú principal.
- Agrupación A-Z/# con accordions cerrados por defecto y orden estable por receta, unidad, objetivo y fecha.
- Acciones Ver, Borrar y Usar nuevamente sobre snapshots guardados.
- Ver conserva el snapshot aunque la receta fuente cambie o deje de existir.
- Usar nuevamente carga rendimiento, unidad y objetivo guardados sobre la receta actual cuando el recipeId todavía existe, sin autoguardar.
- Borrado aislado con confirmación; JSON conserva/restaura Histórico sin persistir el estado visual de los accordions.
- Responsive/hardening PC, iPad y móvil; PWA/cache actualizados a v1.20.0.
