# E2: verificación de Al Gusto

Fecha local: 23 de septiembre de 2026. Versión: 1.21.1, commit de implementación `85569f4`.

Entorno: navegador integrado de Codex, app servida en `http://127.0.0.1:8765`, con almacenamiento inicialmente vacío y datos ficticios. No se usaron recetas reales ni se publicó la aplicación.

## Resultados

| Caso | Resultado observado |
| --- | --- |
| Ingrediente con cantidad vacía | Guardado bloqueado con mensaje de validación. |
| Hielo y Menta con cantidad 0 | Selector automático Al Gusto, deshabilitado; guardado correcto. |
| Ficha | Ambos ingredientes se muestran Al gusto; Ron blanco mantiene 45 ml. |
| Recarga y edición | Cantidades 0, 0, 45; los ceros mantienen unidad vacía y etiqueta Al Gusto. |
| Cambiar 0 a 10 | Vuelven unidades normales; guardar sin seleccionar una unidad queda bloqueado. |
| Seleccionar unidad y volver a 0 | Vuelve Al Gusto automáticamente y se elimina la unidad medida del borrador. |
| Editar notas y guardar | Las cantidades y unidades de los ingredientes se conservan. |
| Duplicar y abrir el editor de la copia | Conserva 0, 0, 45 y dos selectores Al Gusto. |
| PNG, JPG y PDF individuales | Archivos generados y revisados visualmente: Hielo y Menta Al gusto, Ron blanco 45 ml. PDF de una página, sin cortes de contenido. |
| Respaldo JSON | Original y copia contienen cantidad numérica 0 y unidad vacía en ambos ingredientes al gusto. |
| Restaurar ese respaldo | Tras restauración y recarga, el editor conserva 0, 0, 45 y dos selectores Al Gusto. |
| Histórico 0 + ml | Se conserva en el editor; aparece aviso; guardar otro cambio queda bloqueado. |
| Histórico 0 + medida fuera del catálogo | Se conserva `medida antigua` y aparece aviso. |
| Cancelar edición histórica y reabrir | Se conservan ml, medida antigua y Al Gusto, sin conversión silenciosa. |
| Corrección histórica explícita | Usar Al Gusto convierte la primera fila a cero sin unidad. Cambiar la segunda cantidad a 2 conserva medida antigua. |
| Histórico 5 + Al Gusto | Guardado bloqueado incluso después de corregir las dos filas anteriores; al seleccionar ml permite guardar. |
| Catálogo: agregar y renombrar | Rechaza Al Gusto y la variante con mayúsculas, espacios y acento; muestra explicación. |
| Versión y actualización | Configuración muestra v1.21.1, Service Worker activo y búsqueda local sin versión más reciente. |
| Consola al cierre | Sin errores capturados en la pestaña de prueba. |

## Repetición de los casos históricos

El archivo `fixtures/al-gusto-legacy.json` contiene datos ficticios deliberadamente incompatibles con las reglas actuales. Importarlo únicamente en un entorno de pruebas desde Configuración > Restaurar JSON: reemplaza los datos de ese origen.

1. Abrir E2 Historica y editarla. Comprobar que las dos filas con cero conservan sus unidades y muestran el aviso.
2. Intentar guardar una modificación en Notas: debe bloquearse. Cancelar y reabrir: las unidades deben seguir intactas.
3. Pulsar Usar Al Gusto en Hielo. Cambiar la cantidad de Menta a 2. Guardar todavía debe fallar por Ron blanco con 5 + Al Gusto.
4. Cambiar la unidad de Ron blanco a ml y guardar. La ficha debe mostrar Al gusto, 2 medida antigua y 5 ml.

## Alcance

No se necesitaron correcciones adicionales al código de E1. Se añadieron este registro y el respaldo ficticio reproducible. La verificación cubre el navegador local; no certifica la PWA instalada en un iPad físico ni una actualización desde una caché antigua. No se probaron exportaciones múltiples ni fotografías, ajenas al cambio de cantidad y unidad.

Se conservaron en Descargas los archivos ficticios exportados y el respaldo JSON. El origen local de prueba quedó con las dos recetas originales de E2 restauradas.
