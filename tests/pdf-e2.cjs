const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const path=require('node:path');
const qaDir=path.join(require('node:os').tmpdir(),'barra-pdf-e2');

(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
  try {
    const page=await browser.newPage();
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(process.env.BARRA_URL || 'http://127.0.0.1:8765');
    const results=await page.evaluate(async()=>{
      const {exportRecipeFile,exportRecipesFile}=await import('/js/export.js');
      const downloads=[], urls=new Map();
      const create=URL.createObjectURL.bind(URL), revoke=URL.revokeObjectURL.bind(URL);
      URL.createObjectURL=blob=>{const url=create(blob); urls.set(url,blob); return url;};
      URL.revokeObjectURL=url=>{urls.delete(url); revoke(url);};
      HTMLAnchorElement.prototype.click=function(){downloads.push(urls.get(this.href));};
      const drawn=[];
      const fill=CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText=function(value,x,y,...rest){
        if (this.canvas.width===1400) {
          const m=this.getTransform(), size=Number(this.font.match(/([\d.]+)px/)[1]);
          drawn.push({value:String(value),x:m.a*x+m.e,y:m.d*y+m.f,
            right:m.a*(x+this.measureText(value).width)+m.e,
            bottom:m.d*(y+size)+m.f});
        }
        return fill.call(this,value,x,y,...rest);
      };
      const recipe={nombre:'E2 · Receta normal',alquimista:'Prueba ficticia',estado:'Aprobada',basePrincipal:'Tequila',basesSecundarias:['Azul Curacao'],categoria:'Cóctel',cristaleria:'Vaso alto',
        ingredientes:['Tequila blanco','Azul Curacao','Jugo de piña','Jugo de limón','Sirope','Agua tónica'].map((ingrediente,i)=>({ingrediente,cantidad:i===5 ? 0 : 1,unidad:i===5 ? '' : 'oz'})),
        alquimia:['Añade los ingredientes a la coctelera con hielo.','Agita durante 10 a 15 segundos.','Cuela sobre hielo nuevo.','Completa con agua tónica al gusto.','Decora y sirve.'].map((texto,i)=>({texto,orden:i+1})),
        tecnicas:['Agitar','Construir en vaso'],decoracion:'Rama de menta',etiquetas:['Refrescante','Tropical'],notas:'Verificación de una ficha completa.'};
      const cases={};
      let oversized;
      // Exercise each transition with progressively longer, preserved notes.
      for(let n=1;n<=45;n++) {
        const candidate={...recipe,notas:Array.from({length:n},(_,i)=>`Línea ${i+1}: conservar esta nota completa al exportar.`).join('\n')};
        drawn.length=0;
        try {
          const artifact=await exportRecipeFile(candidate,null,'pdf');
          const key=artifact.pdfLayout.scale<1 ? 'scaled' : artifact.pdfLayout.profile;
          const body=drawn.filter(t=>t.value.startsWith('Línea '));
          if(body.length!==n) throw new Error('Se perdió texto de las notas.');
          if(drawn.some(t=>t.x<0 || t.y<0 || t.right>1400.01 || t.bottom>1980.01)) throw new Error('Texto fuera de la página.');
          if(!drawn.some(t=>t.value==='Al gusto')) throw new Error('Falta Al gusto.');
          if(!cases[key] || key==='scaled') cases[key]={recipe:candidate,layout:artifact.pdfLayout,bytes:Array.from(new Uint8Array(await artifact.blob.arrayBuffer()))};
        } catch(error) {
          if(!/supera una página A4/.test(error.message)) throw error;
          oversized=candidate; break;
        }
      }
      if(!oversized) throw new Error('No se alcanzó el límite.');
      const collections=[];
      for(const count of [3,10]) {
        const entries=Array.from({length:count},(_,i)=>({recipe:{...cases[['normal','compact','dense','scaled'][i%4]].recipe,nombre:`Ficha ${i+1} de ${count}`},media:null}));
        const unchanged=JSON.stringify(entries);
        drawn.length=0;
        const before=downloads.length;
        const artifact=await exportRecipesFile(entries,'pdf',{collectionName:`E2 ${count} recetas`});
        if(downloads.length!==before+1) throw new Error('Debe descargarse un único PDF.');
        if(JSON.stringify(entries)!==unchanged) throw new Error('Se modificaron recetas.');
        const titles=drawn.filter(t=>/^Ficha \d+ de/.test(t.value)).map(t=>t.value);
        if(titles.join('|')!==entries.map(e=>e.recipe.nombre).join('|')) throw new Error('Orden de fichas incorrecto.');
        collections.push({count,result:artifact,bytes:Array.from(new Uint8Array(await downloads.at(-1).arrayBuffer()))});
      }
      const before=downloads.length;
      let failure='';
      try {await exportRecipesFile([{recipe},{recipe:oversized},{recipe}],'pdf');} catch(error){failure=error.message;}
      if(downloads.length!==before) throw new Error('Se descargó una colección parcial.');
      return {cases,collections,failure};
    });
    assert.deepEqual(errors,[]);
    assert.deepEqual(Object.keys(results.cases),['normal','compact','dense','scaled']);
    const checkPdf=(bytes,count)=>{
      const pdf=Buffer.from(bytes), raw=pdf.toString('latin1');
      assert.equal((raw.match(/\/Type \/Page\b/g)||[]).length,count);
      assert.equal((raw.match(/MediaBox \[0 0 595.28 841.89\]/g)||[]).length,count);
      return pdf;
    };
    fs.mkdirSync('output/pdf',{recursive:true});
    fs.mkdirSync(qaDir,{recursive:true});
    for(const [key,item] of Object.entries(results.cases)) {
      assert.ok(item.layout.scale>=.9 && item.layout.scale<=1);
      if(key!=='scaled') assert.equal(item.layout.scale,1);
      else assert.ok(item.layout.scale<1);
      fs.writeFileSync(path.join(qaDir,`e2-${key}.pdf`),checkPdf(item.bytes,1));
    }
    for(const item of results.collections) {
      assert.equal(item.result.pageCount,item.count);
      assert.equal(item.result.recipeCount,item.count);
      fs.writeFileSync(item.count===10 ? 'output/pdf/e2-10-recetas.pdf' : path.join(qaDir,`e2-${item.count}-recetas.pdf`),checkPdf(item.bytes,item.count));
    }
    assert.match(results.failure,/supera una página A4/);
    console.log(JSON.stringify({layouts:Object.fromEntries(Object.entries(results.cases).map(([key,item])=>[key,item.layout])),collections:results.collections.map(item=>({recipes:item.count,pages:item.result.pageCount})),overflow:results.failure,consoleErrors:errors},null,2));
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
