# Barra de El Ágora del Sir — Final Hardened

Versión final 1.9.0 cerrada sobre la base funcional de la Etapa 8, sin agregar funciones nuevas ni alterar la identidad visual o las reglas de negocio.

## Hardening final
- Regresión de navegación y módulos principales.
- CRUD y persistencia de catálogos y recetas.
- Favoritas, orden A-Z/Z-A, bases dinámicas y ficha completa.
- ALQUIMIA con numeración estable.
- Fotografías optimizadas y persistentes en IndexedDB.
- Respaldo/restauración JSON con validación y rollback.
- PWA instalable con Service Worker, caché versionada y actualización manual.
- Versión final sincronizada en `js/settings.js`, `service-worker.js`, `app-version.json` e interfaz.
- Registro del Service Worker con `updateViaCache: none` y precarga del app shell forzada a red para evitar quedar atrapada en caché vieja.
- Responsive para escritorio, iPad horizontal, iPad vertical y móvil sin scroll horizontal general.
- Ajustes de foco, estado accesible de favoritas y cierre por Escape en confirmaciones de Configuración.
- Sin logs de depuración ni dependencias nuevas.

## Persistencia
- Recetas, catálogos y configuración: LocalStorage.
- Fotografías optimizadas y miniaturas: IndexedDB.
- Actualizar la PWA no borra ni reemplaza esos almacenes.

## Versión
- App/PWA: 1.9.0
- Esquema de respaldo JSON: 1
# barraads
