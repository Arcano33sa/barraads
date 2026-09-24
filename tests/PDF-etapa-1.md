# PDF etapa 1 - plantilla A4 compacta

Implementada en v1.22.0. El PDF usa una composición independiente de PNG/JPG.
Cabecera y foto reducidas, texto principal de 28 px (aproximadamente 11.9 pt
sobre A4), bloques secundarios de 25 px (10.6 pt). No se aplica escalado.
Cada ficha se genera como una página de 1400 × 1980 y se incorpora a una
hoja PDF de 595.28 × 841.89 pt. Si no cabe, se detiene con un aviso.

Validación realizada: Chrome headless en macOS, receta ficticia sin fotografía,
seis ingredientes (incluido Al gusto), cinco pasos, técnicas, garnish, etiquetas
y notas. PDF de una página A4 confirmado con pdfinfo y revisión visual mediante
Poppler. Contenido excesivo: aviso verificado. Tests de Al gusto: 3/3 pasan.
El PDF original confirmó el corte de la primera receta en el bloque de Garnish.

Prueba reproducible: iniciar un servidor local en el puerto 8765 y ejecutar
`node tests/pdf-export.cjs` con Playwright disponible (o PLAYWRIGHT_MODULE
apuntando al módulo). Usa Chrome instalado en macOS y datos ficticios;
no modifica la biblioteca. Salida: output/pdf/prueba-a4-etapa-1.pdf.

Pendiente etapa 2: compactación/escalado progresivo limitado y pruebas múltiples.
Pendiente etapa 3: fotos, casos extremos, actualización PWA, offline e iPad real.
La versión/cache está actualizada; no se certifica aún el flujo de actualización.
