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