import { storage } from './storage.js';
import { loadRecipes } from './recipes.js';

const recipeSelect = document.getElementById('mixerRecipeSelect');
const recipePanel = document.getElementById('mixerRecipePanel');
const emptyPanel = document.getElementById('mixerEmpty');
const recipeName = document.getElementById('mixerRecipeName');
const recipeBase = document.getElementById('mixerRecipeBase');
const recipeCategory = document.getElementById('mixerRecipeCategory');
const recipeGlassware = document.getElementById('mixerRecipeGlassware');
const ingredients = document.getElementById('mixerIngredients');
const originalYield = document.getElementById('mixerOriginalYield');
const originalYieldHelp = document.getElementById('mixerOriginalYieldHelp');
const targetYield = document.getElementById('mixerTargetYield');
const originalYieldError = document.getElementById('mixerOriginalYieldError');
const targetYieldError = document.getElementById('mixerTargetYieldError');
const resultZone = document.getElementById('mixerResultZone');

let mixerRecipes = [];
let activeRecipeId = '';

const escapeHtml = value => String(value ?? '')
  .replaceAll('&','&amp;')
  .replaceAll('<','&lt;')
  .replaceAll('>','&gt;')
  .replaceAll('"','&quot;')
  .replaceAll("'",'&#039;');

function naturalCompare(a,b){
  return String(a ?? '').localeCompare(String(b ?? ''),'es',{numeric:true,sensitivity:'base'});
}

function formatNumber(value){
  const number = Number(value);
  if (!Number.isFinite(number)) return '';
  return new Intl.NumberFormat('es-NI',{maximumFractionDigits:6,useGrouping:false}).format(number);
}

function formatInputNumber(value){
  const number = Number(value);
  if (!Number.isFinite(number)) return '';
  return String(Math.round((number + Number.EPSILON) * 1e6) / 1e6);
}

function uniqueSortedRecipes(){
  const source = loadRecipes(storage);
  const seen = new Set();
  return source
    .filter(recipe => {
      const id = String(recipe?.id || '');
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .sort((a,b)=>naturalCompare(a.nombre,b.nombre));
}

function safeMlYield(recipe){
  const rows = Array.isArray(recipe?.ingredientes) ? recipe.ingredientes : [];
  const positive = rows.filter(row => Number.isFinite(Number(row?.cantidad)) && Number(row.cantidad) > 0);
  if (!positive.length) return null;
  if (positive.some(row => String(row?.unidad || '').trim().toLocaleLowerCase('es') !== 'ml')) return null;
  const total = positive.reduce((sum,row)=>sum + Number(row.cantidad),0);
  return Number.isFinite(total) && total > 0 ? total : null;
}

function ingredientMeasure(row){
  const amount = Number(row?.cantidad);
  const unit = String(row?.unidad || '').trim();
  if (Number.isFinite(amount) && amount === 0 && !unit) return 'Al gusto';
  if (!Number.isFinite(amount)) return '—';
  return `${formatNumber(amount)}${unit ? ` ${escapeHtml(unit)}` : ''}`;
}

function clearValidation(input,error){
  if (!input) return;
  input.setCustomValidity('');
  input.removeAttribute('aria-invalid');
  if (error) error.hidden = true;
}

function validatePositive(input,error){
  if (!input) return true;
  const raw = input.value.trim();
  if (!raw) {
    clearValidation(input,error);
    return true;
  }
  const value = Number(raw);
  const valid = Number.isFinite(value) && value > 0;
  input.setCustomValidity(valid ? '' : 'Escribe un valor mayor que 0.');
  input.toggleAttribute('aria-invalid',!valid);
  if (error) error.hidden = valid;
  return valid;
}

function resetTemporaryValues(){
  if (originalYield) originalYield.value = '';
  if (targetYield) targetYield.value = '';
  clearValidation(originalYield,originalYieldError);
  clearValidation(targetYield,targetYieldError);
  if (originalYieldHelp) originalYieldHelp.textContent = 'Selecciona una receta para definir su rendimiento base.';
  if (resultZone) resultZone.classList.remove('has-inputs');
}

function renderIngredients(recipe){
  if (!ingredients) return;
  const rows = Array.isArray(recipe?.ingredientes) ? recipe.ingredientes : [];
  ingredients.innerHTML = rows.length
    ? rows.map(row => `
      <div class="mixer-ingredient-row">
        <span>${escapeHtml(row.ingrediente || 'Ingrediente')}</span>
        <strong>${ingredientMeasure(row)}</strong>
      </div>`).join('')
    : '<div class="mixer-ingredient-empty">Esta receta no tiene ingredientes disponibles.</div>';
}

function showRecipe(recipe){
  resetTemporaryValues();
  if (!recipe) {
    activeRecipeId = '';
    if (recipePanel) recipePanel.hidden = true;
    if (emptyPanel) emptyPanel.hidden = false;
    return;
  }

  activeRecipeId = recipe.id;
  if (emptyPanel) emptyPanel.hidden = true;
  if (recipePanel) recipePanel.hidden = false;
  if (recipeName) recipeName.textContent = recipe.nombre || 'Receta';
  if (recipeBase) recipeBase.textContent = recipe.basePrincipal || '—';
  if (recipeCategory) recipeCategory.textContent = recipe.categoria || '—';
  if (recipeGlassware) recipeGlassware.textContent = recipe.cristaleria || '—';
  renderIngredients(recipe);

  const suggested = safeMlYield(recipe);
  if (suggested !== null && originalYield) {
    originalYield.value = formatInputNumber(suggested);
    if (originalYieldHelp) originalYieldHelp.textContent = `Sugerido con seguridad: suma de ingredientes positivos expresados únicamente en ml (${formatNumber(suggested)} ml).`;
  } else if (originalYieldHelp) {
    originalYieldHelp.textContent = 'Escribe el rendimiento original manualmente. Mixer no convierte ni mezcla unidades.';
  }
}

function populateSelector(){
  if (!recipeSelect) return;
  const previous = activeRecipeId;
  mixerRecipes = uniqueSortedRecipes();
  recipeSelect.innerHTML = '<option value="">Selecciona una receta…</option>' + mixerRecipes
    .map(recipe => `<option value="${escapeHtml(recipe.id)}">${escapeHtml(recipe.nombre)}</option>`)
    .join('');

  if (previous && mixerRecipes.some(recipe => recipe.id === previous)) {
    recipeSelect.value = previous;
    showRecipe(mixerRecipes.find(recipe => recipe.id === previous));
  } else {
    recipeSelect.value = '';
    showRecipe(null);
  }
}

export function renderMixer(){
  populateSelector();
}

recipeSelect?.addEventListener('change',()=>{
  const recipe = mixerRecipes.find(item => item.id === recipeSelect.value) || null;
  showRecipe(recipe);
});

originalYield?.addEventListener('input',()=>{
  validatePositive(originalYield,originalYieldError);
  resultZone?.classList.toggle('has-inputs',Boolean(originalYield.value || targetYield?.value));
});

targetYield?.addEventListener('input',()=>{
  validatePositive(targetYield,targetYieldError);
  resultZone?.classList.toggle('has-inputs',Boolean(originalYield?.value || targetYield.value));
});

originalYield?.addEventListener('blur',()=>validatePositive(originalYield,originalYieldError));
targetYield?.addEventListener('blur',()=>validatePositive(targetYield,targetYieldError));
