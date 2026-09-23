# Barra de El Ágora del Sir — Fotografías múltiples — Final Hardened

Versión 1.14.1 construida exclusivamente sobre `Barra_Agora_FotosMultiples_Etapa2_Galeria.zip`.

## Cierre final

- La primera fotografía sigue siendo la principal en Recetas, Por Base, Favoritas, ficha, miniaturas y exportación.
- Galería y visor conservan navegación circular, contador, X, Escape, teclado y comportamiento táctil.
- JSON respalda y restaura cero, una o múltiples fotografías conservando orden y compatibilidad con respaldos antiguos de una sola foto.
- La restauración valida antes de reemplazar datos y mantiene rollback si falla la escritura local.
- Exportación individual, seleccionadas y todas conserva la ficha aprobada y usa solo la foto principal; si esa foto no puede decodificarse, intenta temporalmente la siguiente válida sin cambiar el orden guardado; si ninguna sirve, usa placeholder.
- “Al gusto” permanece activo para cantidad 0 sin unidad en ficha y exportaciones.
- Service Worker/cache actualizado a v1.14.1, sin dependencias CDN y conservando datos locales durante actualización.
- Visor grande corregido: la fotografía se muestra completa con `object-fit: contain`, centrada y sin recorte por tamaño de pantalla.
- Sin selector manual de principal, sin reordenamiento de fotos y sin rediseño de la ficha exportada.
