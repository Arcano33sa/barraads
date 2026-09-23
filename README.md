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
