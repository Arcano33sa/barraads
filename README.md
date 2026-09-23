# Barra de El Ágora del Sir — Exportación Final Hardened

Versión 1.11.0 construida exclusivamente sobre la Etapa 1/2 de exportación. Completa la Etapa 2/2 sin reconstruir la aplicación ni alterar sus reglas de negocio.

## Exportación final
- Acción compacta **Exportar** con alcance: Esta receta, Seleccionadas y Todas.
- Modo selección temporal con checkboxes, contador, cancelación y bloqueo contra exportación vacía.
- PNG/JPG individual cuando solo hay una receta.
- PNG/JPG múltiples dentro de un único ZIP local válido, sin CDN ni dependencia externa.
- Resolución automática de colisiones de nombres de archivo sanitizados.
- PDF individual o un único PDF multipágina vertical para varias recetas; cada receta comienza separada y puede continuar en páginas adicionales.
- Orden A-Z estable para Seleccionadas y Todas usando el mismo comparador de la biblioteca.
- Fotografía actual o placeholder; preparación interna para varias fotos preservada.
- Regla **Al gusto** preservada para cantidad 0 y unidad vacía en todas las modalidades.
- Estado de generación con conteo real de recetas, bloqueo de doble pulsación y recuperación de UI ante éxito o error.
- Manejo de fotografías no disponibles, errores de imagen/ZIP/PDF y fallos de memoria detectables.

## Persistencia y regresión
- La selección no se guarda como dato operativo.
- Exportar no modifica recetas, favoritas, catálogos, fotografías ni configuración.
- Recetas, catálogos y configuración continúan en LocalStorage.
- Fotografías y miniaturas continúan en IndexedDB.
- Respaldo/restauración JSON conserva el esquema 1.
- Service Worker y caché actualizados a 1.11.0 conservando los almacenes locales.
- Sin dependencias nuevas, sin CDN y sin logs de depuración.

## Versión
- App/PWA: 1.11.0
- Esquema de respaldo JSON: 1
