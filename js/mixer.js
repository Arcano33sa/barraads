import { storage } from './storage.js';
import { loadRecipes } from './recipes.js';
import { loadMixerHistory, saveMixerHistory } from './mixer-history.js';

const recipeSelect = document.getElementById('mixerRecipeSelect');
const recipePanel = document.getElementById('mixerRecipePanel');
const emptyPanel = document.getElementById('mixerEmpty');
const recipeName = document.getElementById('mixerRecipeName');
const recipeBase = document.getElementById('mixerRecipeBase');
const recipeCategory = document.getElementById('mixerRecipeCategory');
const recipeGlassware = document.getElementById('mixerRecipeGlassware');
const ingredients = document.getElementById('mixerIngredients');
const originalYield = document.getElementById('mixerOriginalYield');
const proportionUnit = document.getElementById('mixerProportionUnit');
const originalUnit = document.getElementById('mixerOriginalUnit');
const targetUnit = document.getElementById('mixerTargetUnit');
const originalYieldHelp = document.getElementById('mixerOriginalYieldHelp');
const targetYield = document.getElementById('mixerTargetYield');
const originalYieldError = document.getElementById('mixerOriginalYieldError');
const targetYieldError = document.getElementById('mixerTargetYieldError');
const resultZone = document.getElementById('mixerResultZone');
const resultActions = document.getElementById('mixerResultActions');
const saveCalculationButton = document.getElementById('mixerSaveCalculation');
const historyButton = document.getElementById('mixerHistoryButton');
const actionStatus = document.getElementById('mixerActionStatus');
const historyBackButton = document.getElementById('mixerHistoryBack');
const historyList = document.getElementById('mixerHistoryList');
const historyEmpty = document.getElementById('mixerHistoryEmpty');
const historyTotal = document.getElementById('mixerHistoryTotal');
const historyStatus = document.getElementById('mixerHistoryStatus');
const historyDetailModal = document.getElementById('mixerHistoryDetailModal');
const historyDetailTitle = document.getElementById('mixerHistoryDetailTitle');
const historyDetailBody = document.getElementById('mixerHistoryDetailBody');
const historyDetailClose = document.getElementById('mixerHistoryDetailClose');
const historyDetailDone = document.getElementById('mixerHistoryDetailDone');
const historyDeleteModal = document.getElementById('mixerHistoryDeleteModal');
const historyDeleteCopy = document.getElementById('mixerHistoryDeleteCopy');
const historyDeleteClose = document.getElementById('mixerHistoryDeleteClose');
const historyDeleteCancel = document.getElementById('mixerHistoryDeleteCancel');
const historyDeleteConfirm = document.getElementById('mixerHistoryDeleteConfirm');

let mixerRecipes = [];
let activeRecipeId = '';
let activeCalculationSnapshot = null;
let saveLock = false;
let saveLockTimer = null;
let historyOpenGroups = new Set();
let pendingHistoryDeleteId = null;
let historyReturnFocus = null;
let pendingHistoryReuse = null;

const escapeHtml = value => String(value ?? '')
  .replaceAll('&','&amp;')
  .replaceAll('<','&lt;')
  .replaceAll('>','&gt;')
  .replaceAll('"','&quot;')
  .replaceAll("'",'&#039;');

function naturalCompare(a,b){
  return String(a ?? '').localeCompare(String(b ?? ''),'es',{numeric:true,sensitivity:'base'});
}

function parseFiniteDecimal(value){
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const raw = value.trim();
  if (!raw) return null;
  // Aceptar coma o punto decimal sin usar parseFloat(), que tolera basura al final.
  const normalized = raw.includes(',') && !raw.includes('.') ? raw.replace(',', '.') : raw;
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) return null;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function formatNumber(value,{maximumFractionDigits=2}={}){
  const number = parseFiniteDecimal(value);
  if (number === null) return '';
  const normalized = Object.is(number,-0) ? 0 : number;
  // Evitar que una cantidad positiva muy pequeña se vea como 0 por redondeo visual.
  const precision = Math.abs(normalized) > 0 && Math.abs(normalized) < 0.01
    ? Math.max(maximumFractionDigits,6)
    : maximumFractionDigits;
  return new Intl.NumberFormat('es-NI',{
    maximumFractionDigits:precision,
    minimumFractionDigits:0,
    useGrouping:false
  }).format(normalized);
}

function formatInputNumber(value){
  const number = parseFiniteDecimal(value);
  if (number === null) return '';
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

function normalizeVolumeUnit(value){
  const unit = String(value ?? '').trim().toLocaleLowerCase('es');
  return unit === 'ml' || unit === 'oz' ? unit : '';
}

function inferProportionUnit(recipe){
  const rows = Array.isArray(recipe?.ingredientes) ? recipe.ingredientes : [];
  const units = new Set();
  for (const row of rows) {
    const state = ingredientState(row);
    if (state.kind !== 'number') continue;
    const unit = normalizeVolumeUnit(state.unit);
    if (!unit) return '';
    units.add(unit);
    if (units.size > 1) return '';
  }
  return units.size === 1 ? [...units][0] : '';
}

function safeYieldForUnit(recipe,unit){
  const normalizedUnit = normalizeVolumeUnit(unit);
  const rows = Array.isArray(recipe?.ingredientes) ? recipe.ingredientes : [];
  if (!normalizedUnit || !rows.length) return null;
  let total = 0;
  let hasPositive = false;
  for (const row of rows) {
    const state = ingredientState(row);
    if (state.kind === 'taste') continue;
    // Una cantidad histórica vacía/ilegible vuelve dudoso el rendimiento total.
    if (state.kind === 'missing') return null;
    if (state.amount < 0) return null;
    if (normalizeVolumeUnit(state.unit) !== normalizedUnit) return null;
    total += state.amount;
    if (state.amount > 0) hasPositive = true;
  }
  return hasPositive && Number.isFinite(total) && total > 0 ? total : null;
}

function currentProportionUnit(){
  return normalizeVolumeUnit(proportionUnit?.value);
}

function syncUnitLabels(){
  const label = currentProportionUnit() || '—';
  if (originalUnit) originalUnit.textContent = label;
  if (targetUnit) targetUnit.textContent = label;
}

function suggestYieldForActiveRecipe({clearTarget=false}={}){
  const recipe = mixerRecipes.find(item => String(item.id) === String(activeRecipeId)) || null;
  const unit = currentProportionUnit();
  if (clearTarget && targetYield) targetYield.value = '';
  if (originalYield) originalYield.value = '';
  clearValidation(originalYield,originalYieldError);
  clearValidation(targetYield,targetYieldError);

  if (!recipe || !unit) {
    if (originalYieldHelp) originalYieldHelp.textContent = unit
      ? 'Escribe el rendimiento original manualmente. Mixer no convierte ni mezcla unidades.'
      : 'Selecciona la unidad de proporción. Mixer no convierte unidades.';
    return;
  }

  const suggested = safeYieldForUnit(recipe,unit);
  if (suggested !== null && originalYield) {
    originalYield.value = formatInputNumber(suggested);
    if (originalYieldHelp) originalYieldHelp.textContent = `Sugerido con seguridad: suma de ingredientes numéricos expresados únicamente en ${unit} (${formatNumber(suggested)} ${unit}).`;
  } else if (originalYieldHelp) {
    originalYieldHelp.textContent = `Escribe el rendimiento original manualmente en ${unit}. Mixer no convierte ni mezcla unidades.`;
  }
}

function ingredientState(row){
  const rawAmount = row?.cantidad;
  const unit = String(row?.unidad ?? '').trim();
  const hasAmount = rawAmount !== null
    && rawAmount !== undefined
    && !(typeof rawAmount === 'string' && rawAmount.trim() === '');

  if (!hasAmount) return { kind:'missing', unit:'' };

  const amount = parseFiniteDecimal(rawAmount);
  if (amount === null) return { kind:'missing', unit:'' };
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

function snapshotIngredient(row,factor){
  const state = ingredientState(row);
  const nombre = String(row?.ingrediente || 'Ingrediente');
  const unidadOriginal = String(row?.unidad ?? '').trim();
  if (state.kind === 'taste') {
    return {
      nombre,
      cantidadOriginal:0,
      unidadOriginal:'',
      cantidadCalculada:null,
      visualOriginal:'Al gusto',
      visualCalculada:'Al gusto',
      alGusto:true,
      cantidadVacia:false
    };
  }
  if (state.kind === 'missing') {
    return {
      nombre,
      cantidadOriginal:null,
      unidadOriginal,
      cantidadCalculada:null,
      visualOriginal:'Sin cantidad',
      visualCalculada:'Sin cantidad',
      alGusto:false,
      cantidadVacia:true
    };
  }
  const cantidadCalculada = state.amount * factor;
  return {
    nombre,
    cantidadOriginal:state.amount,
    unidadOriginal:state.unit,
    cantidadCalculada:Number.isFinite(cantidadCalculada) ? cantidadCalculada : null,
    visualOriginal:measureText(row),
    visualCalculada:measureText(row,{factor,scaled:true}),
    alGusto:false,
    cantidadVacia:false
  };
}

function createCalculationSnapshot(recipe,originalValue,targetValue,factor,unit){
  const targetLabel = formatNumber(targetValue);
  return {
    recipeId:recipe?.id ? String(recipe.id) : null,
    nombreReceta:String(recipe?.nombre || 'Receta'),
    nombreVisible:`${String(recipe?.nombre || 'Receta')} ${targetLabel} ${unit}`,
    rendimientoOriginal:originalValue,
    unidadProporcion:unit,
    volumenObjetivo:targetValue,
    factor,
    ingredientes:(Array.isArray(recipe?.ingredientes) ? recipe.ingredientes : []).map(row=>snapshotIngredient(row,factor))
  };
}

function makeHistoryId(){
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `mixer-${Date.now()}-${Math.random().toString(36).slice(2,10)}`;
}

function setMixerActionStatus(message,type=''){
  if (!actionStatus) return;
  actionStatus.textContent = message || '';
  actionStatus.classList.remove('is-success','is-error','is-info');
  if (type) actionStatus.classList.add(`is-${type}`);
}

function setResultActionsReady(ready){
  if (resultActions) resultActions.hidden = false;
  if (saveCalculationButton) {
    saveCalculationButton.hidden = !ready;
    saveCalculationButton.disabled = !ready || saveLock;
  }
  if (historyButton) historyButton.disabled = false;
  if (!ready) setMixerActionStatus('');
}

function saveCurrentCalculation(){
  if (saveLock || !activeCalculationSnapshot) return;
  const button = saveCalculationButton;
  saveLock = true;
  if (button) button.disabled = true;
  try {
    const record = {
      ...JSON.parse(JSON.stringify(activeCalculationSnapshot)),
      id:makeHistoryId(),
      fechaHoraGuardado:new Date().toISOString()
    };
    const history = loadMixerHistory(storage);
    saveMixerHistory(storage,[...history,record]);
    setMixerActionStatus('Cálculo guardado en Histórico.','success');
  } catch (error) {
    setMixerActionStatus(error?.message || 'No fue posible guardar el cálculo.','error');
  } finally {
    clearTimeout(saveLockTimer);
    saveLockTimer = setTimeout(()=>{
      saveLock = false;
      if (saveCalculationButton && activeCalculationSnapshot) saveCalculationButton.disabled = false;
    },700);
  }
}

function openMixerHistory(){
  setMixerActionStatus('');
  if (location.hash !== '#mixer-history') location.hash = '#mixer-history';
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
  const nativeValue = Number.isFinite(input?.valueAsNumber) ? input.valueAsNumber : null;
  const value = nativeValue ?? parseFiniteDecimal(raw);
  if (value === null) return { valid:false, empty:false, value:null, message:'Escribe un número válido.' };
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
  activeCalculationSnapshot = null;
  setResultActionsReady(false);
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
  const unit = currentProportionUnit();
  if (!unit) {
    renderResultPlaceholder('Selecciona la unidad','Elige ml u oz para definir la proporción.',{kind:'invalid'});
    return;
  }
  const factor = targetValue / originalValue;
  if (!Number.isFinite(factor) || factor <= 0) {
    renderResultPlaceholder('Revisa los volúmenes','No fue posible calcular una proporción válida.',{kind:'invalid'});
    return;
  }
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

  activeCalculationSnapshot = createCalculationSnapshot(recipe,originalValue,targetValue,factor,unit);
  resultZone.className = 'mixer-result-zone is-ready';
  resultZone.innerHTML = `
    <div class="mixer-result-header">
      <div>
        <span class="mixer-result-kicker">Resultado proporcional</span>
        <h3>Necesitas para ${escapeHtml(targetLabel)} ${escapeHtml(unit)}</h3>
      </div>
      <span class="mixer-factor-badge" title="Volumen objetivo dividido entre rendimiento original">× ${escapeHtml(factorLabel)}</span>
    </div>
    <div class="mixer-result-table" role="table" aria-label="Ingredientes escalados para ${escapeHtml(targetLabel)} ${escapeHtml(unit)}">
      <div class="mixer-result-table-head" role="row">
        <span role="columnheader">Ingrediente</span>
        <span role="columnheader">Original</span>
        <span role="columnheader">Necesario</span>
      </div>
      <div class="mixer-result-body" role="rowgroup">${body}</div>
    </div>
    <p class="mixer-result-note">Las unidades se conservan exactamente como están en la receta. Mixer no convierte unidades ni modifica la receta fuente.</p>`;
  setResultActionsReady(true);
}

function updateCalculation({showEmptyErrors=false}={}){
  const recipe = mixerRecipes.find(item => String(item.id) === String(activeRecipeId)) || null;
  if (!recipe) {
    renderResultPlaceholder('Resultado de Mixer','Selecciona una receta para comenzar.');
    return;
  }

  const unit = currentProportionUnit();
  if (!unit) {
    renderResultPlaceholder('Selecciona la unidad','Elige ml u oz para definir la proporción.',{kind:'invalid'});
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
  if (proportionUnit) proportionUnit.value = '';
  syncUnitLabels();
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

  activeRecipeId = String(recipe.id);
  if (emptyPanel) emptyPanel.hidden = true;
  if (recipePanel) recipePanel.hidden = false;
  if (recipeName) recipeName.textContent = recipe.nombre || 'Receta';
  if (recipeBase) recipeBase.textContent = recipe.basePrincipal || '—';
  if (recipeCategory) recipeCategory.textContent = recipe.categoria || '—';
  if (recipeGlassware) recipeGlassware.textContent = recipe.cristaleria || '—';
  renderIngredients(recipe);

  const inferredUnit = inferProportionUnit(recipe);
  if (proportionUnit) proportionUnit.value = inferredUnit;
  syncUnitLabels();
  suggestYieldForActiveRecipe();
  updateCalculation();
}

function populateSelector(){
  if (!recipeSelect) return;
  const previous = activeRecipeId;
  mixerRecipes = uniqueSortedRecipes();
  recipeSelect.innerHTML = '<option value="">Selecciona una receta…</option>' + mixerRecipes
    .map(recipe => `<option value="${escapeHtml(recipe.id)}">${escapeHtml(recipe.nombre)}</option>`)
    .join('');

  if (previous && mixerRecipes.some(recipe => String(recipe.id) === String(previous))) {
    recipeSelect.value = String(previous);
    showRecipe(mixerRecipes.find(recipe => String(recipe.id) === String(previous)));
  } else {
    recipeSelect.value = '';
    showRecipe(null);
  }
}

function setHistoryStatus(message,type=''){
  if (!historyStatus) return;
  historyStatus.textContent = message || '';
  historyStatus.classList.remove('is-success','is-error','is-info');
  if (type) historyStatus.classList.add(`is-${type}`);
}

function historyGroupKey(name){
  const visible = String(name ?? '').trim();
  if (!visible) return '#';
  const folded = visible.normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const first = folded.charAt(0).toUpperCase();
  return /^[A-Z]$/.test(first) ? first : '#';
}

function historyNameKey(value){
  return String(value ?? '').trim();
}

function historyRecordCompare(a,b){
  const nameA = historyNameKey(a?.nombreReceta);
  const nameB = historyNameKey(b?.nombreReceta);
  const byName = nameA.localeCompare(nameB,'es',{numeric:true,sensitivity:'base'});
  if (byName) return byName;

  const unitA = String(a?.unidadProporcion || '');
  const unitB = String(b?.unidadProporcion || '');
  if (unitA !== unitB) return unitA.localeCompare(unitB,'es',{sensitivity:'base'});

  const targetA = Number(a?.volumenObjetivo);
  const targetB = Number(b?.volumenObjetivo);
  if (Number.isFinite(targetA) && Number.isFinite(targetB) && targetA !== targetB) return targetA - targetB;

  const dateA = Date.parse(a?.fechaHoraGuardado || '') || 0;
  const dateB = Date.parse(b?.fechaHoraGuardado || '') || 0;
  if (dateA !== dateB) return dateA - dateB;
  return String(a?.id || '').localeCompare(String(b?.id || ''),'es',{numeric:true,sensitivity:'base'});
}

function formatHistoryDate(value){
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible';
  const pad = number => String(number).padStart(2,'0');
  return `${pad(date.getDate())}/${pad(date.getMonth()+1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function groupHistoryRecords(records){
  const groups = new Map();
  records.slice().sort(historyRecordCompare).forEach(record=>{
    const key = historyGroupKey(record?.nombreReceta);
    if (!groups.has(key)) groups.set(key,[]);
    groups.get(key).push(record);
  });
  return [...groups.entries()].sort(([a],[b])=>{
    if (a === '#') return b === '#' ? 0 : 1;
    if (b === '#') return -1;
    return a.localeCompare(b,'es',{sensitivity:'base'});
  });
}

function findHistoryRecord(id){
  const key = String(id || '');
  return loadMixerHistory(storage).find(record=>String(record.id) === key) || null;
}

function renderHistoryList({resetOpen=false}={}){
  if (!historyList) return;
  if (resetOpen) historyOpenGroups = new Set();
  const records = loadMixerHistory(storage);
  const groups = groupHistoryRecords(records);
  const validKeys = new Set(groups.map(([key])=>key));
  historyOpenGroups = new Set([...historyOpenGroups].filter(key=>validKeys.has(key)));

  if (historyTotal) historyTotal.textContent = `${records.length} ${records.length === 1 ? 'cálculo' : 'cálculos'}`;
  if (historyEmpty) historyEmpty.hidden = records.length > 0;
  historyList.hidden = records.length === 0;
  if (!records.length) {
    historyList.innerHTML = '';
    return;
  }

  historyList.innerHTML = groups.map(([key,items])=>{
    const open = historyOpenGroups.has(key);
    const groupId = `mixer-history-group-${key === '#' ? 'misc' : key}`;
    return `
      <section class="mixer-history-group" data-history-group="${escapeHtml(key)}">
        <button class="mixer-history-letter" type="button" data-history-letter="${escapeHtml(key)}" aria-expanded="${open ? 'true' : 'false'}" aria-controls="${groupId}">
          <strong>${escapeHtml(key)}</strong>
          <span class="mixer-history-letter-meta"><span>${items.length} ${items.length === 1 ? 'cálculo' : 'cálculos'}</span><span class="mixer-history-chevron" aria-hidden="true">›</span></span>
        </button>
        <div class="mixer-history-records" id="${groupId}" ${open ? '' : 'hidden'}>
          ${items.map(record=>`
            <article class="mixer-history-row" data-history-record="${escapeHtml(record.id)}">
              <div class="mixer-history-row-main">
                <strong title="${escapeHtml(record.nombreVisible)}">${escapeHtml(record.nombreVisible)}</strong>
                <span>${escapeHtml(formatHistoryDate(record.fechaHoraGuardado))}</span>
              </div>
              <div class="mixer-history-row-actions" aria-label="Acciones de ${escapeHtml(record.nombreVisible)}">
                <button class="mixer-history-action" type="button" data-history-action="view" data-history-id="${escapeHtml(record.id)}">Ver</button>
                <button class="mixer-history-action is-danger" type="button" data-history-action="delete" data-history-id="${escapeHtml(record.id)}">Borrar</button>
                <button class="mixer-history-action" type="button" data-history-action="reuse" data-history-id="${escapeHtml(record.id)}">Usar nuevamente</button>
              </div>
            </article>`).join('')}
        </div>
      </section>`;
  }).join('');
}

function historyIngredientDisplay(ingredient){
  if (ingredient?.alGusto) return {original:'Al gusto',unit:'—',calculated:'Al gusto'};
  if (ingredient?.cantidadVacia) {
    return {
      original:ingredient?.visualOriginal || 'Sin cantidad',
      unit:ingredient?.unidadOriginal || '—',
      calculated:ingredient?.visualCalculada || 'Sin cantidad'
    };
  }
  const original = formatNumber(ingredient?.cantidadOriginal,{maximumFractionDigits:6}) || '—';
  const calculated = ingredient?.cantidadCalculada === null || ingredient?.cantidadCalculada === undefined
    ? '—'
    : (formatNumber(ingredient.cantidadCalculada,{maximumFractionDigits:6}) || '—');
  return {original,unit:ingredient?.unidadOriginal || '—',calculated};
}

function openHistoryDetail(record,trigger){
  if (!record || !historyDetailModal || !historyDetailBody) return;
  historyReturnFocus = trigger || document.activeElement;
  if (historyDetailTitle) historyDetailTitle.textContent = record.nombreVisible;
  const ingredientRows = (Array.isArray(record.ingredientes) ? record.ingredientes : []).map(ingredient=>{
    const display = historyIngredientDisplay(ingredient);
    return `
      <div class="mixer-history-detail-row" role="row">
        <strong role="cell">${escapeHtml(ingredient?.nombre || 'Ingrediente')}</strong>
        <span role="cell" data-label="Cantidad original">${escapeHtml(display.original)}</span>
        <span role="cell" data-label="Unidad original">${escapeHtml(display.unit)}</span>
        <span class="is-needed" role="cell" data-label="Cantidad calculada">${escapeHtml(display.calculated)}</span>
      </div>`;
  }).join('') || '<div class="mixer-history-detail-row"><strong>Sin ingredientes guardados.</strong></div>';

  historyDetailBody.innerHTML = `
    <div class="mixer-history-detail-meta">
      <div><span>Receta</span><strong title="${escapeHtml(record.nombreReceta)}">${escapeHtml(record.nombreReceta)}</strong></div>
      <div><span>Objetivo</span><strong>${escapeHtml(formatNumber(record.volumenObjetivo,{maximumFractionDigits:6}))} ${escapeHtml(record.unidadProporcion)}</strong></div>
      <div><span>Rendimiento original</span><strong>${escapeHtml(formatNumber(record.rendimientoOriginal,{maximumFractionDigits:6}))} ${escapeHtml(record.unidadProporcion)}</strong></div>
      <div><span>Unidad</span><strong>${escapeHtml(record.unidadProporcion)}</strong></div>
      <div><span>Factor</span><strong>× ${escapeHtml(formatNumber(record.factor,{maximumFractionDigits:6}))}</strong></div>
    </div>
    <p class="mixer-history-detail-date">Guardado: ${escapeHtml(formatHistoryDate(record.fechaHoraGuardado))}</p>
    <div class="mixer-history-detail-table" role="table" aria-label="Snapshot de ingredientes de ${escapeHtml(record.nombreReceta)}">
      <div class="mixer-history-detail-head" role="row">
        <span role="columnheader">Ingrediente</span><span role="columnheader">Cantidad original</span><span role="columnheader">Unidad original</span><span role="columnheader">Cantidad calculada</span>
      </div>
      <div role="rowgroup">${ingredientRows}</div>
    </div>`;
  historyDetailModal.hidden = false;
  document.body.classList.add('modal-open');
  requestAnimationFrame(()=>historyDetailClose?.focus());
}

function closeHistoryDetail(){
  if (!historyDetailModal || historyDetailModal.hidden) return;
  historyDetailModal.hidden = true;
  document.body.classList.remove('modal-open');
  const target = historyReturnFocus;
  historyReturnFocus = null;
  if (target && typeof target.focus === 'function') requestAnimationFrame(()=>target.focus());
}

function openHistoryDelete(record,trigger){
  if (!record || !historyDeleteModal) return;
  pendingHistoryDeleteId = record.id;
  historyReturnFocus = trigger || document.activeElement;
  if (historyDeleteCopy) historyDeleteCopy.textContent = `Se eliminará únicamente “${record.nombreVisible}”. La receta y los demás cálculos permanecerán intactos.`;
  historyDeleteModal.hidden = false;
  document.body.classList.add('modal-open');
  requestAnimationFrame(()=>historyDeleteCancel?.focus());
}

function closeHistoryDelete(){
  if (!historyDeleteModal || historyDeleteModal.hidden) return;
  historyDeleteModal.hidden = true;
  document.body.classList.remove('modal-open');
  pendingHistoryDeleteId = null;
  const target = historyReturnFocus;
  historyReturnFocus = null;
  if (target && typeof target.focus === 'function') requestAnimationFrame(()=>target.focus());
}

function confirmHistoryDelete(){
  if (!pendingHistoryDeleteId) return;
  const targetId = String(pendingHistoryDeleteId);
  const records = loadMixerHistory(storage);
  const target = records.find(record=>String(record.id) === targetId);
  if (!target) {
    closeHistoryDelete();
    setHistoryStatus('Ese cálculo ya no está disponible.','error');
    renderHistoryList();
    return;
  }
  try {
    saveMixerHistory(storage,records.filter(record=>String(record.id) !== targetId));
    historyDeleteModal.hidden = true;
    document.body.classList.remove('modal-open');
    pendingHistoryDeleteId = null;
    historyReturnFocus = null;
    renderHistoryList();
    setHistoryStatus(`“${target.nombreVisible}” fue eliminado del Histórico.`, 'success');
  } catch (error) {
    setHistoryStatus(error?.message || 'No fue posible borrar el cálculo.','error');
  }
}

function prepareHistoryReuse(record){
  const currentRecipes = uniqueSortedRecipes();
  const source = currentRecipes.find(recipe=>String(recipe.id) === String(record?.recipeId || '')) || null;
  if (!source) {
    setHistoryStatus('La receta fuente ya no está disponible. Puedes seguir consultando este snapshot con “Ver”.','error');
    return;
  }
  pendingHistoryReuse = JSON.parse(JSON.stringify(record));
  if (location.hash !== '#mixer') location.hash = '#mixer';
}

function applyPendingHistoryReuse(){
  if (!pendingHistoryReuse || !recipeSelect) return;
  const record = pendingHistoryReuse;
  pendingHistoryReuse = null;
  const recipe = mixerRecipes.find(item=>String(item.id) === String(record.recipeId || '')) || null;
  if (!recipe) {
    setMixerActionStatus('La receta fuente ya no está disponible. El Histórico permanece intacto.','error');
    return;
  }
  recipeSelect.value = String(recipe.id);
  showRecipe(recipe);
  if (proportionUnit) proportionUnit.value = record.unidadProporcion;
  syncUnitLabels();
  if (originalYield) originalYield.value = formatInputNumber(record.rendimientoOriginal);
  if (targetYield) targetYield.value = formatInputNumber(record.volumenObjetivo);
  clearValidation(originalYield,originalYieldError);
  clearValidation(targetYield,targetYieldError);
  updateCalculation({showEmptyErrors:true});
  const renamed = String(recipe.nombre || '') !== String(record.nombreReceta || '');
  setMixerActionStatus(renamed
    ? `Cargado desde “${record.nombreReceta}”. La receta actual se llama “${recipe.nombre}” y será la fuente del nuevo cálculo.`
    : 'Cálculo histórico cargado para usar nuevamente. No se guardará nada hasta pulsar “Guardar cálculo”.','info');
}

export function renderMixer(){
  populateSelector();
  applyPendingHistoryReuse();
}

export function renderMixerHistory({resetOpen=true}={}){
  setHistoryStatus('');
  renderHistoryList({resetOpen});
}


proportionUnit?.addEventListener('change',()=>{
  syncUnitLabels();
  // Cambiar la unidad nunca convierte números existentes: se limpian para evitar reinterpretarlos.
  suggestYieldForActiveRecipe({clearTarget:true});
  updateCalculation();
});

recipeSelect?.addEventListener('change',()=>{
  const recipe = mixerRecipes.find(item => String(item.id) === String(recipeSelect.value)) || null;
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


saveCalculationButton?.addEventListener('click',saveCurrentCalculation);
historyButton?.addEventListener('click',openMixerHistory);
historyBackButton?.addEventListener('click',()=>{ if (location.hash !== '#mixer') location.hash = '#mixer'; });
historyList?.addEventListener('click',event=>{
  const letterButton = event.target.closest('[data-history-letter]');
  if (letterButton) {
    const key = String(letterButton.dataset.historyLetter || '#');
    if (historyOpenGroups.has(key)) historyOpenGroups.delete(key); else historyOpenGroups.add(key);
    const records = letterButton.parentElement?.querySelector('.mixer-history-records');
    const open = historyOpenGroups.has(key);
    letterButton.setAttribute('aria-expanded',open ? 'true' : 'false');
    if (records) records.hidden = !open;
    return;
  }
  const action = event.target.closest('[data-history-action]');
  if (!action) return;
  const record = findHistoryRecord(action.dataset.historyId);
  if (!record) {
    setHistoryStatus('Ese cálculo ya no está disponible.','error');
    renderHistoryList();
    return;
  }
  if (action.dataset.historyAction === 'view') openHistoryDetail(record,action);
  else if (action.dataset.historyAction === 'delete') openHistoryDelete(record,action);
  else if (action.dataset.historyAction === 'reuse') prepareHistoryReuse(record);
});
historyDetailClose?.addEventListener('click',closeHistoryDetail);
historyDetailDone?.addEventListener('click',closeHistoryDetail);
historyDeleteClose?.addEventListener('click',closeHistoryDelete);
historyDeleteCancel?.addEventListener('click',closeHistoryDelete);
historyDeleteConfirm?.addEventListener('click',confirmHistoryDelete);
document.querySelector('[data-close-mixer-history-detail]')?.addEventListener('click',closeHistoryDetail);
document.querySelector('[data-close-mixer-history-delete]')?.addEventListener('click',closeHistoryDelete);
window.addEventListener('keydown',event=>{
  if (event.key !== 'Escape') return;
  if (historyDetailModal && !historyDetailModal.hidden) {
    event.preventDefault();
    event.stopImmediatePropagation();
    closeHistoryDetail();
    return;
  }
  if (historyDeleteModal && !historyDeleteModal.hidden) {
    event.preventDefault();
    event.stopImmediatePropagation();
    closeHistoryDelete();
  }
});
