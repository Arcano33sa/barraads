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

function formatNumber(value,{maximumFractionDigits=2}={}){
  const number = Number(value);
  if (!Number.isFinite(number)) return '';
  const normalized = Object.is(number,-0) ? 0 : number;
  return new Intl.NumberFormat('es-NI',{
    maximumFractionDigits,
    minimumFractionDigits:0,
    useGrouping:false
  }).format(normalized);
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

function ingredientState(row){
  const rawAmount = row?.cantidad;
  const unit = String(row?.unidad ?? '').trim();
  const hasAmount = rawAmount !== null
    && rawAmount !== undefined
    && !(typeof rawAmount === 'string' && rawAmount.trim() === '');

  if (!hasAmount) return { kind:'missing', unit:'' };

  const amount = Number(rawAmount);
  if (!Number.isFinite(amount)) return { kind:'missing', unit:'' };
  if (amount === 0 && !unit) return { kind:'taste', unit:'' };
  return { kind:'number', amount, unit };
}

function measureText(row,{factor=1,scaled=false}={}){
  const state = ingredientState(row);
  if (state.kind === 'taste') return 'Al gusto';
  if (state.kind === 'missing') return 'Sin cantidad';
  const amount = scaled ? state.amount * factor : state.amount;
  const formatted = formatNumber(amount);
  return `${formatted}${state.unit ? ` ${state.unit}` : ''}`;
}

function clearValidation(input,error){
  if (!input) return;
  input.setCustomValidity('');
  input.removeAttribute('aria-invalid');
  if (error) {
    error.hidden = true;
    error.textContent = '';
  }
}

function positiveInputState(input){
  const raw = input?.value?.trim?.() ?? '';
  if (!raw) return { valid:false, empty:true, value:null, message:'Completa este valor.' };
  const value = Number(raw);
  if (!Number.isFinite(value)) return { valid:false, empty:false, value:null, message:'Escribe un número válido.' };
  if (value <= 0) return { valid:false, empty:false, value, message:'Escribe un valor mayor que 0.' };
  return { valid:true, empty:false, value, message:'' };
}

function applyValidation(input,error,{showEmpty=false}={}){
  if (!input) return { valid:false, empty:true, value:null, message:'Completa este valor.' };
  const state = positiveInputState(input);
  const shouldShow = !state.valid && (!state.empty || showEmpty);
  input.setCustomValidity(shouldShow ? state.message : '');
  input.toggleAttribute('aria-invalid',shouldShow);
  if (error) {
    error.hidden = !shouldShow;
    error.textContent = shouldShow ? state.message : '';
  }
  return state;
}

function renderResultPlaceholder(title,copy,{kind='pending'}={}){
  if (!resultZone) return;
  resultZone.className = `mixer-result-zone is-${kind}`;
  resultZone.innerHTML = `
    <div class="mixer-result-placeholder">
      <span aria-hidden="true">↗</span>
      <div><strong>${escapeHtml(title)}</strong><p>${escapeHtml(copy)}</p></div>
    </div>`;
}

function renderScaledResults(recipe,originalValue,targetValue){
  if (!resultZone) return;
  const factor = targetValue / originalValue;
  const rows = Array.isArray(recipe?.ingredientes) ? recipe.ingredientes : [];
  const targetLabel = formatNumber(targetValue);
  const factorLabel = formatNumber(factor);

  const body = rows.length
    ? rows.map(row => {
        const name = row?.ingrediente || 'Ingrediente';
        return `
          <div class="mixer-result-row" role="row">
            <strong class="mixer-result-ingredient" role="cell">${escapeHtml(name)}</strong>
            <span class="mixer-result-value" role="cell" data-label="Original">${escapeHtml(measureText(row))}</span>
            <span class="mixer-result-value mixer-result-needed" role="cell" data-label="Necesario">${escapeHtml(measureText(row,{factor,scaled:true}))}</span>
          </div>`;
      }).join('')
    : '<div class="mixer-result-empty">Esta receta no tiene ingredientes disponibles para calcular.</div>';

  resultZone.className = 'mixer-result-zone is-ready';
  resultZone.innerHTML = `
    <div class="mixer-result-header">
      <div>
        <span class="mixer-result-kicker">Resultado proporcional</span>
        <h3>Necesitas para ${escapeHtml(targetLabel)} ml</h3>
      </div>
      <span class="mixer-factor-badge" title="Volumen objetivo dividido entre rendimiento original">× ${escapeHtml(factorLabel)}</span>
    </div>
    <div class="mixer-result-table" role="table" aria-label="Ingredientes escalados para ${escapeHtml(targetLabel)} mililitros">
      <div class="mixer-result-table-head" role="row">
        <span role="columnheader">Ingrediente</span>
        <span role="columnheader">Original</span>
        <span role="columnheader">Necesario</span>
      </div>
      <div class="mixer-result-body" role="rowgroup">${body}</div>
    </div>
    <p class="mixer-result-note">Las unidades se conservan exactamente como están en la receta. Mixer no convierte unidades ni modifica la receta fuente.</p>`;
}

function updateCalculation({showEmptyErrors=false}={}){
  const recipe = mixerRecipes.find(item => item.id === activeRecipeId) || null;
  if (!recipe) {
    renderResultPlaceholder('Resultado de Mixer','Selecciona una receta para comenzar.');
    return;
  }

  const originalState = applyValidation(originalYield,originalYieldError,{showEmpty:showEmptyErrors});
  const targetState = applyValidation(targetYield,targetYieldError,{showEmpty:showEmptyErrors});

  if (originalState.empty || targetState.empty) {
    renderResultPlaceholder('Resultado de Mixer','Completa el rendimiento original y el volumen que quieres preparar.');
    return;
  }

  if (!originalState.valid || !targetState.valid) {
    renderResultPlaceholder('Revisa los volúmenes','Corrige los valores marcados para calcular la proporción.',{kind:'invalid'});
    return;
  }

  renderScaledResults(recipe,originalState.value,targetState.value);
}

function resetTemporaryValues(){
  if (originalYield) originalYield.value = '';
  if (targetYield) targetYield.value = '';
  clearValidation(originalYield,originalYieldError);
  clearValidation(targetYield,targetYieldError);
  if (originalYieldHelp) originalYieldHelp.textContent = 'Selecciona una receta para definir su rendimiento base.';
  renderResultPlaceholder('Resultado de Mixer','Completa el rendimiento original y el volumen que quieres preparar.');
}

function renderIngredients(recipe){
  if (!ingredients) return;
  const rows = Array.isArray(recipe?.ingredientes) ? recipe.ingredientes : [];
  ingredients.innerHTML = rows.length
    ? rows.map(row => `
      <div class="mixer-ingredient-row">
        <span>${escapeHtml(row.ingrediente || 'Ingrediente')}</span>
        <strong>${escapeHtml(measureText(row))}</strong>
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
  updateCalculation();
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
  applyValidation(originalYield,originalYieldError);
  updateCalculation();
});

targetYield?.addEventListener('input',()=>{
  applyValidation(targetYield,targetYieldError);
  updateCalculation();
});

originalYield?.addEventListener('blur',()=>{
  updateCalculation({showEmptyErrors:true});
});

targetYield?.addEventListener('blur',()=>{
  updateCalculation({showEmptyErrors:true});
});
