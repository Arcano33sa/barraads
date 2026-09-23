const EXPORT_WIDTH = 1400;
const EXPORT_PADDING = 70;
const CONTENT_WIDTH = EXPORT_WIDTH - (EXPORT_PADDING * 2);
const COLORS = {
  navy:'#102a45',
  navy2:'#173a59',
  cream:'#f6f2e9',
  cream2:'#ebe4d8',
  paper:'#fbf8f1',
  ink:'#18334f',
  muted:'#68798a',
  burgundy:'#922631',
  burgundy2:'#b64049',
  gold:'#b18a57',
  green:'#2d8e50',
  red:'#b33d47',
  amber:'#c38b28',
  line:'rgba(24,51,79,.16)'
};

const serif = size => `${size}px Georgia, "Times New Roman", serif`;
const sans = (size,weight=400) => `${weight} ${size}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;

function cleanText(value,fallback=''){
  const text = String(value ?? '').trim();
  return text || fallback;
}

function roundedRect(ctx,x,y,w,h,r){
  const radius = Math.max(0,Math.min(r,Math.min(w,h)/2));
  ctx.beginPath();
  ctx.moveTo(x + radius,y);
  ctx.arcTo(x + w,y,x + w,y + h,radius);
  ctx.arcTo(x + w,y + h,x,y + h,radius);
  ctx.arcTo(x,y + h,x,y,radius);
  ctx.arcTo(x,y,x + w,y,radius);
  ctx.closePath();
}

function wrapLines(ctx,text,maxWidth){
  const normalized = cleanText(text).replace(/\r/g,'');
  if (!normalized) return [];
  const paragraphs = normalized.split('\n');
  const lines = [];
  paragraphs.forEach((paragraph,pIndex) => {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push('');
    } else {
      let line = '';
      words.forEach(word => {
        const attempt = line ? `${line} ${word}` : word;
        if (ctx.measureText(attempt).width <= maxWidth) {
          line = attempt;
          return;
        }
        if (line) lines.push(line);
        if (ctx.measureText(word).width <= maxWidth) {
          line = word;
          return;
        }
        let chunk = '';
        [...word].forEach(char => {
          const next = chunk + char;
          if (chunk && ctx.measureText(next).width > maxWidth) {
            lines.push(chunk);
            chunk = char;
          } else chunk = next;
        });
        line = chunk;
      });
      if (line) lines.push(line);
    }
    if (pIndex < paragraphs.length - 1) lines.push('');
  });
  return lines;
}

function measureWrapped(ctx,text,maxWidth,lineHeight){
  const lines = wrapLines(ctx,text,maxWidth);
  return {lines,height:Math.max(lineHeight,lines.length * lineHeight)};
}

function drawWrapped(ctx,text,x,y,maxWidth,lineHeight,{font=serif(28),color=COLORS.ink,maxLines=null}={}){
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textBaseline = 'top';
  let lines = wrapLines(ctx,text,maxWidth);
  if (maxLines && lines.length > maxLines) {
    lines = lines.slice(0,maxLines);
    const last = lines.length - 1;
    let candidate = `${lines[last]}…`;
    while (candidate.length > 1 && ctx.measureText(candidate).width > maxWidth) candidate = `${candidate.slice(0,-2)}…`;
    lines[last] = candidate;
  }
  lines.forEach((line,index) => ctx.fillText(line,x,y + (index * lineHeight)));
  return Math.max(lineHeight,lines.length * lineHeight);
}

function drawLabel(ctx,text,x,y){
  ctx.font = sans(15,700);
  ctx.fillStyle = COLORS.muted;
  ctx.textBaseline = 'top';
  ctx.fillText(cleanText(text).toUpperCase(),x,y);
}

function drawChip(ctx,text,x,y,maxWidth){
  const label = cleanText(text,'No especificado');
  ctx.font = sans(17,600);
  const paddingX = 18;
  const w = Math.min(maxWidth,Math.max(78,ctx.measureText(label).width + (paddingX * 2)));
  roundedRect(ctx,x,y,w,38,19);
  ctx.fillStyle = COLORS.cream2;
  ctx.fill();
  ctx.strokeStyle = COLORS.line;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = COLORS.ink;
  ctx.textBaseline = 'middle';
  ctx.fillText(label,x + paddingX,y + 19,Math.max(1,w - paddingX * 2));
  return w;
}

function chipsHeight(ctx,values,maxWidth){
  const safe = Array.isArray(values) && values.length ? values : ['No especificado'];
  let x = 0;
  let y = 0;
  safe.forEach(value => {
    ctx.font = sans(17,600);
    const w = Math.min(maxWidth,Math.max(78,ctx.measureText(cleanText(value)).width + 36));
    if (x && x + w > maxWidth) { x = 0; y += 50; }
    x += w + 10;
  });
  return y + 38;
}

function drawChips(ctx,values,x,y,maxWidth){
  const safe = Array.isArray(values) && values.length ? values : ['No especificado'];
  let cursorX = 0;
  let cursorY = 0;
  safe.forEach(value => {
    ctx.font = sans(17,600);
    const desired = Math.min(maxWidth,Math.max(78,ctx.measureText(cleanText(value)).width + 36));
    if (cursorX && cursorX + desired > maxWidth) { cursorX = 0; cursorY += 50; }
    const w = drawChip(ctx,value,x + cursorX,y + cursorY,maxWidth - cursorX);
    cursorX += w + 10;
  });
  return cursorY + 38;
}

function ingredientAmount(row){
  const raw = row?.cantidad;
  const hasAmount = raw !== null && raw !== undefined && String(raw).trim() !== '';
  if (!hasAmount) return '';
  const amount = Number(raw);
  if (Number.isFinite(amount) && amount === 0) return 'Al gusto';
  const amountText = Number.isFinite(amount)
    ? new Intl.NumberFormat('es-NI',{maximumFractionDigits:2}).format(amount)
    : '';
  return [amountText,cleanText(row?.unidad)].filter(Boolean).join(' ');
}

function statusColor(status){
  if (status === 'Aprobada') return COLORS.green;
  if (status === 'Descartada') return COLORS.red;
  return COLORS.amber;
}

function normalizePhotoBlobs(media){
  const candidates = [];
  const push = blob => {
    if (!(blob instanceof Blob) || !blob.type?.startsWith('image/')) return;
    if (!candidates.includes(blob)) candidates.push(blob);
  };
  if (Array.isArray(media?.photos)) media.photos.forEach(photo => push(photo?.fullBlob));
  if (!candidates.length) push(media?.fullBlob);
  if (Array.isArray(media?.fullBlobs)) media.fullBlobs.forEach(push);
  return candidates;
}

async function loadFirstAvailablePhoto(blobs){
  const safe = Array.isArray(blobs) ? blobs : [];
  for (let index = 0; index < safe.length; index += 1) {
    try {
      const image = await loadImageFromBlob(safe[index]);
      return {image,index};
    } catch {
      // La foto puede estar dañada. Se intenta la siguiente sin alterar el orden guardado.
    }
  }
  return {image:null,index:-1};
}

function loadImageFromBlob(blob){
  return new Promise((resolve,reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No fue posible preparar la fotografía para exportar.')); };
    img.src = url;
  });
}

function loadImageFromUrl(url){
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function drawContainedImage(ctx,img,x,y,w,h){
  const iw = Number(img?.naturalWidth || img?.width || 0);
  const ih = Number(img?.naturalHeight || img?.height || 0);
  if (!iw || !ih) return;
  const scale = Math.min(w / iw,h / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.drawImage(img,x + ((w - dw) / 2),y + ((h - dh) / 2),dw,dh);
}

function drawPhotoGallery(ctx,images,brandImage,x,y,w,h){
  roundedRect(ctx,x,y,w,h,24);
  const gradient = ctx.createLinearGradient(x,y,x + w,y + h);
  gradient.addColorStop(0,'#173a59');
  gradient.addColorStop(.58,'#506278');
  gradient.addColorStop(1,'#8a6a4c');
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.save();
  roundedRect(ctx,x,y,w,h,24);
  ctx.clip();
  if (!images.length) {
    ctx.fillStyle = 'rgba(5,25,42,.28)';
    ctx.fillRect(x,y,w,h);
    if (brandImage) {
      ctx.globalAlpha = .22;
      drawContainedImage(ctx,brandImage,x + w * .32,y + h * .12,w * .36,h * .5);
      ctx.globalAlpha = 1;
    }
    ctx.font = serif(32);
    ctx.fillStyle = COLORS.cream;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Sin fotografía',x + w/2,y + h * .68);
    ctx.font = sans(16,500);
    ctx.fillStyle = 'rgba(246,242,233,.82)';
    ctx.fillText('La receta conserva toda su información.',x + w/2,y + h * .76);
    ctx.textAlign = 'left';
  } else if (images.length === 1) {
    ctx.fillStyle = 'rgba(255,255,255,.06)';
    ctx.fillRect(x,y,w,h);
    drawContainedImage(ctx,images[0],x + 14,y + 14,w - 28,h - 28);
  } else {
    const visible = images.slice(0,4);
    const gap = 10;
    const cols = 2;
    const rows = Math.ceil(visible.length / cols);
    const cellW = (w - gap) / cols;
    const cellH = (h - gap * (rows - 1)) / rows;
    visible.forEach((img,index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const cx = x + col * (cellW + gap);
      const cy = y + row * (cellH + gap);
      ctx.fillStyle = 'rgba(255,255,255,.06)';
      ctx.fillRect(cx,cy,cellW,cellH);
      drawContainedImage(ctx,img,cx + 8,cy + 8,cellW - 16,cellH - 16);
    });
    if (images.length > visible.length) {
      ctx.fillStyle = 'rgba(4,19,32,.68)';
      ctx.fillRect(x + w - 110,y + h - 54,88,34);
      ctx.font = sans(16,700);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`+${images.length - visible.length}`,x + w - 66,y + h - 37);
      ctx.textAlign = 'left';
    }
  }
  ctx.restore();
}

function panelBase(ctx,x,y,w,h,title,subtitle,icon){
  roundedRect(ctx,x,y,w,h,18);
  ctx.fillStyle = 'rgba(255,255,255,.7)';
  ctx.fill();
  ctx.strokeStyle = COLORS.line;
  ctx.lineWidth = 2;
  ctx.stroke();
  roundedRect(ctx,x + 22,y + 20,46,46,12);
  ctx.fillStyle = COLORS.cream2;
  ctx.fill();
  ctx.font = sans(24,700);
  ctx.fillStyle = COLORS.navy2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(icon,x + 45,y + 43);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = serif(29);
  ctx.fillStyle = COLORS.navy;
  ctx.fillText(title,x + 82,y + 17);
  if (subtitle) {
    ctx.font = sans(15,500);
    ctx.fillStyle = COLORS.muted;
    ctx.fillText(subtitle,x + 82,y + 52);
  }
  ctx.strokeStyle = 'rgba(24,51,79,.11)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 22,y + 82);
  ctx.lineTo(x + w - 22,y + 82);
  ctx.stroke();
}

function measureExport(recipe,ctx){
  const inner = CONTENT_WIDTH - 48;
  const ingredients = Array.isArray(recipe?.ingredientes) ? recipe.ingredientes : [];
  ctx.font = serif(24);
  let ingredientBody = 18;
  ingredients.forEach(row => {
    const name = cleanText(row?.ingrediente,'Ingrediente');
    const nameLines = wrapLines(ctx,name,inner - 260).length || 1;
    ingredientBody += Math.max(58,nameLines * 31 + 20);
  });
  if (!ingredients.length) ingredientBody += 54;
  const ingredientH = 100 + ingredientBody;

  const alchemy = Array.isArray(recipe?.alquimia) ? [...recipe.alquimia].sort((a,b)=>Number(a?.orden||0)-Number(b?.orden||0)) : [];
  ctx.font = serif(23);
  let alchemyBody = 20;
  alchemy.forEach(step => {
    const lines = wrapLines(ctx,cleanText(step?.texto),inner - 86).length || 1;
    alchemyBody += Math.max(60,lines * 32 + 18);
  });
  if (!alchemy.length) alchemyBody += 54;
  const alchemyH = 100 + alchemyBody;

  ctx.font = sans(17,600);
  const techniquesH = 108 + chipsHeight(ctx,recipe?.tecnicas,inner);
  const tagsH = 108 + chipsHeight(ctx,recipe?.etiquetas,inner);
  ctx.font = serif(23);
  const garnish = measureWrapped(ctx,cleanText(recipe?.decoracion,'Sin decoración especificada'),inner,32);
  const garnishH = 108 + garnish.height;
  const notes = measureWrapped(ctx,cleanText(recipe?.notas,'Sin notas.'),inner,32);
  const notesH = 108 + notes.height;

  const heroH = 500;
  const headerH = 170;
  const footerH = 95;
  const gaps = 7 * 24;
  const height = EXPORT_PADDING + headerH + heroH + ingredientH + alchemyH + techniquesH + garnishH + tagsH + notesH + gaps + footerH + EXPORT_PADDING;
  return {height,heroH,headerH,ingredientH,alchemyH,techniquesH,garnishH,tagsH,notesH,footerH};
}

function drawMetaItem(ctx,label,value,x,y,w){
  drawLabel(ctx,label,x,y);
  ctx.font = serif(24);
  ctx.fillStyle = COLORS.ink;
  ctx.textBaseline = 'top';
  drawWrapped(ctx,cleanText(value,'No especificado'),x,y + 25,w,31,{font:serif(24),color:COLORS.ink,maxLines:2});
}

function drawHeader(ctx,recipe,y){
  ctx.font = sans(16,700);
  ctx.fillStyle = COLORS.burgundy;
  ctx.textBaseline = 'top';
  ctx.fillText('BARRA DE EL ÁGORA DEL SIR',EXPORT_PADDING,y + 4);
  ctx.font = sans(14,600);
  ctx.fillStyle = COLORS.muted;
  ctx.fillText('FICHA DE RECETA',EXPORT_PADDING,y + 36);
  ctx.font = serif(54);
  ctx.fillStyle = COLORS.navy;
  const titleHeight = drawWrapped(ctx,cleanText(recipe?.nombre,'Receta'),EXPORT_PADDING,y + 64,CONTENT_WIDTH - 250,58,{font:serif(54),color:COLORS.navy,maxLines:2});
  const status = cleanText(recipe?.estado,'En prueba');
  const statusW = 150;
  roundedRect(ctx,EXPORT_WIDTH - EXPORT_PADDING - statusW,y + 66,statusW,46,23);
  ctx.fillStyle = '#f5efe6';
  ctx.fill();
  ctx.strokeStyle = 'rgba(24,51,79,.15)';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(EXPORT_WIDTH - EXPORT_PADDING - statusW + 24,y + 89,7,0,Math.PI*2);
  ctx.fillStyle = statusColor(status);
  ctx.fill();
  ctx.font = sans(16,700);
  ctx.fillStyle = COLORS.ink;
  ctx.textBaseline = 'middle';
  ctx.fillText(status,EXPORT_WIDTH - EXPORT_PADDING - statusW + 42,y + 89,statusW - 52);
  ctx.strokeStyle = COLORS.burgundy;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(EXPORT_PADDING,y + 144 + Math.max(0,titleHeight - 58));
  ctx.lineTo(EXPORT_WIDTH - EXPORT_PADDING,y + 144 + Math.max(0,titleHeight - 58));
  ctx.stroke();
  return y + 170 + Math.max(0,titleHeight - 58);
}

function drawHero(ctx,recipe,images,brandImage,y,h,safeBreaks){
  const photoW = 510;
  drawPhotoGallery(ctx,images,brandImage,EXPORT_PADDING,y,photoW,h);
  const infoX = EXPORT_PADDING + photoW + 30;
  const infoW = CONTENT_WIDTH - photoW - 30;
  roundedRect(ctx,infoX,y,infoW,h,22);
  ctx.fillStyle = 'rgba(255,255,255,.58)';
  ctx.fill();
  ctx.strokeStyle = COLORS.line;
  ctx.lineWidth = 2;
  ctx.stroke();
  const colW = (infoW - 72) / 2;
  drawMetaItem(ctx,'Base principal',recipe?.basePrincipal,infoX + 26,y + 30,colW);
  drawMetaItem(ctx,'Bases secundarias',(recipe?.basesSecundarias || []).join(', ') || 'Ninguna',infoX + 46 + colW,y + 30,colW);
  ctx.strokeStyle = 'rgba(24,51,79,.11)';
  ctx.beginPath();ctx.moveTo(infoX + 26,y + 125);ctx.lineTo(infoX + infoW - 26,y + 125);ctx.stroke();
  drawMetaItem(ctx,'Categoría',recipe?.categoria,infoX + 26,y + 148,colW);
  drawMetaItem(ctx,'Cristalería',recipe?.cristaleria,infoX + 46 + colW,y + 148,colW);
  ctx.beginPath();ctx.moveTo(infoX + 26,y + 245);ctx.lineTo(infoX + infoW - 26,y + 245);ctx.stroke();
  drawLabel(ctx,'Perfil de bases',infoX + 26,y + 272);
  drawChips(ctx,[recipe?.basePrincipal,...(recipe?.basesSecundarias || [])].filter(Boolean),infoX + 26,y + 303,infoW - 52);
  safeBreaks.push(y + h);
  return y + h;
}

function drawIngredients(ctx,recipe,y,h,safeBreaks){
  panelBase(ctx,EXPORT_PADDING,y,CONTENT_WIDTH,h,'Ingredientes','Cantidades y unidades de la receta.','❧');
  const rows = Array.isArray(recipe?.ingredientes) ? recipe.ingredientes : [];
  let cy = y + 102;
  if (!rows.length) {
    ctx.font = serif(22);ctx.fillStyle = COLORS.muted;ctx.fillText('Sin ingredientes registrados.',EXPORT_PADDING + 26,cy + 14);
    cy += 54;
  } else rows.forEach((row,index) => {
    ctx.font = serif(24);
    const name = cleanText(row?.ingrediente,'Ingrediente');
    const nameLines = wrapLines(ctx,name,CONTENT_WIDTH - 48 - 260);
    const rowH = Math.max(58,nameLines.length * 31 + 20);
    roundedRect(ctx,EXPORT_PADDING + 24,cy + 10,38,38,19);
    ctx.fillStyle = COLORS.cream2;ctx.fill();
    ctx.font = sans(15,700);ctx.fillStyle = COLORS.muted;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(index + 1),EXPORT_PADDING + 43,cy + 29);ctx.textAlign='left';
    drawWrapped(ctx,name,EXPORT_PADDING + 78,cy + 12,CONTENT_WIDTH - 48 - 300,31,{font:serif(24),color:COLORS.ink});
    ctx.font = sans(19,700);ctx.fillStyle = COLORS.navy2;ctx.textAlign='right';ctx.textBaseline='top';ctx.fillText(ingredientAmount(row),EXPORT_WIDTH - EXPORT_PADDING - 28,cy + 17,220);ctx.textAlign='left';
    cy += rowH;
    ctx.strokeStyle = 'rgba(24,51,79,.08)';ctx.beginPath();ctx.moveTo(EXPORT_PADDING + 24,cy);ctx.lineTo(EXPORT_WIDTH - EXPORT_PADDING - 24,cy);ctx.stroke();
    safeBreaks.push(cy);
  });
  safeBreaks.push(y + h);
  return y + h;
}

function drawAlchemy(ctx,recipe,y,h,safeBreaks){
  panelBase(ctx,EXPORT_PADDING,y,CONTENT_WIDTH,h,'ALQUIMIA','Preparación en orden estable.','⚗');
  const steps = Array.isArray(recipe?.alquimia) ? [...recipe.alquimia].sort((a,b)=>Number(a?.orden||0)-Number(b?.orden||0)) : [];
  let cy = y + 106;
  if (!steps.length) {
    ctx.font = serif(22);ctx.fillStyle = COLORS.muted;ctx.fillText('Sin pasos registrados.',EXPORT_PADDING + 26,cy + 12);cy += 54;
  } else steps.forEach((step,index) => {
    ctx.font = serif(23);
    const text = cleanText(step?.texto);
    const lines = wrapLines(ctx,text,CONTENT_WIDTH - 48 - 86);
    const rowH = Math.max(60,lines.length * 32 + 18);
    ctx.beginPath();ctx.arc(EXPORT_PADDING + 46,cy + 27,22,0,Math.PI*2);ctx.fillStyle = COLORS.burgundy;ctx.fill();
    ctx.font = sans(15,700);ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(index + 1),EXPORT_PADDING + 46,cy + 27);ctx.textAlign='left';
    drawWrapped(ctx,text,EXPORT_PADDING + 82,cy + 9,CONTENT_WIDTH - 110,32,{font:serif(23),color:COLORS.ink});
    cy += rowH;
    safeBreaks.push(cy);
  });
  safeBreaks.push(y + h);
  return y + h;
}

function drawChipPanel(ctx,title,values,y,h,safeBreaks){
  panelBase(ctx,EXPORT_PADDING,y,CONTENT_WIDTH,h,title,'','•');
  drawChips(ctx,values,EXPORT_PADDING + 26,y + 104,CONTENT_WIDTH - 52);
  safeBreaks.push(y + h);
  return y + h;
}

function drawTextPanel(ctx,title,text,y,h,safeBreaks){
  panelBase(ctx,EXPORT_PADDING,y,CONTENT_WIDTH,h,title,'','•');
  drawWrapped(ctx,cleanText(text,title === 'Notas' ? 'Sin notas.' : 'Sin decoración especificada'),EXPORT_PADDING + 26,y + 104,CONTENT_WIDTH - 52,32,{font:serif(23),color:COLORS.ink});
  safeBreaks.push(y + h);
  return y + h;
}

async function createRecipeCanvas(recipe,media,{brandImageUrl='./assets/escudo-agora.png'}={}){
  const photoBlobs = normalizePhotoBlobs(media);
  const [photoResult,brandImage] = await Promise.all([
    loadFirstAvailablePhoto(photoBlobs),
    loadImageFromUrl(brandImageUrl)
  ]);
  const images = photoResult.image ? [photoResult.image] : [];
  const photoStatus = !photoBlobs.length
    ? 'none'
    : photoResult.index === 0
      ? 'primary'
      : photoResult.index > 0
        ? 'fallback'
        : 'placeholder';
  const measureCanvas = document.createElement('canvas');
  measureCanvas.width = EXPORT_WIDTH;
  measureCanvas.height = 10;
  const measureCtx = measureCanvas.getContext('2d');
  if (!measureCtx) throw new Error('Este navegador no permite preparar la exportación.');
  const layout = measureExport(recipe,measureCtx);
  if (layout.height > 32000) throw new Error('La receta es demasiado extensa para exportarla como una sola imagen.');
  const canvas = document.createElement('canvas');
  canvas.width = EXPORT_WIDTH;
  canvas.height = Math.ceil(layout.height);
  const ctx = canvas.getContext('2d',{alpha:false});
  if (!ctx) throw new Error('Este navegador no permite generar la exportación.');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  const bg = ctx.createLinearGradient(0,0,0,canvas.height);
  bg.addColorStop(0,'#fbf8f1');
  bg.addColorStop(1,'#eee7dc');
  ctx.fillStyle = bg;
  ctx.fillRect(0,0,canvas.width,canvas.height);

  const safeBreaks = [0];
  let y = EXPORT_PADDING;
  y = drawHeader(ctx,recipe,y);
  safeBreaks.push(y);
  y = drawHero(ctx,recipe,images,brandImage,y + 24,layout.heroH,safeBreaks) + 24;
  y = drawIngredients(ctx,recipe,y,layout.ingredientH,safeBreaks) + 24;
  y = drawAlchemy(ctx,recipe,y,layout.alchemyH,safeBreaks) + 24;
  y = drawChipPanel(ctx,'Técnicas',recipe?.tecnicas,y,layout.techniquesH,safeBreaks) + 24;
  y = drawTextPanel(ctx,'Decoración / Garnish',recipe?.decoracion,y,layout.garnishH,safeBreaks) + 24;
  y = drawChipPanel(ctx,'Etiquetas',recipe?.etiquetas,y,layout.tagsH,safeBreaks) + 24;
  y = drawTextPanel(ctx,'Notas',recipe?.notas,y,layout.notesH,safeBreaks) + 24;

  ctx.strokeStyle = COLORS.burgundy;
  ctx.lineWidth = 2;
  ctx.beginPath();ctx.moveTo(EXPORT_PADDING,y + 8);ctx.lineTo(EXPORT_WIDTH - EXPORT_PADDING,y + 8);ctx.stroke();
  ctx.font = sans(14,600);ctx.fillStyle = COLORS.muted;ctx.textBaseline='top';
  ctx.fillText('Barra de El Ágora del Sir · Ficha de receta',EXPORT_PADDING,y + 28);
  ctx.textAlign='right';ctx.fillText('Buenas bebidas · Mejores conversaciones · Siempre aprendiendo',EXPORT_WIDTH - EXPORT_PADDING,y + 28);ctx.textAlign='left';
  safeBreaks.push(Math.min(canvas.height,y + layout.footerH));
  return {
    canvas,
    photoStatus,
    safeBreaks:[...new Set(safeBreaks.map(value=>Math.max(0,Math.min(canvas.height,Math.round(value)))) )].sort((a,b)=>a-b)
  };
}

function canvasToBlob(canvas,type,quality){
  return new Promise((resolve,reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('No fue posible crear el archivo exportado.')),type,quality);
  });
}

function downloadBlob(blob,filename){
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),30000);
}

export function safeRecipeFilename(name){
  const clean = cleanText(name,'Receta')
    .replace(/[\\/:*?"<>|\u0000-\u001F]/g,' ')
    .replace(/\s+/g,' ')
    .replace(/[. ]+$/g,'')
    .trim();
  return (clean || 'Receta').slice(0,90);
}

function bytesFromDataUrl(dataUrl){
  const comma = dataUrl.indexOf(',');
  if (comma < 0) throw new Error('No fue posible codificar el PDF.');
  const binary = atob(dataUrl.slice(comma + 1));
  const bytes = new Uint8Array(binary.length);
  for (let i=0;i<binary.length;i+=1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function asciiBytes(text){
  return new TextEncoder().encode(text);
}

function concatBytes(parts){
  const total = parts.reduce((sum,part)=>sum + part.length,0);
  const output = new Uint8Array(total);
  let offset = 0;
  parts.forEach(part => { output.set(part,offset); offset += part.length; });
  return output;
}

function buildPdfFromJpegs(pages){
  const pageCount = pages.length;
  const totalObjects = 2 + (pageCount * 3);
  const objects = new Array(totalObjects + 1);
  const pageObjectIds = [];
  for (let index=0; index<pageCount; index+=1) pageObjectIds.push(3 + index * 3);
  objects[1] = concatBytes([asciiBytes('<< /Type /Catalog /Pages 2 0 R >>')]);
  objects[2] = asciiBytes(`<< /Type /Pages /Kids [${pageObjectIds.map(id=>`${id} 0 R`).join(' ')}] /Count ${pageCount} >>`);

  pages.forEach((page,index) => {
    const pageId = 3 + index * 3;
    const imageId = pageId + 1;
    const contentId = pageId + 2;
    const imageName = `Im${index + 1}`;
    objects[pageId] = asciiBytes(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /${imageName} ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`);
    const imageHeader = asciiBytes(`<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.bytes.length} >>\nstream\n`);
    const imageFooter = asciiBytes('\nendstream');
    objects[imageId] = concatBytes([imageHeader,page.bytes,imageFooter]);
    const stream = `q\n595.28 0 0 841.89 0 0 cm\n/${imageName} Do\nQ\n`;
    objects[contentId] = asciiBytes(`<< /Length ${stream.length} >>\nstream\n${stream}endstream`);
  });

  const header = asciiBytes('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  const chunks = [header];
  const offsets = new Array(totalObjects + 1).fill(0);
  let offset = header.length;
  for (let id=1; id<=totalObjects; id+=1) {
    offsets[id] = offset;
    const prefix = asciiBytes(`${id} 0 obj\n`);
    const suffix = asciiBytes('\nendobj\n');
    chunks.push(prefix,objects[id],suffix);
    offset += prefix.length + objects[id].length + suffix.length;
  }
  const xrefOffset = offset;
  let xref = `xref\n0 ${totalObjects + 1}\n0000000000 65535 f \n`;
  for (let id=1; id<=totalObjects; id+=1) xref += `${String(offsets[id]).padStart(10,'0')} 00000 n \n`;
  xref += `trailer\n<< /Size ${totalObjects + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  chunks.push(asciiBytes(xref));
  return new Blob(chunks,{type:'application/pdf'});
}

function choosePageEnd(start,targetEnd,safeBreaks,canvasHeight,maxSourceH){
  if (targetEnd >= canvasHeight) return canvasHeight;
  const remaining = canvasHeight - start;
  const pagesNeeded = Math.max(1,Math.ceil(remaining / maxSourceH));
  const requiredBreak = canvasHeight - ((pagesNeeded - 1) * maxSourceH);
  const minimum = Math.max(start + Math.round((targetEnd - start) * .58),requiredBreak);
  const candidates = safeBreaks.filter(value => value >= minimum && value <= targetEnd);
  return candidates.length ? candidates[candidates.length - 1] : targetEnd;
}

function canvasToPdfPages(source,safeBreaks){
  const PAGE_W = 1400;
  const PAGE_H = 1980;
  const MARGIN_X = 92;
  const MARGIN_Y = 48;
  const drawW = PAGE_W - (MARGIN_X * 2);
  const scale = drawW / source.width;
  const maxSourceH = Math.floor((PAGE_H - (MARGIN_Y * 2)) / scale);
  const pages = [];
  let start = 0;
  while (start < source.height) {
    const targetEnd = Math.min(source.height,start + maxSourceH);
    const end = choosePageEnd(start,targetEnd,safeBreaks,source.height,maxSourceH);
    const segmentH = Math.max(1,end - start);
    const page = document.createElement('canvas');
    page.width = PAGE_W;
    page.height = PAGE_H;
    const ctx = page.getContext('2d',{alpha:false});
    if (!ctx) throw new Error('No fue posible preparar una página del PDF.');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0,0,PAGE_W,PAGE_H);
    const drawH = segmentH * scale;
    ctx.drawImage(source,0,start,source.width,segmentH,MARGIN_X,MARGIN_Y,drawW,drawH);
    const dataUrl = page.toDataURL('image/jpeg',.93);
    pages.push({bytes:bytesFromDataUrl(dataUrl),width:PAGE_W,height:PAGE_H});
    page.width = 1;
    page.height = 1;
    if (end <= start) break;
    start = end;
  }
  return pages;
}

function canvasToPdfBlob(source,safeBreaks){
  return buildPdfFromJpegs(canvasToPdfPages(source,safeBreaks));
}

async function buildRecipeArtifact(recipe,media,format,{brandImageUrl='./assets/escudo-agora.png'}={}){
  const type = String(format || '').toLowerCase();
  if (!['png','jpg','pdf'].includes(type)) throw new Error('Formato de exportación no válido.');
  const {canvas,safeBreaks,photoStatus} = await createRecipeCanvas(recipe,media,{brandImageUrl});
  const base = safeRecipeFilename(recipe?.nombre);
  let blob;
  if (type === 'png') blob = await canvasToBlob(canvas,'image/png');
  if (type === 'jpg') blob = await canvasToBlob(canvas,'image/jpeg',.94);
  if (type === 'pdf') blob = canvasToPdfBlob(canvas,safeBreaks);
  const result = {blob,filename:`${base}.${type}`,bytes:blob.size,type:blob.type,width:canvas.width,height:canvas.height,photoStatus};
  canvas.width = 1;
  canvas.height = 1;
  return result;
}

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n=0;n<256;n+=1) {
    let c = n;
    for (let k=0;k<8;k+=1) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes){
  let crc = 0xffffffff;
  for (let i=0;i<bytes.length;i+=1) crc = CRC32_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(value){
  const out = new Uint8Array(2);
  new DataView(out.buffer).setUint16(0,value,true);
  return out;
}

function u32(value){
  const out = new Uint8Array(4);
  new DataView(out.buffer).setUint32(0,value >>> 0,true);
  return out;
}

function dosDateTime(date = new Date()){
  const year = Math.min(2107,Math.max(1980,date.getFullYear()));
  const time = ((date.getHours() & 0x1f) << 11) | ((date.getMinutes() & 0x3f) << 5) | ((Math.floor(date.getSeconds()/2)) & 0x1f);
  const day = ((year - 1980) << 9) | (((date.getMonth()+1) & 0x0f) << 5) | (date.getDate() & 0x1f);
  return {time,day};
}

async function buildStoredZip(files){
  if (!Array.isArray(files) || !files.length) throw new Error('No hay archivos para incluir en el ZIP.');
  const encoder = new TextEncoder();
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  const stamp = dosDateTime();

  for (const file of files) {
    const nameBytes = encoder.encode(String(file.name || 'archivo'));
    const data = new Uint8Array(await file.blob.arrayBuffer());
    const crc = crc32(data);
    const localHeader = concatBytes([
      u32(0x04034b50),u16(20),u16(0x0800),u16(0),u16(stamp.time),u16(stamp.day),
      u32(crc),u32(data.length),u32(data.length),u16(nameBytes.length),u16(0),nameBytes
    ]);
    localParts.push(localHeader,data);

    const centralHeader = concatBytes([
      u32(0x02014b50),u16(20),u16(20),u16(0x0800),u16(0),u16(stamp.time),u16(stamp.day),
      u32(crc),u32(data.length),u32(data.length),u16(nameBytes.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(offset),nameBytes
    ]);
    centralParts.push(centralHeader);
    offset += localHeader.length + data.length;
  }

  const central = concatBytes(centralParts);
  const end = concatBytes([
    u32(0x06054b50),u16(0),u16(0),u16(files.length),u16(files.length),u32(central.length),u32(offset),u16(0)
  ]);
  return new Blob([...localParts,central,end],{type:'application/zip'});
}

function uniqueExportNames(recipes,extension){
  const used = new Map();
  return recipes.map(recipe => {
    const base = safeRecipeFilename(recipe?.nombre);
    const key = base.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es');
    const count = (used.get(key) || 0) + 1;
    used.set(key,count);
    return `${base}${count > 1 ? ` - ${count}` : ''}.${extension}`;
  });
}

function safeCollectionFilename(label,fallback='Recetas'){
  const clean = safeRecipeFilename(cleanText(label,fallback));
  return clean || fallback;
}

export async function exportRecipeFile(recipe,media,format,options={}){
  const result = await buildRecipeArtifact(recipe,media,format,options);
  downloadBlob(result.blob,result.filename);
  return result;
}

export async function exportRecipesFile(entries,format,{brandImageUrl='./assets/escudo-agora.png',collectionName='Recetas',onProgress=null}={}){
  const type = String(format || '').toLowerCase();
  if (!['png','jpg','pdf'].includes(type)) throw new Error('Formato de exportación no válido.');
  const safeEntries = Array.isArray(entries) ? entries.filter(entry => entry?.recipe) : [];
  if (!safeEntries.length) throw new Error('No hay recetas disponibles para exportar.');
  if (safeEntries.length === 1) {
    onProgress?.({phase:'render',current:1,total:1,recipe:safeEntries[0].recipe});
    return exportRecipeFile(safeEntries[0].recipe,safeEntries[0].media,type,{brandImageUrl});
  }

  try {
    if (type === 'pdf') {
      const pages = [];
      let photoFallbackCount = 0;
      let photoPlaceholderCount = 0;
      for (let index=0;index<safeEntries.length;index+=1) {
        const entry = safeEntries[index];
        onProgress?.({phase:'render',current:index + 1,total:safeEntries.length,recipe:entry.recipe});
        let rendered;
        try {
          rendered = await createRecipeCanvas(entry.recipe,entry.media,{brandImageUrl});
        } catch (error) {
          throw new Error(`No fue posible generar la ficha de “${cleanText(entry.recipe?.nombre,'Receta')}”. ${error?.message || ''}`.trim());
        }
        if (rendered.photoStatus === 'fallback') photoFallbackCount += 1;
        if (rendered.photoStatus === 'placeholder') photoPlaceholderCount += 1;
        const recipePages = canvasToPdfPages(rendered.canvas,rendered.safeBreaks);
        pages.push(...recipePages);
        rendered.canvas.width = 1;
        rendered.canvas.height = 1;
        await new Promise(resolve => setTimeout(resolve,0));
      }
      onProgress?.({phase:'package',current:safeEntries.length,total:safeEntries.length});
      const blob = buildPdfFromJpegs(pages);
      const filename = `${safeCollectionFilename(collectionName)}.pdf`;
      downloadBlob(blob,filename);
      return {filename,bytes:blob.size,type:blob.type,recipeCount:safeEntries.length,pageCount:pages.length,photoFallbackCount,photoPlaceholderCount};
    }

    const names = uniqueExportNames(safeEntries.map(entry => entry.recipe),type);
    const files = [];
    let photoFallbackCount = 0;
    let photoPlaceholderCount = 0;
    for (let index=0;index<safeEntries.length;index+=1) {
      const entry = safeEntries[index];
      onProgress?.({phase:'render',current:index + 1,total:safeEntries.length,recipe:entry.recipe});
      let artifact;
      try {
        artifact = await buildRecipeArtifact(entry.recipe,entry.media,type,{brandImageUrl});
      } catch (error) {
        throw new Error(`No fue posible generar la imagen de “${cleanText(entry.recipe?.nombre,'Receta')}”. ${error?.message || ''}`.trim());
      }
      if (artifact.photoStatus === 'fallback') photoFallbackCount += 1;
      if (artifact.photoStatus === 'placeholder') photoPlaceholderCount += 1;
      files.push({name:names[index],blob:artifact.blob});
      await new Promise(resolve => setTimeout(resolve,0));
    }
    onProgress?.({phase:'package',current:safeEntries.length,total:safeEntries.length});
    const zipBlob = await buildStoredZip(files);
    const filename = `${safeCollectionFilename(collectionName)} ${type.toUpperCase()}.zip`;
    downloadBlob(zipBlob,filename);
    return {filename,bytes:zipBlob.size,type:zipBlob.type,recipeCount:safeEntries.length,fileCount:files.length,photoFallbackCount,photoPlaceholderCount};
  } catch (error) {
    if (error instanceof RangeError || /memory|memoria|allocation|canvas/i.test(String(error?.message || ''))) {
      throw new Error('No hay memoria suficiente para completar esta exportación. Reduce la cantidad de recetas y vuelve a intentarlo.');
    }
    throw error;
  }
}
