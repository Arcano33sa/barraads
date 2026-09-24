# PDF etapa 2 - ajuste automático y una receta por hoja

Versión 1.22.1. Se conserva la plantilla A4 de E1 y el renderizador de PNG/JPG.
Se espera a las fuentes del navegador y se mide cada bloque con las mismas
fuentes, anchos y saltos de línea que se usan al dibujarlo.

Orden de ajuste por receta:
1. Plantilla normal, sin reducir texto.
2. Compactación intermedia de márgenes, huecos, filas, cabecera y foto.
3. Compactación máxima, conservando las mismas fuentes.
4. Escala uniforme exacta para caber, únicamente entre 90% y 100%.

El cuerpo principal queda como mínimo en unos 10.7 pt; los textos secundarios
en unos 9.6 pt sobre A4. Si la escala necesaria es inferior al 90%, se identifica
la receta con un aviso. No se corta, omite ni continúa en otra hoja. Una colección
se descarga solo después de completar todas sus recetas, sin archivos parciales.

## Validación realizada

Chrome headless en macOS con datos ficticios y sin modificar la biblioteca:
- Normal: altura medida 1575 px, escala 100%.
- Compactación intermedia: 1864 px, escala 100%.
- Compactación máxima: 1863 px, escala 100%.
- Caso largo: 2173 px, escala 90.8487%.
- Todas las líneas de notas conservadas y texto dentro de los límites de página.
- Ingrediente Al gusto conservado.
- Colecciones mixtas: 3 recetas = 3 páginas; 10 recetas = 10 páginas.
- Orden de fichas conservado y entradas sin mutaciones.
- Receta excesiva en mitad de colección: aviso, ninguna descarga parcial.
- Sin excepciones de página en la consola del navegador.
- pdfinfo confirma A4 vertical en ambas colecciones.
- Poppler: revisión visual de las diez páginas y del caso de escala mínima probado.
- Tests de Al gusto: 3/3 aprobados; git diff --check sin errores.

## Reproducción

Con servidor local en el puerto 8765 y Playwright disponible:
`node tests/pdf-e2.cjs`

Variables opcionales: PLAYWRIGHT_MODULE, CHROME_PATH y BARRA_URL.
El ejecutable de Chrome predeterminado es el de macOS.
Entrega de ejemplo: output/pdf/e2-10-recetas.pdf.
Los PDFs auxiliares quedan en barra-pdf-e2 dentro del directorio temporal.

La prueba invoca directamente las funciones de exportación que comparten
Seleccionadas y Todas. Los controles de interfaz, PWA instalada, actualización,
offline, fotografías y dispositivos reales quedan para E3; no se certifican aquí.
