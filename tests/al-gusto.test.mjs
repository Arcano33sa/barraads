import test from 'node:test';
import assert from 'node:assert/strict';
import { cloneSeedCatalogs, addCatalogItem, editCatalogItem } from '../js/catalog.js';
import { sanitizeRecipeDraft, validateRecipe, saveRecipes, loadRecipes } from '../js/recipes.js';

const draftWith = (cantidad,unidad) => ({
  id:'regression', nombre:'Prueba', basePrincipal:'Ron', categoria:'Cóctel',
  cristaleria:'Coupé', ingredientes:[{ingrediente:'Menta',cantidad,unidad}],
  alquimia:['Mezclar']
});

test('cantidad ausente, cero y cantidades medidas siguen contratos distintos', () => {
  for (const [amount,unit,valid] of [
    ['', '', false], [null, '', false], [0, '', true], ['0', '', true],
    [0, 'ml', false], [10, '', false], [10, 'ml', true], [-1, 'ml', false],
    [10, 'Al Gusto', false], [10, ' AL   GÚSTO ', false], [0, 'Al Gusto', false]
  ]) {
    const recipe = sanitizeRecipeDraft(draftWith(amount,unit));
    assert.equal(validateRecipe(recipe).length === 0,valid,JSON.stringify([amount,unit]));
  }
});

test('alta y edición del catálogo reservan Al Gusto sin modificar datos', () => {
  const catalogs = cloneSeedCatalogs();
  const before = structuredClone(catalogs);
  for (const label of ['Al Gusto',' al   gusto ','AL GÚSTO']) {
    assert.equal(addCatalogItem(catalogs,'unidades',label).reason,'reserved');
    assert.equal(editCatalogItem(catalogs,'unidades','ml',label).reason,'reserved');
  }
  assert.deepEqual(catalogs,before);
  assert.equal(addCatalogItem(catalogs,'unidades','litro').ok,true);
  assert.equal(editCatalogItem(catalogs,'unidades','litro','litros').ok,true);
  assert.equal(addCatalogItem(catalogs,'ingredientes','Al Gusto').ok,true);
});

test('persistencia conserva cero, ausencias y unidades históricas sin migraciones', () => {
  const values = new Map();
  const storage = {
    get:(key,fallback)=>values.has(key) ? JSON.parse(values.get(key)) : fallback,
    set:(key,value)=>values.set(key,JSON.stringify(value))
  };
  for (const [amount,unit] of [[0,''],[0,'ml'],[0,'medida antigua'],[null,''],[5,'Al Gusto']]) {
    const original = sanitizeRecipeDraft(draftWith(amount,unit));
    saveRecipes(storage,[original]);
    assert.deepEqual(loadRecipes(storage)[0].ingredientes,original.ingredientes);
  }
});
