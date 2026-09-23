# Barra de El Ágora del Sir — Corrección de fotografías — Final Hardened

Versión 1.14.5 construida sobre `Barra_Agora_MenuFix_SinLema.zip`.

## Cierre final

- RECETAS / BIBLIOTECA muestra únicamente la fotografía principal (foto 1) en cada miniatura, sin flechas de galería.
- Cuando existen varias fotografías, la Biblioteca conserva un contador compacto `1 / N` únicamente informativo; con una sola foto el contador se oculta.
- Tocar la miniatura de Biblioteca abre la Ficha de receta, que siempre inicia en foto 1.
- El chevron derecho de la fila, favorito, menú de acciones, etiquetas, nombre y resumen permanecen intactos.
- Ficha y visor conservan navegación completa entre fotografías, contador, teclado, touch, responsive y visor con `object-fit: contain`.
- La primera fotografía sigue siendo la principal; al eliminarla, la siguiente ocupa su lugar según la lógica existente.
- Por Base y Favoritas mantienen su comportamiento previo, evitando ampliar el cambio fuera de la Biblioteca principal.
- JSON y exportación conservan orden, foto principal, compatibilidad con múltiples fotos y comportamiento de “Al gusto”.
- Service Worker/cache actualizado a v1.14.5, sin dependencias CDN y sin limpieza de datos locales ni IndexedDB.

- Menú lateral: eliminado el lema “Buenas bebidas / Mejores conversaciones / Siempre aprendiendo” de la interfaz para evitar solapamiento con Inicio en PC.


## v1.14.5 — Inicio sin contenido demo
- Eliminadas las recetas/base demo heredadas de Inicio.
- Por Base se construye únicamente con recetas reales guardadas y su base principal.
- El filtro de Inicio solo ofrece bases que actualmente tienen recetas reales.
- Las filas de Inicio abren la Ficha real y usan la fotografía principal cuando existe.
- Sin cambios en Catálogo, ALQUIMIA, JSON, exportación ni datos existentes.
