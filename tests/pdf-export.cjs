const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs=require('fs');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 const page=await browser.newPage();
 await page.goto('http://127.0.0.1:8765');
 const result=await page.evaluate(async()=>{
  const {exportRecipeFile}=await import('/js/export.js');
  const recipe={nombre:'Azul Curacao · Prueba de plantilla',alquimista:'JGC',estado:'Aprobada',basePrincipal:'Tequila',basesSecundarias:['Azul Curacao'],categoria:'Cóctel',cristaleria:'Vaso Alto',
   ingredientes:['Tequila blanco','Azul Curacao','Jugo de Piña','Jugo de limón','Sirope','Agua Tónica'].map((ingrediente,i)=>({ingrediente,cantidad:i===5 ? 0 : 1,unidad:i===5 ? '' : 'oz'})),
   alquimia:['En una coctelera con hielo, añade el tequila, azul curacao, jugo de piña, jugo de limón y el sirope.','Agita bien durante 10 a 15 segundos.','Cuela sobre vaso alto con hielo nuevo.','Completa con agua con gas fría al gusto.','Decora con una hoja de menta o twist de limón.'].map((texto,i)=>({texto,orden:i+1})),tecnicas:['Agitar','Construir en vaso'],decoracion:'Rama de menta',etiquetas:['Refrescante','Tropical'],notas:'Receta ficticia de validación: comprobar que toda la ficha queda completa en una sola hoja.'};
  const result=await exportRecipeFile(recipe,null,'pdf');
  let overflow=''; try {await exportRecipeFile({...recipe,notas:'Nota extensa. '.repeat(2000)},null,'pdf');} catch(e){overflow=e.message;}
  return {bytes:Array.from(new Uint8Array(await result.blob.arrayBuffer())),overflow,width:result.width,height:result.height};
 });
 const pdf=Buffer.from(result.bytes);
 assert.equal((pdf.toString('latin1').match(/\/Type \/Page\b/g)||[]).length,1);
 assert.match(pdf.toString('latin1'),/MediaBox \[0 0 595.28 841.89\]/);
 assert.match(result.overflow,/supera una página A4/);
 fs.mkdirSync('output/pdf',{recursive:true});
 fs.writeFileSync('output/pdf/prueba-a4-etapa-1.pdf',pdf);
 console.log(JSON.stringify({...result,bytes:result.bytes.length})); await browser.close();
})();
