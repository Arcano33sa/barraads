// Run with Playwright and Chrome. Uses an isolated browser and temporary HTTP origin.
let playwright;
try {playwright=require(process.env.PLAYWRIGHT_MODULE || 'playwright');}
catch {playwright=require(require('node:path').join(require('node:os').homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));}
const {chromium}=playwright;
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const qa=path.join(require('node:os').tmpdir(),'barra-pdf-e3');
const baseline=process.env.BARRA_BASE_REF || '19d9e02a9cef1c31b466674a23de5a055fdf735b';
const version=JSON.parse(fs.readFileSync(path.join(root,'app-version.json'))).version;
let serveCurrent=false;
const oldFiles=new Map();
const mime={'.js':'text/javascript','.html':'text/html','.css':'text/css','.png':'image/png','.json':'application/json','.webmanifest':'application/manifest+json'};
const server=http.createServer((req,res)=>{
  const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,'') || 'index.html';
  if(name.includes('..')) {res.writeHead(403);res.end();return;}
  try {
    let data;
    if(serveCurrent) data=fs.readFileSync(path.join(root,name));
    else {
      if(!oldFiles.has(name)) oldFiles.set(name,execFileSync('git',['show',`${baseline}:${name}`],{cwd:root,stdio:['ignore','pipe','ignore']}));
      data=oldFiles.get(name);
    }
    res.writeHead(200,{'Content-Type':mime[path.extname(name)] || 'application/octet-stream','Cache-Control':'no-store'});res.end(data);
  } catch {res.writeHead(404);res.end();}
});

async function seed(page){
  return page.evaluate(async()=>{
    const media=await import('/js/media.js');
    const {storage}=await import('/js/storage.js');
    const {saveRecipes}=await import('/js/recipes.js');
    const photoCanvas=document.createElement('canvas');photoCanvas.width=600;photoCanvas.height=800;
    const c=photoCanvas.getContext('2d');
    const gradient=c.createLinearGradient(0,0,600,800);gradient.addColorStop(0,'#077bb8');gradient.addColorStop(1,'#521a54');
    c.fillStyle=gradient;c.fillRect(0,0,600,800);c.fillStyle='#e7c076';c.fillRect(200,240,200,340);
    c.font='bold 38px sans-serif';c.fillStyle='#fff';c.fillText('FOTO DE PRUEBA',110,680);
    const blob=await new Promise(resolve=>photoCanvas.toBlob(resolve,'image/png'));
    const processed=await media.optimizeRecipePhoto(new File([blob],'prueba.png',{type:'image/png'}));
    const base={alquimista:'Validación E3',estado:'Aprobada',basePrincipal:'Ron',basesSecundarias:['Licor de naranja'],categoria:'Cóctel',cristaleria:'Vaso alto',
      ingredientes:['Ron','Jugo de limón','Sirope','Agua tónica','Menta'].map((ingrediente,i)=>({ingrediente,cantidad:i===4 ? 0 : 1,unidad:i===4 ? '' : 'oz'})),
      alquimia:['Preparar los ingredientes.','Mezclar con hielo.','Servir y decorar.'].map((texto,i)=>({orden:i+1,texto})),
      tecnicas:['Agitar'],decoracion:'Rama de menta',etiquetas:['Refrescante'],notas:'Todos los datos son ficticios.'};
    const recipes=[
      {...base,id:'e3-a',nombre:'A · Corta sin foto',ingredientes:base.ingredientes.slice(0,2),alquimia:base.alquimia.slice(0,1)},
      {...base,id:'e3-b',nombre:'B · Con fotografía'},
      {...base,id:'e3-c',nombre:'C · Notas largas',notas:Array.from({length:13},(_,i)=>`Nota ${i+1}: conservar toda esta información hasta el final.`).join('\n')},
      {...base,id:'e3-d',nombre:'D · Muchas etiquetas',etiquetas:Array.from({length:35},(_,i)=>`Etiqueta de prueba ${i+1}`)},
      {...base,id:'e3-e',nombre:'E · Muchos pasos de ALQUIMIA',alquimia:Array.from({length:19},(_,i)=>({orden:i+1,texto:`Paso ${i+1}: preparar cuidadosamente, mezclar y comprobar el resultado.`}))},
      {...base,id:'e3-f',nombre:'F · Ingredientes y campos largos para verificar los saltos de línea y la altura real de cada bloque',
        ingredientes:[{ingrediente:'Infusión de hierbas aromáticas y especias preparada lentamente, enfriada y filtrada antes de mezclar con el resto de ingredientes de esta receta de validación',cantidad:30,unidad:'mililitros de infusión'},{ingrediente:'Menta',cantidad:0,unidad:''}],
        basesSecundarias:['Licor de naranja, hierbas aromáticas y especias con una descripción extensa para verificar el ajuste'],notas:'ÁÉÍÓÚ ñ · ¡Todos los caracteres! '+ 'PalabraLargaSinEspacios'.repeat(8)},
      {...base,id:'e3-g',nombre:'G · Al gusto y cero histórico',ingredientes:[{ingrediente:'Menta',cantidad:0,unidad:''},{ingrediente:'Dato histórico',cantidad:0,unidad:'ml'},{ingrediente:'Cantidad ausente',cantidad:null,unidad:''}]}
    ];
    const entry=media.photoEntryFromProcessed('e3-b',processed,{photoId:'e3-photo'});
    await media.saveRecipePhotoCollection('e3-b',[entry]);
    recipes[1].fotos=media.buildPhotoReferences('e3-b',[entry]); recipes[1].foto=recipes[1].fotos[0];
    saveRecipes(storage,recipes);
    return recipes.length;
  });
}
async function state(page){
  return page.evaluate(async()=>{
    const records=await (await import('/js/media.js')).listRecipePhotos();
    const hashes=[];
    for(const record of records) for(const photo of record.photos){
      const hash=async blob=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))).map(x=>x.toString(16).padStart(2,'0')).join('');
      hashes.push({recipeId:record.recipeId,photoId:photo.photoId,full:await hash(photo.fullBlob),thumb:await hash(photo.thumbnailBlob),metadata:photo.metadata});
    }
    return {recipes:localStorage.getItem('agoraSir.recipes.v1'),photos:hashes};
  });
}
function pdfCheck(file,count){
  const raw=fs.readFileSync(file).toString('latin1');
  assert.equal((raw.match(/\/Type \/Page\b/g)||[]).length,count,file);
  assert.equal((raw.match(/MediaBox \[0 0 595.28 841.89\]/g)||[]).length,count,file);
}
async function downloadPdf(page,label,count){
  const ready=page.waitForEvent('download');
  await page.locator('[data-export-format="pdf"]').click();
  const download=await ready;
  const filename=path.join(qa,`${label}.pdf`);await download.saveAs(filename);
  await page.locator('#recipeExportStatus.is-success').waitFor();
  pdfCheck(filename,count);
  await page.locator('#recipeExportCancelBtn').click();
  return filename;
}
async function goRecipes(page){
  const menu=page.locator('#mobileMenu');
  if(await menu.isVisible() && await menu.getAttribute('aria-expanded')==='false') await menu.click();
  await page.locator('.nav-item[data-view="recetas"]').click();
}
async function allPdf(page,label,count){
  await goRecipes(page);
  await page.locator('#recipeLibraryExportBtn').click();
  await page.locator('[data-export-scope="all"]').click();
  return downloadPdf(page,label,count);
}
async function singlePdf(page,label){
  await goRecipes(page);
  await page.locator('#recipeLibraryGroups .stage7-recipe-main[data-open-saved-recipe="e3-b"]').click();
  await page.locator('[data-export-recipe="e3-b"]').click();
  await page.locator('[data-export-scope="this"]').click();
  return downloadPdf(page,label,1);
}
async function rasterHashes(page){
  return page.evaluate(async()=>{
    const {storage}=await import('/js/storage.js');
    const media=await import('/js/media.js');
    const {exportRecipeFile}=await import('/js/export.js');
    const click=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){};
    try {
      const hashes={};
      for(const id of ['e3-a','e3-b']) for(const type of ['png','jpg']) {
        const recipe=storage.get('recipes.v1').find(r=>r.id===id);
        const artifact=await exportRecipeFile(recipe,await media.getRecipePhoto(id),type);
        hashes[`${id}-${type}`]=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await artifact.blob.arrayBuffer()))).join(',');
      }
      return hashes;
    } finally {HTMLAnchorElement.prototype.click=click;}
  });
}
(async()=>{
  fs.mkdirSync(qa,{recursive:true});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const url=`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch({executablePath:process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
  const report={version,baseline,checks:[],pageErrors:[],consoleErrors:[]};
  const observe=page=>{
    page.on('pageerror',e=>report.pageErrors.push(e.message));
    page.on('console',m=>{if(m.type()==='error') report.consoleErrors.push(m.text());});
  };
  try {
    const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
    const page=await context.newPage();observe(page);
    await page.goto(url);
    await page.evaluate(()=>navigator.serviceWorker.ready);
    await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
    await seed(page);await page.reload();
    const before=await state(page), rasterBefore=await rasterHashes(page);
    await page.locator('.nav-item[data-view="configuracion"]').click();
    assert.equal(await page.locator('#pwaCurrentVersion').innerText(),'v1.21.1');
    serveCurrent=true;
    await page.locator('#pwaCheckUpdate').click();
    await page.waitForFunction(()=>document.getElementById('pwaApplyUpdate')?.hidden===false,{},{timeout:20000});
    assert.match(await page.locator('#pwaUpdateTitle').innerText(),new RegExp(version.replaceAll('.','\\.')));
    await Promise.all([page.waitForEvent('load'),page.locator('#pwaApplyUpdate').click()]);
    await page.waitForFunction(v=>document.getElementById('pwaCurrentVersion')?.textContent===`v${v}`,version);
    assert.deepEqual(await state(page),before);
    assert.deepEqual(await rasterHashes(page),rasterBefore);
    const cachesAfter=await page.evaluate(()=>caches.keys());
    assert.deepEqual(cachesAfter,[`agora-sir-${version}`]);
    await page.locator('.nav-item[data-view="configuracion"]').click();
    await page.locator('#pwaCheckUpdate').click();
    await page.locator('#pwaActionStatus.is-success').waitFor();
    assert.match(await page.locator('#pwaActionStatus').innerText(),/actualizada/);
    assert.equal(await page.locator('#pwaApplyUpdate').isVisible(),false);
    report.checks.push('Actualización real 1.21.1 → '+version+' por botones; recetas y bytes de fotos conservados','Caché anterior retirada; segunda búsqueda indica actualizada','PNG/JPG con y sin foto idénticos byte a byte a 1.21.1');
    await singlePdf(page,'pc-individual');
    const all=await allPdf(page,'pc-todas',7);
    await page.locator('#recipeLibraryExportBtn').click();
    await page.locator('[data-export-scope="selected"]').click();
    for(const id of ['e3-b','e3-d','e3-e']) await page.locator(`[data-select-recipe="${id}"]`).check();
    await page.locator('#recipeSelectionExportBtn').click();
    await downloadPdf(page,'pc-seleccionadas',3);
    report.checks.push('PC: individual 1 página, seleccionadas 3 páginas, todas 7 páginas');
    // Record all text drawn by the renderer, including real glyph bounds.
    const content=await page.evaluate(async()=>{
      const {storage}=await import('/js/storage.js');
      const {exportRecipeFile}=await import('/js/export.js');
      const media=await import('/js/media.js');
      const fill=CanvasRenderingContext2D.prototype.fillText, click=HTMLAnchorElement.prototype.click;
      const records=[];let active=[];
      CanvasRenderingContext2D.prototype.fillText=function(value,x,y,...args){
        const m=this.getTransform(), b=this.measureText(value);
        if(this.canvas.width===1400) active.push({value:String(value),left:m.a*(x-b.actualBoundingBoxLeft)+m.e,right:m.a*(x+b.actualBoundingBoxRight)+m.e,top:m.d*(y-b.actualBoundingBoxAscent)+m.f,bottom:m.d*(y+b.actualBoundingBoxDescent)+m.f});
        return fill.call(this,value,x,y,...args);
      };
      HTMLAnchorElement.prototype.click=function(){};
      try {
        for(const recipe of storage.get('recipes.v1')) {
          active=[];
          const artifact=await exportRecipeFile(recipe,await media.getRecipePhoto(recipe.id),'pdf');
          const out=active.filter(b=>b.left<0 || b.top<0 || b.right>1400 || b.bottom>1980);
          const overlaps=[];
          for(let i=0;i<active.length;i++) for(let j=i+1;j<active.length;j++) {
            const a=active[i],b=active[j];
            if(a.value.trim() && b.value.trim() && Math.min(a.right,b.right)-Math.max(a.left,b.left)>1 && Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1) overlaps.push([a.value,b.value]);
          }
          records.push({id:recipe.id,layout:artifact.pdfLayout,photo:artifact.photoStatus,out,overlaps,text:active.map(a=>a.value).join(' ')});
        }
        const sample=storage.get('recipes.v1')[0];
        const photo=await media.getRecipePhoto('e3-b');
        const bad=new Blob(['corrupt'],{type:'image/jpeg'});
        const fallback=await exportRecipeFile(sample,{photos:[{fullBlob:bad},...photo.photos]},'pdf');
        const placeholder=await exportRecipeFile(sample,{fullBlob:bad},'pdf');
        return {records,fallback:fallback.photoStatus,placeholder:placeholder.photoStatus};
      } finally {CanvasRenderingContext2D.prototype.fillText=fill;HTMLAnchorElement.prototype.click=click;}
    });
    for(const item of content.records){assert.deepEqual(item.out,[],item.id);assert.deepEqual(item.overlaps,[],item.id);}
    assert.equal(content.records.find(r=>r.id==='e3-b').photo,'primary');
    assert.match(content.records.find(r=>r.id==='e3-c').text,/Nota 13:/);
    assert.match(content.records.find(r=>r.id==='e3-d').text,/Etiqueta de prueba 35/);
    assert.match(content.records.find(r=>r.id==='e3-e').text,/Paso 19:/);
    const legacy=content.records.find(r=>r.id==='e3-g').text;
    assert.match(legacy,/Al gusto/);assert.match(legacy,/0 ml/);
    assert.equal(content.fallback,'fallback');assert.equal(content.placeholder,'placeholder');
    report.layouts=content.records.map(({id,layout,photo})=>({id,layout,photo}));
    report.checks.push('Campos largos, 13 notas, 35 etiquetas, 19 pasos, Al gusto y cero histórico: sin texto cortado ni solapado','Foto válida, siguiente foto válida y placeholder verificados');
    await context.setOffline(true);await page.reload();
    await singlePdf(page,'pc-offline-individual');await allPdf(page,'pc-offline-todas',7);
    assert.deepEqual(await state(page),before);
    report.checks.push('PC offline tras recarga: app, imagen guardada y PDFs individual/todas; datos conservados');
    await context.close();
    for(const [name,viewport] of [['ipad-vertical',{width:820,height:1180}],['ipad-horizontal',{width:1180,height:820}]]) {
      const tablet=await browser.newContext({viewport,deviceScaleFactor:2,isMobile:true,hasTouch:true,acceptDownloads:true,
        userAgent:'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'});
      // Exercise the app's standalone branch; this does not install an OS PWA.
      await tablet.addInitScript(()=>Object.defineProperty(navigator,'standalone',{get:()=>true}));
      const tab=await tablet.newPage();observe(tab);
      await tab.goto(url);await tab.evaluate(()=>navigator.serviceWorker.ready);await seed(tab);await tab.reload();
      assert.equal(await tab.locator('#pwaInstallStatus').textContent(),'Instalada');
      await singlePdf(tab,`${name}-individual`);await allPdf(tab,`${name}-todas`,7);
      await tablet.setOffline(true);await tab.reload();await allPdf(tab,`${name}-offline`,7);
      report.checks.push(`${name}: Chromium con viewport/táctil/UA de iPad y bandera standalone simulada; individual/todas/offline aprobados`);
      await tablet.close();
    }
    assert.deepEqual(report.pageErrors,[]);
    assert.deepEqual(report.consoleErrors,[]);
    fs.mkdirSync(path.join(root,'output/pdf'),{recursive:true});
    fs.copyFileSync(all,path.join(root,'output/pdf/e3-validacion-completa.pdf'));
    report.limitations=['No se dispone de iPad físico ni Safari/WebKit','Standalone se simula mediante navigator.standalone; no se valida instalación, ventana nativa ni descarga en iPad real','Prueba local; no se publicó ni se actualizó una instalación del usuario'];
    fs.writeFileSync(path.join(qa,'report.json'),JSON.stringify(report,null,2));
    console.log(JSON.stringify(report,null,2));
  } finally {await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
