# Barra de El Ágora del Sir

Versión 1.14.6 construida sobre `Barra_Agora_InicioFix_SoloRecetasReales.zip`.

## v1.14.6 — Encabezado limpio

- Eliminada la campana de Notificaciones del encabezado.
- Eliminado el avatar circular “S”.
- Eliminados “Sir” y su flecha desplegable.
- Se conserva intacto el botón de menú móvil y la navegación existente.
- Sin cambios en recetas, fotografías, Catálogo, ALQUIMIA, JSON, exportación ni datos persistidos.
- Service Worker/cache actualizado a v1.14.6, sin dependencias CDN y sin limpieza de datos locales ni IndexedDB.

## v1.14.5 — Inicio sin contenido demo
- Eliminadas las recetas/base demo heredadas de Inicio.
- Por Base se construye únicamente con recetas reales guardadas y su base principal.
- El filtro de Inicio solo ofrece bases que actualmente tienen recetas reales.
- Las filas de Inicio abren la Ficha real y usan la fotografía principal cuando existe.
- Sin cambios en Catálogo, ALQUIMIA, JSON, exportación ni datos existentes.