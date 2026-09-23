import { storage } from './storage.js';
import {
  CATALOG_DEFINITIONS, loadCatalogs, saveCatalogs, normalizeCatalogValue,
  hasEquivalentDuplicate, addCatalogItem, editCatalogItem, deleteCatalogItem
} from './catalog.js';
import {
  loadRecipes, saveRecipes, sanitizeRecipeDraft, validateRecipe, createRecipeRecord
} from './recipes.js';
import {
  optimizeRecipePhoto, buildPhotoReferences, getRecipePhoto, getRecipePhotos,
  deleteRecipePhoto, saveRecipePhotoCollection, photoEntryFromProcessed
} from './media.js';
import { initSettings, refreshSettingsView } from './settings.js';
import { exportRecipesFile } from './export.js';

const sidebar = document.getElementById('sidebar');
const backdrop = document.getElementById('backdrop');
const mobileMenu = document.getElementById('mobileMenu');
const panels = [...document.querySelectorAll('[data-view-panel]')];
const navRoot = document.getElementById('mainNav');
const baseGroups = document.getElementById('baseGroups');
const recipeSearch = document.getElementById('recipeSearch');
const baseFilter = document.getElementById('baseFilter');
const emptyState = document.getElementById('emptyState');
const sidebarTime = document.getElementById('sidebarTime');

const catalogTabs = document.getElementById('catalogTabs');
const catalogList = document.getElementById('catalogList');
const catalogEmpty = document.getElementById('catalogEmpty');
const catalogSearch = document.getElementById('catalogSearch');
const catalogAddBtn = document.getElementById('catalogAddBtn');
const catalogInlineAdd = document.getElementById('catalogInlineAdd');
const catalogTitle = document.getElementById('catalogTitle');
const catalogPanelTitle = document.getElementById('catalogPanelTitle');
const catalogPanelHelp = document.getElementById('catalogPanelHelp');
const catalogTotal = document.getElementById('catalogTotal');

const catalogModal = document.getElementById('catalogModal');
const catalogModalClose = document.getElementById('catalogModalClose');
const catalogCancelBtn = document.getElementById('catalogCancelBtn');
const catalogModalTitle = document.getElementById('catalogModalTitle');
const catalogModalContext = document.getElementById('catalogModalContext');
const catalogForm = document.getElementById('catalogForm');
const catalogNameInput = document.getElementById('catalogNameInput');
const catalogFormError = document.getElementById('catalogFormError');
const deleteModal = document.getElementById('deleteModal');
const deleteModalClose = document.getElementById('deleteModalClose');
const deleteCancelBtn = document.getElementById('deleteCancelBtn');
const deleteConfirmBtn = document.getElementById('deleteConfirmBtn');
const deleteModalCopy = document.getElementById('deleteModalCopy');
const catalogToast = document.getElementById('catalogToast');

const newRecipeForm = document.getElementById('newRecipeForm');
const recipeName = document.getElementById('recipeName');
const recipeBasePrimary = document.getElementById('recipeBasePrimary');
const recipeCategory = document.getElementById('recipeCategory');
const recipeGlassware = document.getElementById('recipeGlassware');
const recipeGarnish = document.getElementById('recipeGarnish');
const recipeNotes = document.getElementById('recipeNotes');
const recipeStatus = document.getElementById('recipeStatus');
const recipeStatusDot = document.getElementById('recipeStatusDot');
const secondaryBasesOptions = document.getElementById('secondaryBasesOptions');
const secondaryBasesSummary = document.getElementById('secondaryBasesSummary');
const techniquesOptions = document.getElementById('techniquesOptions');
const techniquesSummary = document.getElementById('techniquesSummary');
const tagsOptions = document.getElementById('tagsOptions');
const tagsSummary = document.getElementById('tagsSummary');
const ingredientsRows = document.getElementById('ingredientsRows');
const alchemySteps = document.getElementById('alchemySteps');
const addIngredientBtn = document.getElementById('addIngredientBtn');
const addAlchemyBtn = document.getElementById('addAlchemyBtn');
const recipeFormError = document.getElementById('recipeFormError');
const recipeStorageNote = document.getElementById('recipeStorageNote');
const recipePhotoInput = document.getElementById('recipePhotoInput');
const recipePhotoPreview = document.getElementById('recipePhotoPreview');
const recipePhotoImage = document.getElementById('recipePhotoImage');
const recipePhotoEmpty = document.getElementById('recipePhotoEmpty');
const recipePhotoEdit = document.getElementById('recipePhotoEdit');
const recipePhotoDelete = document.getElementById('recipePhotoDelete');
const recipePhotoAddMore = document.getElementById('recipePhotoAddMore');
const recipePhotoGallery = document.getElementById('recipePhotoGallery');
const recipePhotoCount = document.getElementById('recipePhotoCount');
const newRecipeGlobalBaseFilter = document.getElementById('newRecipeGlobalBaseFilter');
const savedRecipePhotoInput = document.getElementById('savedRecipePhotoInput');
const recipeDetailShell = document.getElementById('recipeDetailShell');
const libraryRecipeSearch = document.getElementById('libraryRecipeSearch');
const librarySort = document.getElementById('librarySort');
const libraryBaseFilter = document.getElementById('libraryBaseFilter');
const libraryCategoryFilter = document.getElementById('libraryCategoryFilter');
const recipeLibraryGroups = document.getElementById('recipeLibraryGroups');
const recipeLibraryEmpty = document.getElementById('recipeLibraryEmpty');
const baseLibrarySearch = document.getElementById('baseLibrarySearch');
const baseLibraryFilter = document.getElementById('baseLibraryFilter');
const baseLibraryGrid = document.getElementById('baseLibraryGrid');
const baseLibraryEmpty = document.getElementById('baseLibraryEmpty');
const favoritesSearch = document.getElementById('favoritesSearch');
const favoritesBaseFilter = document.getElementById('favoritesBaseFilter');
const favoritesSummary = document.getElementById('favoritesSummary');
const favoritesList = document.getElementById('favoritesList');
const favoritesEmpty = document.getElementById('favoritesEmpty');
const recipeDeleteModal = document.getElementById('recipeDeleteModal');
const recipeDeleteModalClose = document.getElementById('recipeDeleteModalClose');
const recipeDeleteCancelBtn = document.getElementById('recipeDeleteCancelBtn');
const recipeDeleteConfirmBtn = document.getElementById('recipeDeleteConfirmBtn');
const recipeDeleteModalCopy = document.getElementById('recipeDeleteModalCopy');
const newRecipeTitle = document.getElementById('newRecipeTitle');
const recipeSaveButton = document.getElementById('recipeSaveButton');
const recipeEditorBack = document.getElementById('recipeEditorBack');
const recipeExportModal = document.getElementById('recipeExportModal');
const recipeExportModalClose = document.getElementById('recipeExportModalClose');
const recipeExportCancelBtn = document.getElementById('recipeExportCancelBtn');
const recipeExportTitle = document.getElementById('recipeExportTitle');
const recipeExportStatus = document.getElementById('recipeExportStatus');
const recipeLibraryExportBtn = document.getElementById('recipeLibraryExportBtn');
const recipeSelectionBar = document.getElementById('recipeSelectionBar');
const recipeSelectionCount = document.getElementById('recipeSelectionCount');
const recipeSelectionCancelBtn = document.getElementById('recipeSelectionCancelBtn');
const recipeSelectionExportBtn = document.getElementById('recipeSelectionExportBtn');
const recipeExportSelectedHint = document.getElementById('recipeExportSelectedHint');
const photoLightbox = document.getElementById('photoLightbox');
const photoLightboxImage = document.getElementById('photoLightboxImage');
const photoLightboxFallback = document.getElementById('photoLightboxFallback');
const photoLightboxIndicator = document.getElementById('photoLightboxIndicator');
const photoLightboxPrev = document.getElementById('photoLightboxPrev');
const photoLightboxNext = document.getElementById('photoLightboxNext');
const photoLightboxClose = document.getElementById('photoLightboxClose');

const DEMO_RECIPES = [
  { id:'margarita', name:'Margarita', base:'Tequila', details:'Tequila, triple sec, jugo de lima.', search:'tequila triple sec lima cítrico agitar shaker', thumb:'thumb-margarita' },
  { id:'paloma', name:'Paloma', base:'Tequila', details:'Tequila, refresco de toronja, jugo de lima.', search:'tequila toronja lima cítrico construir highball', thumb:'thumb-paloma' },
  { id:'rito-7', name:'Rito 7', base:'Tequila', details:'Tequila, licor de naranja, jugo de lima, toque herbal.', search:'tequila licor naranja lima herbal construir', thumb:'thumb-rito' },
  { id:'old-fashioned', name:'Old Fashioned', base:'Whisky', details:'Whisky, azúcar, bitters.', search:'whisky azúcar bitters remover rocks', thumb:'thumb-old-fashioned' },
  { id:'whisky-sour', name:'Whisky Sour', base:'Whisky', details:'Whisky, jugo de limón, jarabe simple, clara de huevo.', search:'whisky limón jarabe clara huevo agitar shaker', thumb:'thumb-whisky-sour' },
  { id:'daiquiri', name:'Daiquiri', base:'Ron', details:'Ron, jugo de lima, jarabe simple.', search:'ron lima jarabe simple agitar coupe', thumb:'thumb-daiquiri' },
  { id:'mojito', name:'Mojito', base:'Ron', details:'Ron, lima, menta, azúcar, agua con gas.', search:'ron lima menta azúcar agua gas construir highball', thumb:'thumb-mojito' },
  { id:'pina-colada', name:'Piña Colada', base:'Ron', details:'Ron, crema de coco, jugo de piña.', search:'ron crema coco piña licuar tropical', thumb:'thumb-pina-colada' },
  { id:'cosmopolitan', name:'Cosmopolitan', base:'Vodka', details:'Vodka, triple sec, arándano, lima.', search:'vodka triple sec arándano lima agitar martini', thumb:'thumb-cosmopolitan' },
  { id:'moscow-mule', name:'Moscow Mule', base:'Vodka', details:'Vodka, ginger beer, lima.', search:'vodka ginger beer jengibre lima construir mule', thumb:'thumb-moscow-mule' }
];

const BASE_ORDER = ['Tequila', 'Whisky', 'Ron', 'Vodka'];
const FAVORITES = new Set();
const COLLAPSED = new Set(['Vodka']);

const BASE_ICONS = {
  Tequila: '<svg viewBox="0 0 32 32"><path d="M16 27V13m0 0-5-8m5 8 5-8M16 13 8 8m8 5 8-5M16 13 5 13m11 0 11 0M16 13 9 19m7-6 7 6"/></svg>',
  Whisky: '<svg viewBox="0 0 32 32"><path d="M9 5h14l1.6 4.5v17H7.4v-17zM8 10h16M10 14h12M11 18h10M12 22h8"/></svg>',
  Ron: '<svg viewBox="0 0 32 32"><path d="M16 27v-9M16 18c-1-7 3-12 9-12-1 5-4 8-9 12ZM16 18C13 10 8 7 3 9c2 5 6 8 13 9ZM16 18c5-7 9-7 13-5-2 4-6 6-13 5Z"/></svg>',
  Vodka: '<svg viewBox="0 0 32 32"><path d="M12 5h8v5l2 3v14H10V13l2-3zM12 14h10M14 5h4"/></svg>'
};

let catalogs = loadCatalogs(storage);
let activeCatalogKey = 'bases';
let editingValue = null;
let pendingDeleteValue = null;
let toastTimer = null;
let recipes = loadRecipes(storage);
let photoObjectUrl = null;
let editorPhotoItems = [];
let editorPhotoObjectUrls = [];
let editorPhotosDirty = false;
let photoInputMode = 'append';
let photoProcessing = false;
let savedPhotoTargetId = null;
let savedRecipeThumbUrls = [];
let activeRecipeGalleryUrls = new Map();
let activeRecipeId = null;
let detailPhotoObjectUrls = [];
let lightboxObjectUrls = [];
let lightboxIndex = 0;
let lightboxRecipeId = null;
let lightboxReturnFocus = null;
let editingRecipeId = null;
let editorLoadedRecipeId = null;
let pendingRecipeDeleteId = null;
let exportRecipeTargetId = null;
let exportBusy = false;
let exportScope = 'this';
let recipeSelectionMode = false;
const selectedRecipeIds = new Set();
const COLLAPSED_LIBRARY_BASES = new Set();

const escapeHtml = value => String(value)
  .replaceAll('&','&amp;')
  .replaceAll('<','&lt;')
  .replaceAll('>','&gt;')
  .replaceAll('"','&quot;')
  .replaceAll("'",'&#039;');

function naturalCompare(a,b){
  return a.localeCompare(b,'es',{numeric:true,sensitivity:'base'});
}

function closeSidebar(){
  sidebar?.classList.remove('is-open');
  if (backdrop) backdrop.hidden = true;
  mobileMenu?.setAttribute('aria-expanded','false');
}

function openSidebar(){
  sidebar?.classList.add('is-open');
  if (backdrop) backdrop.hidden = false;
  mobileMenu?.setAttribute('aria-expanded','true');
}

function titleFor(viewName){
  const labels = {
    inicio:'Inicio', recetas:'Recetas', 'por-base':'Por base', favoritas:'Favoritas',
    catalogo:'Catálogo', configuracion:'Configuración', 'nueva-receta':'Nueva receta',
    'ficha-receta':'Ficha de receta'
  };
  return labels[viewName] || 'Inicio';
}

function showView(viewName,{updateHash=true}={}){
  const target = document.querySelector(`[data-view-panel="${viewName}"]`) || document.querySelector('[data-view-panel="inicio"]');
  if (!target) return;
  const actualView = target.dataset.viewPanel;

  panels.forEach(panel => panel.classList.toggle('is-visible',panel === target));
  const activeNavView = actualView === 'nueva-receta' ? 'inicio' : (actualView === 'ficha-receta' ? 'recetas' : actualView);
  navRoot?.querySelectorAll('[data-view]').forEach(button => {
    button.classList.toggle('is-active',button.dataset.view === activeNavView);
  });

  document.title = actualView === 'inicio'
    ? 'Barra de El Ágora del Sir'
    : `Barra de El Ágora del Sir — ${titleFor(actualView)}`;

  if (actualView === 'catalogo') renderCatalog();
  if (actualView === 'configuracion') refreshSettingsView();
  if (actualView === 'recetas') void renderRecipesLibrary();
  if (actualView === 'por-base') void renderBaseLibrary();
  if (actualView === 'favoritas') void renderFavorites();
  if (actualView === 'nueva-receta') void prepareNewRecipeView();
  if (actualView === 'ficha-receta') void renderRecipeDetail(activeRecipeId);
  if (updateHash && location.hash !== `#${actualView}`) history.pushState(null,'',`#${actualView}`);
  closeSidebar();
  window.scrollTo({top:0,behavior:'auto'});
}

function navigate(viewName){
  if (!viewName) return;
  showView(viewName);
}

function recipeRow(recipe){
  const favorite = FAVORITES.has(recipe.id);
  return `
    <article class="recipe-row" data-recipe-id="${escapeHtml(recipe.id)}">
      <div class="recipe-thumb ${escapeHtml(recipe.thumb)}" aria-hidden="true"></div>
      <div class="recipe-copy">
        <strong>${escapeHtml(recipe.name)}</strong>
        <small>${escapeHtml(recipe.details)}</small>
      </div>
      <button class="recipe-action favorite-button${favorite ? ' is-favorite' : ''}" type="button" data-favorite="${escapeHtml(recipe.id)}" aria-label="${favorite ? 'Quitar de favoritas' : 'Marcar como favorita'}" aria-pressed="${favorite ? 'true' : 'false'}">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.9a5.2 5.2 0 0 0-7.4 0L12 6.3l-1.4-1.4a5.2 5.2 0 1 0-7.4 7.4L12 21l8.8-8.7a5.2 5.2 0 0 0 0-7.4Z"/></svg>
      </button>
      <button class="recipe-action open-button" type="button" data-open-recipe="${escapeHtml(recipe.id)}" aria-label="Ver ${escapeHtml(recipe.name)}">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>
      </button>
    </article>`;
}

function renderRecipes(){
  if (!baseGroups || !recipeSearch || !baseFilter) return;
  const query = recipeSearch.value.trim().toLocaleLowerCase('es');
  const selectedBase = baseFilter.value;

  const filtered = DEMO_RECIPES.filter(recipe => {
    const matchesBase = selectedBase === 'all' || recipe.base === selectedBase;
    const haystack = `${recipe.name} ${recipe.base} ${recipe.details} ${recipe.search}`.toLocaleLowerCase('es');
    return matchesBase && (!query || haystack.includes(query));
  });

  const groups = BASE_ORDER
    .map(base => ({base, recipes:filtered.filter(recipe => recipe.base === base).sort((a,b)=>naturalCompare(a.name,b.name))}))
    .filter(group => group.recipes.length);

  baseGroups.innerHTML = groups.map(({base,recipes}) => {
    const isCollapsed = !query && selectedBase === 'all' && COLLAPSED.has(base);
    const plural = recipes.length === 1 ? 'receta' : 'recetas';
    return `
      <section class="base-group${isCollapsed ? ' is-collapsed' : ''}" data-base-group="${escapeHtml(base)}">
        <button class="base-header" type="button" data-toggle-base="${escapeHtml(base)}" aria-expanded="${isCollapsed ? 'false' : 'true'}">
          <span class="base-symbol">${BASE_ICONS[base]}</span>
          <span class="base-name">Base: <strong>${escapeHtml(base)}</strong></span>
          <span class="base-count">${recipes.length} ${plural}</span>
          <svg class="collapse-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m7 14.5 5-5 5 5"/></svg>
        </button>
        <div class="recipe-list">${recipes.map(recipeRow).join('')}</div>
      </section>`;
  }).join('');

  if (emptyState) emptyState.hidden = groups.length > 0;
}


function revokeSavedRecipeThumbUrls(){
  savedRecipeThumbUrls.forEach(url => URL.revokeObjectURL(url));
  savedRecipeThumbUrls = [];
  activeRecipeGalleryUrls = new Map();
}

function formatPhotoBytes(value){
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function normalizeSearchText(value){
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .toLocaleLowerCase('es')
    .trim();
}

function stableRecipeCompare(a,b,direction = 'az'){
  const nameCompare = naturalCompare(a.nombre || '',b.nombre || '');
  const tied = nameCompare || naturalCompare(a.id || '',b.id || '');
  return direction === 'za' ? -tied : tied;
}

function recipeSearchHaystack(recipe){
  const ingredients = (recipe.ingredientes || []).map(row => row.ingrediente).join(' ');
  const alchemy = (recipe.alquimia || []).map(step => step.texto).join(' ');
  return normalizeSearchText([
    recipe.nombre,recipe.basePrincipal,...(recipe.basesSecundarias || []),recipe.categoria,
    recipe.cristaleria,ingredients,...(recipe.tecnicas || []),alchemy,recipe.decoracion,
    ...(recipe.etiquetas || []),recipe.notas
  ].filter(Boolean).join(' '));
}

function allKnownBases(){
  return uniqueSorted([...(catalogs.bases || []),...recipes.flatMap(recipe => [recipe.basePrincipal,...(recipe.basesSecundarias || [])]).filter(Boolean)]);
}

function allKnownCategories(){
  return uniqueSorted([...(catalogs.categorias || []),...recipes.map(recipe => recipe.categoria).filter(Boolean)]);
}

function syncStage7Filter(select,values,allLabel){
  if (!select) return;
  const previous = select.value || 'all';
  select.innerHTML = `<option value="all">${escapeHtml(allLabel)}</option>` + values.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('');
  select.value = [...select.options].some(option => option.value === previous) ? previous : 'all';
}

function syncStage7Filters(){
  const bases = allKnownBases();
  syncStage7Filter(libraryBaseFilter,bases,'Base');
  syncStage7Filter(baseLibraryFilter,bases,'Todas las bases');
  syncStage7Filter(favoritesBaseFilter,bases,'Todas las bases');
  syncStage7Filter(libraryCategoryFilter,allKnownCategories(),'Categoría');
}

async function loadRecipeThumbUrls(items){
  revokeSavedRecipeThumbUrls();
  const map = new Map();
  await Promise.all(items.map(async recipe => {
    try {
      const photos = await getRecipePhotos(recipe.id);
      const urls = photos.map(photo => {
        const blob = photo?.thumbnailBlob instanceof Blob ? photo.thumbnailBlob : null;
        if (!blob) return null;
        try {
          const url = URL.createObjectURL(blob);
          savedRecipeThumbUrls.push(url);
          return url;
        } catch {
          return null;
        }
      }).filter(Boolean);
      if (urls.length) map.set(recipe.id,urls);
    } catch { /* photo is optional */ }
  }));
  activeRecipeGalleryUrls = map;
  return map;
}

function recipeIngredientSummary(recipe){
  const names = (recipe.ingredientes || []).map(row => row.ingrediente).filter(Boolean);
  if (!names.length) return 'Sin ingredientes registrados.';
  const visible = names.slice(0,4).join(', ');
  return `${visible}${names.length > 4 ? '…' : ''}.`;
}

function baseSymbolMarkup(base){
  if (BASE_ICONS[base]) return BASE_ICONS[base];
  const initial = String(base || '?').trim().charAt(0).toLocaleUpperCase('es') || '?';
  return `<span class="base-symbol-letter">${escapeHtml(initial)}</span>`;
}

function recipeThumbMarkup(recipe,urls){
  const safeUrls = Array.isArray(urls) ? urls.filter(Boolean) : (urls ? [urls] : []);
  if (safeUrls.length) {
    const total = safeUrls.length;
    return `<div class="stage7-recipe-thumb recipe-photo-gallery" data-recipe-gallery="${escapeHtml(recipe.id)}" data-gallery-index="0">
      <button class="gallery-photo-trigger" type="button" data-open-photo-viewer="${escapeHtml(recipe.id)}" aria-label="Ver fotografía de ${escapeHtml(recipe.nombre)} en grande">
        <img src="${escapeHtml(safeUrls[0])}" alt="Fotografía 1 de ${total} de ${escapeHtml(recipe.nombre)}">
        <span class="gallery-fallback" aria-hidden="true">◇</span>
      </button>
      ${total > 1 ? `<button class="gallery-nav gallery-nav-prev" type="button" data-gallery-shift="-1" aria-label="Fotografía anterior">‹</button><button class="gallery-nav gallery-nav-next" type="button" data-gallery-shift="1" aria-label="Fotografía siguiente">›</button><span class="gallery-position" aria-live="polite">1 / ${total}</span>` : ''}
    </div>`;
  }
  const initial = String(recipe.nombre || '?').trim().charAt(0).toLocaleUpperCase('es') || '?';
  return `<div class="stage7-recipe-thumb is-empty" aria-label="Sin fotografía"><span>${escapeHtml(initial)}</span></div>`;
}

function categoryTone(category){
  const normalized = normalizeSearchText(category);
  if (normalized.includes('tropical') || normalized.includes('sangria')) return 'is-warm';
  if (normalized.includes('experimental') || normalized.includes('autor') || normalized.includes('casa')) return 'is-violet';
  if (normalized.includes('mocktail') || normalized.includes('refresc')) return 'is-green';
  return 'is-cool';
}

function recipeLibraryRow(recipe,thumbUrl,{favoriteContext=false}={}){
  const selectable = recipeSelectionMode && !favoriteContext;
  const selected = selectable && selectedRecipeIds.has(recipe.id);
  return `
    <article class="stage7-recipe-row${selectable ? ' is-selection-mode' : ''}${selected ? ' is-selected' : ''}" data-stage7-recipe-id="${escapeHtml(recipe.id)}">
      ${selectable ? `<label class="recipe-select-control" aria-label="Seleccionar ${escapeHtml(recipe.nombre)}"><input type="checkbox" data-select-recipe="${escapeHtml(recipe.id)}" ${selected ? 'checked' : ''}></label>` : ''}
      ${recipeThumbMarkup(recipe,thumbUrl)}
      <button class="stage7-recipe-main" type="button" data-open-saved-recipe="${escapeHtml(recipe.id)}" aria-label="Abrir ${escapeHtml(recipe.nombre)}">
        <strong>${escapeHtml(recipe.nombre)}</strong>
        <small>${escapeHtml(recipeIngredientSummary(recipe))}</small>
      </button>
      <div class="stage7-recipe-chips">
        ${recipe.categoria ? `<span class="stage7-chip ${categoryTone(recipe.categoria)}">${escapeHtml(recipe.categoria)}</span>` : ''}
        ${recipe.basePrincipal ? `<span class="stage7-chip is-base"><span class="stage7-chip-icon">${baseSymbolMarkup(recipe.basePrincipal)}</span>${escapeHtml(recipe.basePrincipal)}</span>` : ''}
      </div>
      <details class="recipe-row-menu">
        <summary aria-label="Acciones de ${escapeHtml(recipe.nombre)}">•••</summary>
        <div class="recipe-row-menu-panel">
          <button type="button" data-edit-recipe="${escapeHtml(recipe.id)}">Editar</button>
          <button type="button" data-duplicate-recipe="${escapeHtml(recipe.id)}">Duplicar</button>
          <button class="is-danger" type="button" data-delete-recipe="${escapeHtml(recipe.id)}">Eliminar</button>
        </div>
      </details>
      <button class="stage7-heart${recipe.favorita ? ' is-active' : ''}" type="button" data-toggle-recipe-favorite="${escapeHtml(recipe.id)}" aria-label="${recipe.favorita ? 'Quitar de favoritas' : 'Marcar como favorita'}" aria-pressed="${recipe.favorita ? 'true' : 'false'}">${recipe.favorita ? '♥' : '♡'}</button>
      <button class="stage7-open" type="button" data-open-saved-recipe="${escapeHtml(recipe.id)}" aria-label="Ver ficha de ${escapeHtml(recipe.nombre)}">›</button>
    </article>`;
}

async function renderRecipesLibrary(){
  if (!recipeLibraryGroups || !recipeLibraryEmpty) return;
  syncStage7Filters();
  const query = normalizeSearchText(libraryRecipeSearch?.value || '');
  const selectedBase = libraryBaseFilter?.value || 'all';
  const selectedCategory = libraryCategoryFilter?.value || 'all';
  const direction = librarySort?.value === 'za' ? 'za' : 'az';
  const filtered = recipes.filter(recipe => {
    const matchesQuery = !query || recipeSearchHaystack(recipe).includes(query);
    const matchesBase = selectedBase === 'all' || recipe.basePrincipal === selectedBase || (recipe.basesSecundarias || []).includes(selectedBase);
    const matchesCategory = selectedCategory === 'all' || recipe.categoria === selectedCategory;
    return matchesQuery && matchesBase && matchesCategory;
  }).sort((a,b) => stableRecipeCompare(a,b,direction));

  const thumbs = await loadRecipeThumbUrls(filtered);
  const groups = new Map();
  filtered.forEach(recipe => {
    const raw = String(recipe.nombre || '#').trim().charAt(0).toLocaleUpperCase('es') || '#';
    const letter = raw.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleUpperCase('es');
    if (!groups.has(letter)) groups.set(letter,[]);
    groups.get(letter).push(recipe);
  });

  const entries = [...groups.entries()].sort((a,b) => naturalCompare(a[0],b[0]));
  if (direction === 'za') entries.reverse();
  recipeLibraryGroups.innerHTML = entries.map(([letter,items]) => `
    <section class="alphabet-group">
      <header><strong>${escapeHtml(letter)}</strong><span></span><small>${items.length} ${items.length === 1 ? 'receta' : 'recetas'}</small></header>
      <div>${items.map(recipe => recipeLibraryRow(recipe,thumbs.get(recipe.id))).join('')}</div>
    </section>`).join('');
  recipeLibraryEmpty.hidden = filtered.length > 0;
  updateRecipeSelectionBar();
}

async function renderBaseLibrary(){
  if (!baseLibraryGrid || !baseLibraryEmpty) return;
  syncStage7Filters();
  const query = normalizeSearchText(baseLibrarySearch?.value || '');
  const selectedBase = baseLibraryFilter?.value || 'all';
  const bases = allKnownBases().filter(base => selectedBase === 'all' || base === selectedBase);
  const candidateRecipes = recipes.filter(recipe => !query || recipeSearchHaystack(recipe).includes(query));
  const thumbs = await loadRecipeThumbUrls(candidateRecipes);
  const visibleGroups = [];

  bases.forEach(base => {
    const items = candidateRecipes.filter(recipe => recipe.basePrincipal === base).sort((a,b) => stableRecipeCompare(a,b));
    if (query && !items.length) return;
    visibleGroups.push({base,items});
  });

  baseLibraryGrid.innerHTML = visibleGroups.map(({base,items}) => {
    const collapsed = COLLAPSED_LIBRARY_BASES.has(base);
    return `
      <section class="base-library-group${collapsed ? ' is-collapsed' : ''}" data-stage7-base="${escapeHtml(base)}">
        <button class="base-library-header" type="button" data-toggle-library-base="${escapeHtml(base)}" aria-expanded="${collapsed ? 'false' : 'true'}">
          <span class="base-library-symbol">${baseSymbolMarkup(base)}</span>
          <span>Base: <strong>${escapeHtml(base)}</strong></span>
          <small>${items.length} ${items.length === 1 ? 'receta' : 'recetas'}</small>
          <span class="base-library-chevron">⌃</span>
        </button>
        <div class="base-library-recipes">
          ${items.length ? items.map(recipe => `
            <article class="base-mini-row">
              ${recipeThumbMarkup(recipe,thumbs.get(recipe.id))}
              <button type="button" class="base-mini-main" data-open-saved-recipe="${escapeHtml(recipe.id)}"><strong>${escapeHtml(recipe.nombre)}</strong><small>${escapeHtml(recipeIngredientSummary(recipe))}</small></button>
              <button class="stage7-heart${recipe.favorita ? ' is-active' : ''}" type="button" data-toggle-recipe-favorite="${escapeHtml(recipe.id)}" aria-label="${recipe.favorita ? 'Quitar de favoritas' : 'Marcar como favorita'}" aria-pressed="${recipe.favorita ? 'true' : 'false'}">${recipe.favorita ? '♥' : '♡'}</button>
              <button class="stage7-open" type="button" data-open-saved-recipe="${escapeHtml(recipe.id)}" aria-label="Abrir ${escapeHtml(recipe.nombre)}">›</button>
            </article>`).join('') : '<div class="base-library-zero">Todavía no hay recetas con esta base.</div>'}
        </div>
      </section>`;
  }).join('');
  baseLibraryEmpty.hidden = visibleGroups.length > 0;
}

async function renderFavorites(){
  if (!favoritesList || !favoritesEmpty || !favoritesSummary) return;
  syncStage7Filters();
  const allFavorites = recipes.filter(recipe => recipe.favorita).sort((a,b) => stableRecipeCompare(a,b));
  const query = normalizeSearchText(favoritesSearch?.value || '');
  const selectedBase = favoritesBaseFilter?.value || 'all';
  const filtered = allFavorites.filter(recipe => {
    const matchesQuery = !query || recipeSearchHaystack(recipe).includes(query);
    const matchesBase = selectedBase === 'all' || recipe.basePrincipal === selectedBase || (recipe.basesSecundarias || []).includes(selectedBase);
    return matchesQuery && matchesBase;
  });
  const thumbs = await loadRecipeThumbUrls(filtered);
  const counts = new Map();
  allFavorites.forEach(recipe => {
    const base = recipe.basePrincipal || 'Sin base';
    counts.set(base,(counts.get(base) || 0) + 1);
  });
  const distribution = [...counts.entries()].sort((a,b) => naturalCompare(a[0],b[0]));
  favoritesSummary.innerHTML = `
    <div class="favorite-total"><span class="favorite-total-heart">♥</span><div><strong>${allFavorites.length}</strong><b>Recetas favoritas</b><small>Tus imprescindibles en la barra.</small></div></div>
    <div class="favorite-distribution"><p>Tus favoritas por base</p><div>${distribution.length ? distribution.map(([base,count]) => `<span class="favorite-base-stat"><i>${baseSymbolMarkup(base)}</i><strong>${count}</strong><small>${escapeHtml(base)}</small></span>`).join('') : '<small class="favorite-none">Aún no hay distribución por base.</small>'}</div></div>`;
  favoritesList.innerHTML = filtered.map(recipe => recipeLibraryRow(recipe,thumbs.get(recipe.id),{favoriteContext:true})).join('');
  favoritesEmpty.hidden = filtered.length > 0;
}

function renderActiveStage7View(){
  const active = document.querySelector('.view.is-visible')?.dataset.viewPanel;
  if (active === 'recetas') void renderRecipesLibrary();
  if (active === 'por-base') void renderBaseLibrary();
  if (active === 'favoritas') void renderFavorites();
}

function releaseDetailPhotoUrl(){
  detailPhotoObjectUrls.forEach(url => URL.revokeObjectURL(url));
  detailPhotoObjectUrls = [];
}

function releaseLightboxUrls(){
  lightboxObjectUrls.forEach(url => { if (url) URL.revokeObjectURL(url); });
  lightboxObjectUrls = [];
}

function circularIndex(index,total){
  if (!total) return 0;
  return ((index % total) + total) % total;
}

function setGalleryIndex(gallery,index){
  if (!gallery) return;
  const recipeId = gallery.dataset.recipeGallery || '';
  const isDetailGallery = gallery.classList.contains('recipe-detail-photo') || Boolean(gallery.closest('.recipe-detail-photo'));
  const urls = isDetailGallery && recipeId === activeRecipeId
    ? detailPhotoObjectUrls
    : (activeRecipeGalleryUrls.get(recipeId) || []);
  if (!urls.length) return;
  const next = circularIndex(index,urls.length);
  gallery.dataset.galleryIndex = String(next);
  const img = gallery.querySelector('img');
  const position = gallery.querySelector('.gallery-position');
  gallery.classList.remove('is-broken');
  if (img) {
    img.src = urls[next];
    const recipe = recipes.find(item => item.id === recipeId);
    img.alt = `Fotografía ${next + 1} de ${urls.length} de ${recipe?.nombre || 'la receta'}`;
  }
  if (position) position.textContent = `${next + 1} / ${urls.length}`;
}

function shiftGallery(gallery,delta){
  if (!gallery) return;
  const current = Number(gallery.dataset.galleryIndex || 0);
  setGalleryIndex(gallery,current + Number(delta || 0));
}

function renderLightboxPhoto(){
  if (!photoLightbox || !photoLightboxImage) return;
  const total = lightboxObjectUrls.length;
  if (!total) return;
  lightboxIndex = circularIndex(lightboxIndex,total);
  const url = lightboxObjectUrls[lightboxIndex];
  const recipe = recipes.find(item => item.id === lightboxRecipeId);
  photoLightbox.classList.remove('is-broken');
  if (url) {
    photoLightboxImage.hidden = false;
    photoLightboxImage.src = url;
    photoLightboxImage.alt = `Fotografía ${lightboxIndex + 1} de ${total} de ${recipe?.nombre || 'la receta'}`;
    if (photoLightboxFallback) photoLightboxFallback.hidden = true;
  } else {
    photoLightboxImage.removeAttribute('src');
    photoLightboxImage.hidden = true;
    if (photoLightboxFallback) photoLightboxFallback.hidden = false;
    photoLightbox.classList.add('is-broken');
  }
  const multiple = total > 1;
  if (photoLightboxPrev) photoLightboxPrev.hidden = !multiple;
  if (photoLightboxNext) photoLightboxNext.hidden = !multiple;
  if (photoLightboxIndicator) {
    photoLightboxIndicator.hidden = !multiple;
    photoLightboxIndicator.textContent = `${lightboxIndex + 1} / ${total}`;
  }
}

async function openPhotoLightbox(recipeId,startIndex = 0,trigger = null){
  const recipe = recipes.find(item => item.id === recipeId);
  if (!recipe || !photoLightbox) return;
  let photos = [];
  try { photos = await getRecipePhotos(recipe.id); } catch { photos = []; }
  if (!photos.length) return;
  releaseLightboxUrls();
  lightboxObjectUrls = photos.map(photo => {
    const blob = photo?.fullBlob instanceof Blob ? photo.fullBlob : null;
    if (!blob) return null;
    try { return URL.createObjectURL(blob); } catch { return null; }
  });
  lightboxIndex = circularIndex(Number(startIndex || 0),lightboxObjectUrls.length);
  lightboxRecipeId = recipe.id;
  lightboxReturnFocus = trigger instanceof HTMLElement ? trigger : document.activeElement;
  photoLightbox.hidden = false;
  photoLightbox.classList.add('is-open');
  renderLightboxPhoto();
  setModalState();
  requestAnimationFrame(() => photoLightboxClose?.focus());
}

function closePhotoLightbox(){
  if (!photoLightbox || photoLightbox.hidden) return;
  photoLightbox.classList.remove('is-open','is-broken');
  photoLightbox.hidden = true;
  if (photoLightboxImage) {
    photoLightboxImage.removeAttribute('src');
    photoLightboxImage.hidden = false;
  }
  if (photoLightboxFallback) photoLightboxFallback.hidden = true;
  releaseLightboxUrls();
  lightboxIndex = 0;
  lightboxRecipeId = null;
  setModalState();
  if (lightboxReturnFocus instanceof HTMLElement && document.contains(lightboxReturnFocus)) lightboxReturnFocus.focus();
  lightboxReturnFocus = null;
}

function shiftPhotoLightbox(delta){
  if (!lightboxObjectUrls.length) return;
  lightboxIndex = circularIndex(lightboxIndex + Number(delta || 0),lightboxObjectUrls.length);
  renderLightboxPhoto();
}

function formatRecipeAmount(value){
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '';
  return new Intl.NumberFormat('es-NI',{maximumFractionDigits:2}).format(amount);
}

function formatIngredientAmount(row){
  const amount = Number(row?.cantidad);
  if (Number.isFinite(amount) && amount === 0) return 'Al gusto';
  return [formatRecipeAmount(row?.cantidad),row?.unidad || ''].filter(Boolean).join(' ');
}

function statusClass(value){
  if (value === 'Aprobada') return 'is-approved';
  if (value === 'Descartada') return 'is-discarded';
  return 'is-testing';
}

function chipList(values,emptyText = 'No especificado'){
  const safe = Array.isArray(values) ? values.filter(Boolean) : [];
  if (!safe.length) return `<span class="detail-empty-value">${escapeHtml(emptyText)}</span>`;
  return safe.map(value => `<span class="detail-chip">${escapeHtml(value)}</span>`).join('');
}

async function renderRecipeDetail(recipeId){
  if (!recipeDetailShell) return;
  releaseDetailPhotoUrl();
  const recipe = recipes.find(item => item.id === recipeId);
  if (!recipe) {
    recipeDetailShell.innerHTML = `
      <div class="recipe-detail-missing">
        <span aria-hidden="true">◇</span>
        <h1>Receta no disponible</h1>
        <p>La ficha solicitada no existe o ya no está guardada en este dispositivo.</p>
        <button class="secondary-action" data-view="recetas" type="button">Volver a Recetas</button>
      </div>`;
    return;
  }

  let detailPhotos = [];
  try { detailPhotos = await getRecipePhotos(recipe.id); } catch { detailPhotos = []; }
  detailPhotoObjectUrls = detailPhotos.map(photo => {
    const blob = photo?.fullBlob instanceof Blob ? photo.fullBlob : null;
    if (!blob) return null;
    try { return URL.createObjectURL(blob); } catch { return null; }
  }).filter(Boolean);
  const photoBlob = detailPhotoObjectUrls.length ? detailPhotos[0]?.fullBlob : null;

  const secondaryBases = recipe.basesSecundarias || [];
  const alchemy = [...(recipe.alquimia || [])].sort((a,b) => Number(a.orden || 0) - Number(b.orden || 0));
  const notes = recipe.notas ? escapeHtml(recipe.notas).replace(/\n/g,'<br>') : '<span class="detail-empty-value">Sin notas.</span>';
  const ingredientsMarkup = (recipe.ingredientes || []).map((row,index) => `
    <div class="detail-ingredient-row">
      <span class="detail-index">${index + 1}</span>
      <strong>${escapeHtml(row.ingrediente || 'Ingrediente')}</strong>
      <span class="detail-amount">${escapeHtml(formatIngredientAmount(row))}</span>
    </div>`).join('') || '<p class="detail-empty-value">Sin ingredientes registrados.</p>';
  const alchemyMarkup = alchemy.map((step,index) => `
    <li class="detail-alchemy-step">
      <span>${index + 1}</span>
      <p>${escapeHtml(step.texto || '')}</p>
    </li>`).join('') || '<li class="detail-empty-value">Sin pasos registrados.</li>';
  const allBases = [recipe.basePrincipal,...secondaryBases].filter(Boolean);

  recipeDetailShell.innerHTML = `
    <div class="recipe-detail-toolbar">
      <button class="recipe-detail-back" data-view="recetas" type="button" aria-label="Volver a Recetas">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.5 6-6 6 6 6"/></svg><span>Volver a Recetas</span>
      </button>
      <div class="recipe-detail-actions" aria-label="Acciones de receta">
        <button class="detail-action-button is-export" type="button" data-export-recipe="${escapeHtml(recipe.id)}">Exportar</button>
        <button class="detail-action-button" type="button" data-edit-recipe="${escapeHtml(recipe.id)}">Editar</button>
        <button class="detail-action-button" type="button" data-duplicate-recipe="${escapeHtml(recipe.id)}">Duplicar</button>
        <button class="detail-action-button is-danger" type="button" data-delete-recipe="${escapeHtml(recipe.id)}">Eliminar</button>
        <button class="detail-action-button is-favorite${recipe.favorita ? ' is-active' : ''}" type="button" data-toggle-recipe-favorite="${escapeHtml(recipe.id)}" aria-pressed="${recipe.favorita ? 'true' : 'false'}">
          <span aria-hidden="true">★</span>${recipe.favorita ? 'Favorita' : 'Marcar favorita'}
        </button>
      </div>
    </div>

    <article class="recipe-detail-card">
      <div class="recipe-detail-hero">
        <div class="recipe-detail-photo${photoBlob ? ' recipe-photo-gallery' : ' is-empty'}"${photoBlob ? ` data-recipe-gallery="${escapeHtml(recipe.id)}" data-gallery-index="0"` : ''}>
          ${photoBlob ? `<button class="gallery-photo-trigger detail-gallery-trigger" type="button" data-open-photo-viewer="${escapeHtml(recipe.id)}" aria-label="Ver fotografía de ${escapeHtml(recipe.nombre)} en grande"><img src="${escapeHtml(detailPhotoObjectUrls[0])}" alt="Fotografía 1 de ${detailPhotoObjectUrls.length} de ${escapeHtml(recipe.nombre)}"><span class="gallery-fallback" aria-hidden="true">◇</span></button>${detailPhotoObjectUrls.length > 1 ? `<button class="gallery-nav gallery-nav-prev detail-gallery-nav" type="button" data-gallery-shift="-1" aria-label="Fotografía anterior">‹</button><button class="gallery-nav gallery-nav-next detail-gallery-nav" type="button" data-gallery-shift="1" aria-label="Fotografía siguiente">›</button><span class="gallery-position detail-gallery-position" aria-live="polite">1 / ${detailPhotoObjectUrls.length}</span>` : ''}` : `<div class="detail-photo-placeholder"><span aria-hidden="true">◇</span><strong>Sin fotografía</strong><small>La receta conserva toda su información.</small></div>`}
        </div>
        <div class="recipe-detail-intro">
          <p class="detail-eyebrow">Ficha completa de receta</p>
          <div class="detail-title-row">
            <h1>${escapeHtml(recipe.nombre)}</h1>
            ${recipe.favorita ? '<span class="detail-favorite-star" aria-label="Receta favorita">★</span>' : ''}
          </div>
          <div class="detail-status ${statusClass(recipe.estado)}"><i></i>${escapeHtml(recipe.estado || 'En prueba')}</div>
          <dl class="detail-meta-grid">
            <div><dt>Base principal</dt><dd>${escapeHtml(recipe.basePrincipal || 'No especificada')}</dd></div>
            <div><dt>Bases secundarias</dt><dd>${secondaryBases.length ? escapeHtml(secondaryBases.join(', ')) : 'Ninguna'}</dd></div>
            <div><dt>Categoría</dt><dd>${escapeHtml(recipe.categoria || 'No especificada')}</dd></div>
            <div><dt>Cristalería</dt><dd>${escapeHtml(recipe.cristaleria || 'No especificada')}</dd></div>
          </dl>
          <div class="detail-base-line"><span>Perfil de bases</span><div>${chipList(allBases,'Sin bases')}</div></div>
        </div>
      </div>

      <div class="recipe-detail-grid">
        <section class="detail-panel detail-ingredients-panel">
          <header><span class="detail-panel-icon" aria-hidden="true">❧</span><div><h2>Ingredientes</h2><p>Cantidades y unidades de la receta.</p></div></header>
          <div class="detail-ingredients-list">${ingredientsMarkup}</div>
        </section>

        <section class="detail-panel detail-alchemy-panel">
          <header><span class="detail-panel-icon" aria-hidden="true">⚗</span><div><h2>ALQUIMIA</h2><p>Preparación en orden estable.</p></div></header>
          <ol class="detail-alchemy-list">${alchemyMarkup}</ol>
        </section>

        <section class="detail-panel detail-compact-panel">
          <h3>Técnicas</h3>
          <div class="detail-chip-wrap">${chipList(recipe.tecnicas,'Sin técnicas')}</div>
        </section>

        <section class="detail-panel detail-compact-panel">
          <h3>Decoración / Garnish</h3>
          <p class="detail-text-value">${escapeHtml(recipe.decoracion || 'Sin decoración especificada')}</p>
        </section>

        <section class="detail-panel detail-compact-panel detail-tags-panel">
          <h3>Etiquetas</h3>
          <div class="detail-chip-wrap">${chipList(recipe.etiquetas,'Sin etiquetas')}</div>
        </section>

        <section class="detail-panel detail-notes-panel">
          <h3>Notas</h3>
          <p class="detail-notes-copy">${notes}</p>
        </section>
      </div>
    </article>`;
}

function updateRecipeSelectionBar(){
  if (!recipeSelectionBar) return;
  recipeSelectionBar.hidden = !recipeSelectionMode;
  const count = selectedRecipeIds.size;
  if (recipeSelectionCount) recipeSelectionCount.textContent = `${count} ${count === 1 ? 'seleccionada' : 'seleccionadas'}`;
  if (recipeSelectionExportBtn) recipeSelectionExportBtn.disabled = count === 0 || exportBusy;
  if (recipeExportSelectedHint) recipeExportSelectedHint.textContent = count ? `${count} ${count === 1 ? 'receta marcada' : 'recetas marcadas'}` : 'Activa el modo selección';
}

function enterRecipeSelectionMode(){
  recipeSelectionMode = true;
  selectedRecipeIds.clear();
  showView('recetas');
  updateRecipeSelectionBar();
  requestAnimationFrame(()=>recipeLibraryGroups?.querySelector('[data-select-recipe]')?.focus());
}

function cancelRecipeSelectionMode(){
  recipeSelectionMode = false;
  selectedRecipeIds.clear();
  updateRecipeSelectionBar();
  void renderRecipesLibrary();
}

function toggleRecipeSelection(recipeId,checked){
  if (!recipeSelectionMode || !recipeId) return;
  if (checked) selectedRecipeIds.add(recipeId); else selectedRecipeIds.delete(recipeId);
  const row = recipeLibraryGroups?.querySelector(`[data-stage7-recipe-id="${CSS.escape(recipeId)}"]`);
  row?.classList.toggle('is-selected',Boolean(checked));
  updateRecipeSelectionBar();
}

function setRecipeExportBusy(isBusy){
  exportBusy = Boolean(isBusy);
  if (!recipeExportModal) return;
  recipeExportModal.querySelector('.export-modal-card')?.classList.toggle('is-busy',exportBusy);
  recipeExportModal.querySelectorAll('[data-export-format],[data-export-scope]').forEach(button => { button.disabled = exportBusy || button.dataset.scopeUnavailable === 'true'; });
  if (recipeExportCancelBtn) recipeExportCancelBtn.disabled = exportBusy;
  if (recipeExportModalClose) recipeExportModalClose.disabled = exportBusy;
  if (recipeSelectionExportBtn) recipeSelectionExportBtn.disabled = exportBusy || selectedRecipeIds.size === 0;
}

function updateExportScopeUi(){
  if (!recipeExportModal) return;
  const targetExists = Boolean(exportRecipeTargetId && recipes.some(item => item.id === exportRecipeTargetId));
  recipeExportModal.querySelectorAll('[data-export-scope]').forEach(button => {
    const scope = button.dataset.exportScope;
    button.classList.toggle('is-active',scope === exportScope);
    button.setAttribute('aria-pressed',scope === exportScope ? 'true' : 'false');
    const unavailable = scope === 'this' && !targetExists;
    button.dataset.scopeUnavailable = unavailable ? 'true' : 'false';
    button.disabled = exportBusy || unavailable;
  });
  if (recipeExportSelectedHint) {
    const count = selectedRecipeIds.size;
    recipeExportSelectedHint.textContent = count ? `${count} ${count === 1 ? 'receta marcada' : 'recetas marcadas'}` : 'Activa el modo selección';
  }
}

function selectExportScope(scope){
  if (!['this','selected','all'].includes(scope)) return;
  if (scope === 'selected' && selectedRecipeIds.size === 0) {
    closeRecipeExportModal();
    enterRecipeSelectionMode();
    showToast('Marca una o varias recetas y pulsa “Exportar seleccionadas”.');
    return;
  }
  if (scope === 'this' && !exportRecipeTargetId) {
    if (recipeExportStatus) {
      recipeExportStatus.textContent = 'Abre una ficha para usar “Esta receta”.';
      recipeExportStatus.classList.add('is-error');
    }
    return;
  }
  exportScope = scope;
  updateExportScopeUi();
  if (recipeExportStatus) {
    const count = scope === 'selected' ? selectedRecipeIds.size : scope === 'all' ? recipes.length : 1;
    recipeExportStatus.textContent = `${count} ${count === 1 ? 'receta lista' : 'recetas listas'} para exportar. Elige el formato.`;
    recipeExportStatus.classList.remove('is-error','is-success');
  }
}

function openRecipeExportModal(recipeId=null,{scope=null}={}){
  if (!recipeExportModal) return;
  const recipe = recipeId ? recipes.find(item => item.id === recipeId) : null;
  if (recipeId && !recipe) {
    showToast('No fue posible preparar la exportación.',{error:true});
    return;
  }
  exportRecipeTargetId = recipe?.id || null;
  exportScope = scope || (recipe ? 'this' : (selectedRecipeIds.size ? 'selected' : 'all'));
  setRecipeExportBusy(false);
  if (recipeExportTitle) recipeExportTitle.textContent = recipe ? `Exportar ${recipe.nombre}` : 'Exportar recetas';
  if (recipeExportStatus) {
    recipeExportStatus.textContent = 'Elige el alcance y el formato.';
    recipeExportStatus.classList.remove('is-error','is-success');
  }
  recipeExportModal.hidden = false;
  updateExportScopeUi();
  setModalState();
  requestAnimationFrame(()=>recipeExportModal.querySelector(`[data-export-scope="${exportScope}"]:not(:disabled)`)?.focus() || recipeExportModal.querySelector('[data-export-format="png"]')?.focus());
}

function closeRecipeExportModal(){
  if (!recipeExportModal || exportBusy) return;
  recipeExportModal.hidden = true;
  exportRecipeTargetId = null;
  exportScope = 'this';
  if (recipeExportStatus) {
    recipeExportStatus.textContent = '';
    recipeExportStatus.classList.remove('is-error','is-success');
  }
  setModalState();
}

function recipesForExportScope(){
  if (exportScope === 'this') {
    const recipe = recipes.find(item => item.id === exportRecipeTargetId);
    return recipe ? [recipe] : [];
  }
  if (exportScope === 'selected') {
    return recipes.filter(item => selectedRecipeIds.has(item.id)).sort((a,b)=>stableRecipeCompare(a,b,'az'));
  }
  return [...recipes].sort((a,b)=>stableRecipeCompare(a,b,'az'));
}

function collectionNameForScope(scope){
  if (scope === 'selected') return 'Recetas seleccionadas';
  if (scope === 'all') return 'Todas las recetas';
  return 'Receta';
}

async function runRecipeExport(format){
  if (exportBusy) return;
  const targets = recipesForExportScope();
  if (!targets.length) {
    const message = exportScope === 'selected' ? 'No hay recetas seleccionadas.' : 'No hay recetas disponibles para exportar.';
    if (recipeExportStatus) {
      recipeExportStatus.textContent = message;
      recipeExportStatus.classList.add('is-error');
    }
    showToast(message,{error:true});
    return;
  }

  setRecipeExportBusy(true);
  if (recipeExportStatus) {
    recipeExportStatus.textContent = `Preparando ${targets.length} ${targets.length === 1 ? 'receta' : 'recetas'}…`;
    recipeExportStatus.classList.remove('is-error','is-success');
  }
  try {
    const entries = [];
    let photoIssues = 0;
    for (let index=0;index<targets.length;index+=1) {
      const recipe = targets[index];
      if (recipeExportStatus) recipeExportStatus.textContent = `Leyendo datos ${index + 1} de ${targets.length}: ${recipe.nombre}`;
      let media = null;
      if (recipe.foto || recipe.fotos?.length) {
        try {
          media = await getRecipePhoto(recipe.id);
          const available = Array.isArray(media?.photos)
            ? media.photos.some(photo => photo?.fullBlob instanceof Blob && photo.fullBlob.type?.startsWith('image/'))
            : media?.fullBlob instanceof Blob && media.fullBlob.type?.startsWith('image/');
          if (!available) photoIssues += 1;
        } catch { photoIssues += 1; }
      }
      entries.push({recipe,media});
    }
    const result = await exportRecipesFile(entries,format,{
      collectionName:collectionNameForScope(exportScope),
      onProgress:progress => {
        if (!recipeExportStatus) return;
        if (progress.phase === 'package') {
          recipeExportStatus.textContent = format === 'pdf' ? 'Construyendo PDF final…' : 'Empaquetando imágenes en ZIP…';
          return;
        }
        const recipeName = progress.recipe?.nombre ? `: ${progress.recipe.nombre}` : '';
        recipeExportStatus.textContent = `Generando ${progress.current} de ${progress.total}${recipeName}`;
      }
    });
    const fallbackCount = Number(result.photoFallbackCount || (result.photoStatus === 'fallback' ? 1 : 0));
    const placeholderCount = Math.max(photoIssues,Number(result.photoPlaceholderCount || (result.photoStatus === 'placeholder' ? 1 : 0)));
    const notes = [];
    if (fallbackCount) notes.push(`${fallbackCount} ${fallbackCount === 1 ? 'receta usó temporalmente la siguiente fotografía válida' : 'recetas usaron temporalmente la siguiente fotografía válida'} sin cambiar la principal`);
    if (placeholderCount) notes.push(`${placeholderCount} ${placeholderCount === 1 ? 'receta usó placeholder por fotografía no disponible' : 'recetas usaron placeholder por fotografías no disponibles'}`);
    const photoNote = notes.length ? ` ${notes.join(' · ')}.` : '';
    if (recipeExportStatus) {
      recipeExportStatus.textContent = `${result.filename} generado correctamente.${photoNote}`;
      recipeExportStatus.classList.add('is-success');
    }
    showToast(`${String(format).toUpperCase()} generado correctamente.${photoNote}`);
    if (exportScope === 'selected') {
      recipeSelectionMode = false;
      selectedRecipeIds.clear();
      updateRecipeSelectionBar();
      void renderRecipesLibrary();
    }
  } catch (error) {
    if (recipeExportStatus) {
      recipeExportStatus.textContent = error?.message || 'No fue posible exportar las recetas.';
      recipeExportStatus.classList.add('is-error');
    }
    showToast(error?.message || 'No fue posible exportar las recetas.',{error:true});
  } finally {
    setRecipeExportBusy(false);
    updateExportScopeUi();
  }
}

function openRecipeDetail(recipeId,{replaceHash=false} = {}){
  const recipe = recipes.find(item => item.id === recipeId);
  if (!recipe) {
    showToast('No fue posible abrir esa receta.',{error:true});
    return;
  }
  activeRecipeId = recipe.id;
  showView('ficha-receta',{updateHash:false});
  const nextHash = `#ficha-receta/${encodeURIComponent(recipe.id)}`;
  if (location.hash !== nextHash) {
    history[replaceHash ? 'replaceState' : 'pushState'](null,'',nextHash);
  }
}

function toggleRecipeFavorite(recipeId){
  const recipe = recipes.find(item => item.id === recipeId);
  if (!recipe) return;
  const nextValue = !recipe.favorita;
  recipes = recipes.map(item => item.id === recipeId ? {...item,favorita:nextValue} : item);
  recipes = saveRecipes(storage,recipes);
  if (activeRecipeId === recipeId && document.querySelector('[data-view-panel="ficha-receta"]')?.classList.contains('is-visible')) {
    void renderRecipeDetail(recipeId);
  }
  renderActiveStage7View();
  showToast(nextValue ? 'Receta marcada como favorita.' : 'Receta retirada de favoritas.');
}

async function duplicateRecipe(recipeId){
  const source = recipes.find(item => item.id === recipeId);
  if (!source) {
    showToast('No fue posible duplicar esa receta.',{error:true});
    return;
  }
  const copyDraft = sanitizeRecipeDraft({
    ...source,
    id:'',
    nombre:`${source.nombre} (copia)`,
    favorita:false,
    foto:null,
    fotos:[],
    createdAt:'',
    updatedAt:''
  });
  const copy = createRecipeRecord(copyDraft);
  let photosCopied = 0;
  let photoCopySkipped = false;
  if (source.foto || source.fotos?.length) {
    try {
      const sourcePhotos = await getRecipePhotos(source.id);
      if (sourcePhotos.length) {
        const copiedEntries = sourcePhotos.map(photo=>photoEntryFromProcessed(copy.id,{
          fullBlob:photo.fullBlob,
          thumbnailBlob:photo.thumbnailBlob,
          metadata:{...(photo.metadata || {})}
        }));
        await saveRecipePhotoCollection(copy.id,copiedEntries);
        copy.fotos = buildPhotoReferences(copy.id,copiedEntries);
        copy.foto = copy.fotos[0] || null;
        photosCopied = copiedEntries.length;
      } else {
        photoCopySkipped = true;
      }
    } catch {
      photoCopySkipped = true;
    }
  }
  try {
    recipes = saveRecipes(storage,[...recipes,copy]);
  } catch (error) {
    if (photosCopied) {
      try { await deleteRecipePhoto(copy.id); } catch { /* cleanup best effort */ }
    }
    showToast(error?.message || 'No fue posible duplicar la receta.',{error:true});
    return;
  }
  showToast(photosCopied
    ? `Receta duplicada con ${photosCopied} ${photosCopied === 1 ? 'fotografía' : 'fotografías'}.`
    : (photoCopySkipped ? 'Receta duplicada; sus fotografías no pudieron copiarse.' : 'Receta duplicada correctamente.'),{error:photoCopySkipped});
  renderActiveStage7View();
  openRecipeDetail(copy.id);
}

function openRecipeDeleteModal(recipeId){
  const recipe = recipes.find(item => item.id === recipeId);
  if (!recipe || !recipeDeleteModal) return;
  pendingRecipeDeleteId = recipe.id;
  if (recipeDeleteModalCopy) recipeDeleteModalCopy.textContent = `Se eliminará “${recipe.nombre}” y sus fotografías locales, si existen. Esta acción no afectará otras recetas.`;
  recipeDeleteModal.hidden = false;
  recipeDeleteModal.classList.add('is-open');
  setModalState();
  recipeDeleteConfirmBtn?.focus();
}

function closeRecipeDeleteModal(){
  pendingRecipeDeleteId = null;
  recipeDeleteModal?.classList.remove('is-open');
  if (recipeDeleteModal) recipeDeleteModal.hidden = true;
  setModalState();
}

async function confirmRecipeDelete(){
  const recipeId = pendingRecipeDeleteId;
  if (!recipeId) return;
  const recipe = recipes.find(item => item.id === recipeId);
  if (!recipe) {
    closeRecipeDeleteModal();
    return;
  }
  let mediaCleanupFailed = false;
  if (recipe.foto) {
    try { await deleteRecipePhoto(recipe.id); }
    catch { mediaCleanupFailed = true; }
  }
  try {
    recipes = saveRecipes(storage,recipes.filter(item => item.id !== recipe.id));
    selectedRecipeIds.delete(recipe.id);
    updateRecipeSelectionBar();
  } catch (error) {
    showToast(error?.message || 'No fue posible eliminar la receta.',{error:true});
    return;
  }
  const wasActive = activeRecipeId === recipe.id;
  if (editingRecipeId === recipe.id) {
    editingRecipeId = null;
    editorLoadedRecipeId = null;
  }
  closeRecipeDeleteModal();
  showToast(mediaCleanupFailed ? 'Receta eliminada. La fotografía local no pudo limpiarse por completo.' : 'Receta eliminada correctamente.',{error:mediaCleanupFailed});
  if (wasActive || document.querySelector('[data-view-panel="ficha-receta"]')?.classList.contains('is-visible')) {
    activeRecipeId = null;
    showView('recetas');
  } else {
    renderActiveStage7View();
  }
}

function updateSavedRecipeReferences(recipeId,photoReferences){
  const now = new Date().toISOString();
  const safe = Array.isArray(photoReferences) ? photoReferences : [];
  recipes = recipes.map(recipe => recipe.id === recipeId
    ? {...recipe,fotos:safe,foto:safe[0] || null,updatedAt:now}
    : recipe);
  recipes = saveRecipes(storage,recipes);
}

async function replaceSavedRecipePhoto(recipeId,file){
  if (!recipeId || !file) return;
  showToast('Optimizando fotografía…');
  try {
    const processed = await optimizeRecipePhoto(file);
    const current = await getRecipePhotos(recipeId);
    const replacement = photoEntryFromProcessed(recipeId,processed);
    const next = current.length ? [replacement,...current.slice(1)] : [replacement];
    await saveRecipePhotoCollection(recipeId,next);
    updateSavedRecipeReferences(recipeId,buildPhotoReferences(recipeId,next));
    renderActiveStage7View();
    showToast('Fotografía principal actualizada correctamente.');
  } catch (error) {
    showToast(error?.message || 'No fue posible actualizar la fotografía.',{error:true});
  } finally {
    savedPhotoTargetId = null;
    if (savedRecipePhotoInput) savedRecipePhotoInput.value = '';
  }
}

async function removeSavedRecipePhoto(recipeId){
  if (!recipeId) return;
  try {
    const current = await getRecipePhotos(recipeId);
    if (!current.length) return;
    const next = current.slice(1);
    if (next.length) await saveRecipePhotoCollection(recipeId,next);
    else await deleteRecipePhoto(recipeId);
    updateSavedRecipeReferences(recipeId,buildPhotoReferences(recipeId,next));
    renderActiveStage7View();
    showToast(next.length ? 'Fotografía principal eliminada. La siguiente pasó a ser principal.' : 'Fotografía eliminada. La receta se conserva intacta.');
  } catch (error) {
    showToast(error?.message || 'No fue posible eliminar la fotografía.',{error:true});
  }
}

function populateBaseFilter(){
  if (!baseFilter) return;
  BASE_ORDER.forEach(base => {
    const option = document.createElement('option');
    option.value = base;
    option.textContent = base;
    baseFilter.append(option);
  });
}

function getActiveDefinition(){
  return CATALOG_DEFINITIONS[activeCatalogKey];
}

function renderCatalogTabs(){
  if (!catalogTabs) return;
  catalogTabs.innerHTML = Object.entries(CATALOG_DEFINITIONS).map(([key,definition]) => {
    const count = catalogs[key]?.length || 0;
    return `
      <button class="catalog-tab${key === activeCatalogKey ? ' is-active' : ''}" type="button" data-catalog-key="${escapeHtml(key)}" aria-pressed="${key === activeCatalogKey ? 'true' : 'false'}">
        <span class="catalog-tab-icon" aria-hidden="true">${escapeHtml(definition.short)}</span>
        <span class="catalog-tab-name">${escapeHtml(definition.label)}</span>
        <span class="catalog-tab-count">${count}</span>
      </button>`;
  }).join('');
}

function renderCatalog(){
  if (!catalogList) return;
  const definition = getActiveDefinition();
  const query = normalizeCatalogValue(catalogSearch?.value || '');
  const allItems = [...(catalogs[activeCatalogKey] || [])].sort(naturalCompare);
  const items = query
    ? allItems.filter(item => normalizeCatalogValue(item).includes(query))
    : allItems;

  renderCatalogTabs();
  if (catalogTitle) catalogTitle.textContent = definition.label;
  if (catalogPanelTitle) catalogPanelTitle.textContent = definition.label;
  if (catalogPanelHelp) catalogPanelHelp.textContent = definition.help;
  if (catalogTotal) catalogTotal.textContent = `${allItems.length} ${allItems.length === 1 ? 'elemento' : 'elementos'}`;
  if (catalogAddBtn) catalogAddBtn.innerHTML = `<span aria-hidden="true">＋</span>Agregar a ${escapeHtml(definition.label)}`;

  catalogList.innerHTML = items.map((item,index) => {
    const encoded = encodeURIComponent(item);
    return `
      <article class="catalog-row">
        <span class="catalog-row-index">${String(index + 1).padStart(2,'0')}</span>
        <strong class="catalog-row-name">${escapeHtml(item)}</strong>
        <div class="catalog-row-actions">
          <button class="catalog-row-action" type="button" data-edit-catalog="${encoded}" aria-label="Editar ${escapeHtml(item)}">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 20 4.3-1 10-10a2.1 2.1 0 0 0-3-3l-10 10zM14 7l3 3"/></svg>
          </button>
          <button class="catalog-row-action is-delete" type="button" data-delete-catalog="${encoded}" aria-label="Borrar ${escapeHtml(item)}">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5"/></svg>
          </button>
        </div>
      </article>`;
  }).join('');

  if (catalogEmpty) catalogEmpty.hidden = items.length > 0;
}

function setModalState(){
  const anyOpen = (catalogModal && !catalogModal.hidden) || (deleteModal && !deleteModal.hidden) || (recipeDeleteModal && !recipeDeleteModal.hidden) || (recipeExportModal && !recipeExportModal.hidden) || (photoLightbox && !photoLightbox.hidden);
  document.body.classList.toggle('modal-open',Boolean(anyOpen));
}

function openCatalogModal(value = null){
  if (!catalogModal || !catalogNameInput) return;
  editingValue = value;
  const definition = getActiveDefinition();
  catalogModalTitle.textContent = value ? 'Editar elemento' : 'Agregar elemento';
  catalogModalContext.textContent = definition.label;
  catalogNameInput.value = value || '';
  catalogFormError.hidden = true;
  catalogFormError.textContent = '';
  catalogModal.hidden = false;
  setModalState();
  requestAnimationFrame(() => {
    catalogNameInput.focus();
    if (value) catalogNameInput.select();
  });
}

function closeCatalogModal(){
  if (!catalogModal) return;
  catalogModal.hidden = true;
  editingValue = null;
  if (catalogFormError) {
    catalogFormError.hidden = true;
    catalogFormError.textContent = '';
  }
  setModalState();
}

function showFormError(message){
  if (!catalogFormError) return;
  catalogFormError.textContent = message;
  catalogFormError.hidden = false;
}

function saveCatalogItem(value){
  const clean = value.trim().replace(/\s+/g,' ');
  if (!clean) {
    showFormError('Escribe un nombre antes de guardar.');
    return false;
  }
  if (hasEquivalentDuplicate(catalogs,activeCatalogKey,clean,editingValue)) {
    showFormError('Ya existe un elemento igual o equivalente en este catálogo.');
    return false;
  }

  const result = editingValue !== null
    ? editCatalogItem(catalogs,activeCatalogKey,editingValue,clean)
    : addCatalogItem(catalogs,activeCatalogKey,clean);
  if (!result.ok) {
    showFormError(result.reason === 'duplicate'
      ? 'Ya existe un elemento igual o equivalente en este catálogo.'
      : 'No fue posible guardar el elemento.');
    return false;
  }
  showToast(editingValue !== null ? 'Elemento actualizado correctamente.' : 'Elemento agregado correctamente.');

  saveCatalogs(storage,catalogs);
  renderCatalog();
  syncRecipeCatalogControls();
  syncStage7Filters();
  renderActiveStage7View();
  closeCatalogModal();
  return true;
}

function openDeleteModal(value){
  if (!deleteModal) return;
  pendingDeleteValue = value;
  const definition = getActiveDefinition();
  deleteModalCopy.innerHTML = `Vas a borrar <strong>${escapeHtml(value)}</strong> de <strong>${escapeHtml(definition.label)}</strong>. Esta acción se guardará localmente.`;
  deleteModal.hidden = false;
  setModalState();
  requestAnimationFrame(() => deleteConfirmBtn?.focus());
}

function closeDeleteModal(){
  if (!deleteModal) return;
  deleteModal.hidden = true;
  pendingDeleteValue = null;
  setModalState();
}

function confirmDelete(){
  if (pendingDeleteValue === null) return;
  const result = deleteCatalogItem(catalogs,activeCatalogKey,pendingDeleteValue);
  if (result.ok) {
    saveCatalogs(storage,catalogs);
    renderCatalog();
    syncRecipeCatalogControls();
    syncStage7Filters();
    renderActiveStage7View();
    showToast('Elemento borrado correctamente.');
  }
  closeDeleteModal();
}

function showToast(message,{error=false}={}){
  if (!catalogToast) return;
  window.clearTimeout(toastTimer);
  catalogToast.textContent = message;
  catalogToast.classList.toggle('is-error',error);
  catalogToast.hidden = false;
  toastTimer = window.setTimeout(() => { catalogToast.hidden = true; },2600);
}

function switchCatalog(key){
  if (!CATALOG_DEFINITIONS[key]) return;
  activeCatalogKey = key;
  if (catalogSearch) catalogSearch.value = '';
  renderCatalog();
}


const photoDropzone = document.querySelector('.photo-dropzone');
let recipeFormInitialized = false;

function uniqueSorted(items){
  return [...new Set((items || []).filter(item => typeof item === 'string' && item.trim()).map(item => item.trim()))].sort(naturalCompare);
}

function setSelectOptions(select,items,placeholder,selectedValue = null){
  if (!select) return;
  const selected = selectedValue === null ? select.value : selectedValue;
  const values = uniqueSorted(items);
  select.innerHTML = `<option value="">${escapeHtml(placeholder)}</option>` + values.map(item => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join('');
  if (values.includes(selected)) select.value = selected;
  else select.value = '';
}

function selectedMultiValues(container){
  if (!container) return [];
  return [...container.querySelectorAll('input[type="checkbox"]:checked')].map(input => input.value);
}

function updateMultiSummary(container,summary,emptyLabel){
  if (!summary) return;
  const values = selectedMultiValues(container);
  if (!values.length) summary.textContent = emptyLabel;
  else if (values.length <= 2) summary.textContent = values.join(', ');
  else summary.textContent = `${values.length} seleccionadas`;
}

function renderMultiOptions(container,items,selectedValues = [],{disabledValue = null,summary = null,emptyLabel = 'Selecciona opciones'} = {}){
  if (!container) return;
  const selected = new Set(selectedValues);
  const values = uniqueSorted(items);
  container.innerHTML = values.map(item => {
    const disabled = disabledValue !== null && item === disabledValue;
    const checked = selected.has(item) && !disabled;
    return `<label class="multi-option${disabled ? ' is-disabled' : ''}"><input type="checkbox" value="${escapeHtml(item)}"${checked ? ' checked' : ''}${disabled ? ' disabled' : ''}><span>${escapeHtml(item)}</span></label>`;
  }).join('');
  updateMultiSummary(container,summary,emptyLabel);
}

function ingredientRowsDraft(){
  if (!ingredientsRows) return [];
  return [...ingredientsRows.querySelectorAll('.ingredient-row')].map(row => ({
    ingrediente: row.querySelector('[data-ingredient-name]')?.value || '',
    cantidad: row.querySelector('[data-ingredient-amount]')?.value || '',
    unidad: row.querySelector('[data-ingredient-unit]')?.value || ''
  }));
}

function makeOptions(items,selected,placeholder){
  const values = uniqueSorted(items);
  return `<option value="">${escapeHtml(placeholder)}</option>` + values.map(item => `<option value="${escapeHtml(item)}"${item === selected ? ' selected' : ''}>${escapeHtml(item)}</option>`).join('');
}

function syncIngredientUnitForAmount(row){
  if (!row) return;
  const amountInput = row.querySelector('[data-ingredient-amount]');
  const unitSelect = row.querySelector('[data-ingredient-unit]');
  if (!amountInput || !unitSelect) return;
  const raw = String(amountInput.value ?? '').trim();
  const isAlGusto = raw !== '' && Number(raw) === 0;
  if (isAlGusto) unitSelect.value = '';
  unitSelect.disabled = isAlGusto;
  unitSelect.setAttribute('aria-label',isAlGusto ? 'Unidad no necesaria: Al gusto' : 'Unidad');
}

function addIngredientRow(data = {}){
  if (!ingredientsRows) return;
  const row = document.createElement('div');
  row.className = 'ingredient-row';
  row.innerHTML = `
    <select data-ingredient-name aria-label="Ingrediente">${makeOptions(catalogs.ingredientes,data.ingrediente || '','Ingrediente')}</select>
    <input data-ingredient-amount type="number" inputmode="decimal" min="0" step="any" aria-label="Cantidad" placeholder="0" value="${escapeHtml(data.cantidad ?? '')}">
    <select data-ingredient-unit aria-label="Unidad">${makeOptions(catalogs.unidades,data.unidad || '','Unidad')}</select>
    <button class="row-delete" type="button" data-remove-ingredient aria-label="Eliminar ingrediente"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M9 7V4h6v3m2 0-1 13H8L7 7m3 4v5m4-5v5"/></svg></button>`;
  ingredientsRows.append(row);
  syncIngredientUnitForAmount(row);
}

function rebuildIngredientRows(rows = null){
  if (!ingredientsRows) return;
  const draft = rows || ingredientRowsDraft();
  ingredientsRows.innerHTML = '';
  const safeRows = draft.length ? draft : [{},{},{}];
  safeRows.forEach(addIngredientRow);
}

const ALCHEMY_PLACEHOLDERS = [
  'Enfría la copa.',
  'Agrega los ingredientes en la coctelera con hielo.',
  'Agita vigorosamente durante 10-15 segundos.',
  'Cuela en la copa fría.'
];

function addAlchemyStep(value = ''){
  if (!alchemySteps) return;
  const index = alchemySteps.children.length;
  const row = document.createElement('div');
  row.className = 'alchemy-step';
  row.innerHTML = `
    <span class="alchemy-number">${index + 1}</span>
    <input type="text" maxlength="280" data-alchemy-text aria-label="Paso ${index + 1} de ALQUIMIA" placeholder="${escapeHtml(ALCHEMY_PLACEHOLDERS[index] || 'Describe el siguiente paso...')}" value="${escapeHtml(value)}">
    <button class="row-delete" type="button" data-remove-alchemy aria-label="Eliminar paso ${index + 1}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M9 7V4h6v3m2 0-1 13H8L7 7m3 4v5m4-5v5"/></svg></button>`;
  alchemySteps.append(row);
  renumberAlchemySteps();
}

function renumberAlchemySteps(){
  if (!alchemySteps) return;
  [...alchemySteps.querySelectorAll('.alchemy-step')].forEach((row,index) => {
    const number = row.querySelector('.alchemy-number');
    const input = row.querySelector('[data-alchemy-text]');
    const remove = row.querySelector('[data-remove-alchemy]');
    if (number) number.textContent = String(index + 1);
    if (input) input.setAttribute('aria-label',`Paso ${index + 1} de ALQUIMIA`);
    if (remove) remove.setAttribute('aria-label',`Eliminar paso ${index + 1}`);
  });
}

function ensureAlchemySteps(){
  if (!alchemySteps || alchemySteps.children.length) return;
  for (let i = 0; i < 4; i += 1) addAlchemyStep('');
}

function updateSecondaryBaseAvailability(){
  if (!secondaryBasesOptions) return;
  const primary = recipeBasePrimary?.value || '';
  [...secondaryBasesOptions.querySelectorAll('input[type="checkbox"]')].forEach(input => {
    const disabled = Boolean(primary && input.value === primary);
    input.disabled = disabled;
    input.closest('.multi-option')?.classList.toggle('is-disabled',disabled);
    if (disabled) input.checked = false;
  });
  updateMultiSummary(secondaryBasesOptions,secondaryBasesSummary,'Selecciona bases (opcional)');
}

function populateNewRecipeHeaderFilter(){
  if (!newRecipeGlobalBaseFilter) return;
  const selected = newRecipeGlobalBaseFilter.value || 'all';
  newRecipeGlobalBaseFilter.innerHTML = '<option value="all">Todas las bases</option>' + uniqueSorted(catalogs.bases).map(item => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join('');
  newRecipeGlobalBaseFilter.value = [...newRecipeGlobalBaseFilter.options].some(option => option.value === selected) ? selected : 'all';
}

function syncRecipeCatalogControls(){
  if (!newRecipeForm) return;
  const currentIngredients = ingredientRowsDraft();
  const selectedSecondary = selectedMultiValues(secondaryBasesOptions);
  const selectedTechniques = selectedMultiValues(techniquesOptions);
  const selectedTags = selectedMultiValues(tagsOptions);

  setSelectOptions(recipeBasePrimary,catalogs.bases,'Selecciona la base');
  setSelectOptions(recipeCategory,catalogs.categorias,'Selecciona una categoría');
  setSelectOptions(recipeGlassware,catalogs.cristaleria,'Selecciona la cristalería');
  setSelectOptions(recipeGarnish,catalogs.decoraciones,'Selecciona una decoración');
  renderMultiOptions(secondaryBasesOptions,catalogs.bases,selectedSecondary,{disabledValue:recipeBasePrimary?.value || null,summary:secondaryBasesSummary,emptyLabel:'Selecciona bases (opcional)'});
  renderMultiOptions(techniquesOptions,catalogs.tecnicas,selectedTechniques,{summary:techniquesSummary,emptyLabel:'Selecciona técnicas'});
  renderMultiOptions(tagsOptions,catalogs.etiquetas,selectedTags,{summary:tagsSummary,emptyLabel:'Selecciona etiquetas'});
  populateNewRecipeHeaderFilter();

  if (recipeFormInitialized) rebuildIngredientRows(currentIngredients);
  updateSecondaryBaseAvailability();
}

function updateRecipeStatusVisual(){
  const wrap = recipeStatusDot?.closest('.state-select-wrap');
  if (wrap) wrap.dataset.state = recipeStatus?.value || 'En prueba';
}

function updateRecipeStorageNote(customMessage = ''){
  if (!recipeStorageNote) return;
  const count = recipes.length;
  recipeStorageNote.textContent = customMessage || `${count} ${count === 1 ? 'receta guardada' : 'recetas guardadas'} localmente · fotos optimizadas en almacenamiento local.`;
}

function clearRecipeValidation(){
  recipeFormError.hidden = true;
  recipeFormError.textContent = '';
  [recipeName,recipeBasePrimary,recipeCategory,recipeGlassware].forEach(field => field?.classList.remove('is-invalid'));
  ingredientsRows?.classList.remove('is-invalid');
  alchemySteps?.classList.remove('is-invalid');
}

function collectRecipeDraft(){
  return {
    nombre: recipeName?.value || '',
    basePrincipal: recipeBasePrimary?.value || '',
    basesSecundarias: selectedMultiValues(secondaryBasesOptions),
    categoria: recipeCategory?.value || '',
    cristaleria: recipeGlassware?.value || '',
    ingredientes: ingredientRowsDraft().map(row => ({
      ingrediente:row.ingrediente,
      cantidad:row.cantidad === '' ? null : Number(row.cantidad),
      unidad:row.unidad
    })),
    tecnicas:selectedMultiValues(techniquesOptions),
    alquimia:[...(alchemySteps?.querySelectorAll('[data-alchemy-text]') || [])].map((input,index) => ({orden:index + 1,texto:input.value})),
    decoracion:recipeGarnish?.value || '',
    etiquetas:selectedMultiValues(tagsOptions),
    notas:recipeNotes?.value || '',
    estado:recipeStatus?.value || 'En prueba'
  };
}

function showRecipeErrors(errors){
  if (!recipeFormError || !errors.length) return;
  recipeFormError.innerHTML = `<strong>Revisa la receta antes de guardar:</strong> ${errors.map(error => escapeHtml(error.message)).join(' ')}`;
  recipeFormError.hidden = false;
  errors.forEach(error => {
    if (error.field === 'recipeName') recipeName?.classList.add('is-invalid');
    if (error.field === 'recipeBasePrimary') recipeBasePrimary?.classList.add('is-invalid');
    if (error.field === 'recipeCategory') recipeCategory?.classList.add('is-invalid');
    if (error.field === 'recipeGlassware') recipeGlassware?.classList.add('is-invalid');
    if (error.field === 'ingredientsRows') ingredientsRows?.classList.add('is-invalid');
    if (error.field === 'alchemySteps') alchemySteps?.classList.add('is-invalid');
  });
  const first = errors[0]?.field;
  const focusTarget = first === 'ingredientsRows'
    ? ingredientsRows?.querySelector('select,input')
    : first === 'alchemySteps'
      ? alchemySteps?.querySelector('input')
      : document.getElementById(first);
  focusTarget?.focus();
}

function setPhotoProcessingState(isProcessing){
  photoProcessing = Boolean(isProcessing);
  recipePhotoPreview?.classList.toggle('is-processing',photoProcessing);
  document.querySelector('.photo-dropzone')?.classList.toggle('is-processing',photoProcessing);
  const saveButton = newRecipeForm?.querySelector('.recipe-save');
  if (saveButton) saveButton.disabled = photoProcessing;
  if (recipePhotoAddMore) recipePhotoAddMore.disabled = photoProcessing;
}

function releaseEditorPhotoUrls(){
  if (photoObjectUrl) URL.revokeObjectURL(photoObjectUrl);
  photoObjectUrl = null;
  editorPhotoObjectUrls.forEach(url=>URL.revokeObjectURL(url));
  editorPhotoObjectUrls = [];
}

function renderEditorPhotos(){
  releaseEditorPhotoUrls();
  const count = editorPhotoItems.length;
  if (recipePhotoCount) recipePhotoCount.textContent = `${count} ${count === 1 ? 'fotografía' : 'fotografías'}`;

  if (!count) {
    if (recipePhotoImage) {
      recipePhotoImage.removeAttribute('src');
      recipePhotoImage.hidden = true;
    }
    if (recipePhotoEmpty) recipePhotoEmpty.hidden = false;
    if (recipePhotoEdit) recipePhotoEdit.disabled = true;
    if (recipePhotoDelete) recipePhotoDelete.disabled = true;
    if (recipePhotoGallery) {
      recipePhotoGallery.innerHTML = '';
      recipePhotoGallery.hidden = true;
    }
    return;
  }

  const primary = editorPhotoItems[0];
  photoObjectUrl = URL.createObjectURL(primary.fullBlob);
  if (recipePhotoImage) {
    recipePhotoImage.src = photoObjectUrl;
    recipePhotoImage.hidden = false;
  }
  if (recipePhotoEmpty) recipePhotoEmpty.hidden = true;
  if (recipePhotoEdit) recipePhotoEdit.disabled = false;
  if (recipePhotoDelete) recipePhotoDelete.disabled = false;

  if (recipePhotoGallery) {
    const urls = editorPhotoItems.map(item=>{
      const url = URL.createObjectURL(item.thumbnailBlob instanceof Blob ? item.thumbnailBlob : item.fullBlob);
      editorPhotoObjectUrls.push(url);
      return url;
    });
    recipePhotoGallery.innerHTML = editorPhotoItems.map((item,index)=>`
      <div class="photo-gallery-item${index === 0 ? ' is-primary' : ''}" data-editor-photo-index="${index}">
        <img src="${escapeHtml(urls[index])}" alt="Fotografía ${index + 1} de la receta">
        ${index === 0 ? '<span class="photo-gallery-primary">Principal</span>' : ''}
        <button class="photo-gallery-delete" type="button" data-remove-editor-photo="${index}" aria-label="Eliminar fotografía ${index + 1}" title="Eliminar fotografía ${index + 1}">×</button>
      </div>`).join('');
    recipePhotoGallery.hidden = false;
  }
}

function releasePhotoPreview(){
  releaseEditorPhotoUrls();
  editorPhotoItems = [];
  editorPhotosDirty = false;
  photoInputMode = 'append';
  if (recipePhotoImage) {
    recipePhotoImage.removeAttribute('src');
    recipePhotoImage.hidden = true;
  }
  if (recipePhotoEmpty) recipePhotoEmpty.hidden = false;
  if (recipePhotoInput) recipePhotoInput.value = '';
  if (recipePhotoEdit) recipePhotoEdit.disabled = true;
  if (recipePhotoDelete) recipePhotoDelete.disabled = true;
  if (recipePhotoGallery) {
    recipePhotoGallery.innerHTML = '';
    recipePhotoGallery.hidden = true;
  }
  if (recipePhotoCount) recipePhotoCount.textContent = '0 fotografías';
}

async function setTemporaryPhotos(files,mode = photoInputMode){
  const selected = [...(files || [])].filter(file=>file instanceof Blob);
  const replacePrimary = mode === 'replace-primary' && editorPhotoItems.length > 0;
  if (!selected.length) return;
  setPhotoProcessingState(true);
  let added = 0;
  const failures = [];
  try {
    for (const file of selected) {
      try {
        const processed = await optimizeRecipePhoto(file);
        const entry = photoEntryFromProcessed(editingRecipeId || 'draft',processed);
        if (replacePrimary && added === 0) editorPhotoItems.splice(0,1,entry);
        else editorPhotoItems.push(entry);
        added += 1;
      } catch (error) {
        failures.push(error?.message || 'No fue posible preparar una fotografía.');
      }
    }
    if (added) {
      editorPhotosDirty = true;
      renderEditorPhotos();
      const totalBytes = editorPhotoItems.reduce((sum,item)=>sum + Number(item.fullBlob?.size || 0),0);
      showToast(replacePrimary
        ? `Fotografía principal actualizada${added > 1 ? ` y ${added - 1} adicional${added - 1 === 1 ? '' : 'es'} agregada${added - 1 === 1 ? '' : 's'}` : ''}.`
        : `${added} ${added === 1 ? 'fotografía lista' : 'fotografías listas'} · ${formatPhotoBytes(totalBytes)} optimizados en total.`);
    }
    if (failures.length) showToast(`${failures.length} ${failures.length === 1 ? 'imagen no pudo procesarse' : 'imágenes no pudieron procesarse'}. ${failures[0]}`,{error:true});
  } finally {
    if (recipePhotoInput) recipePhotoInput.value = '';
    photoInputMode = 'append';
    setPhotoProcessingState(false);
  }
}

function removeEditorPhoto(index){
  if (!Number.isInteger(index) || index < 0 || index >= editorPhotoItems.length) return;
  const isPrimary = index === 0;
  const message = isPrimary && editorPhotoItems.length > 1
    ? '¿Eliminar la fotografía principal? La siguiente pasará automáticamente a ser la nueva principal.'
    : '¿Eliminar esta fotografía de la receta?';
  if (!globalThis.confirm(message)) return;
  editorPhotoItems.splice(index,1);
  editorPhotosDirty = true;
  renderEditorPhotos();
  showToast(editorPhotoItems.length ? 'Fotografía eliminada de la edición.' : 'Todas las fotografías fueron retiradas. Se mostrará el placeholder.');
}

function resetRecipeForm(){
  if (!newRecipeForm) return;
  newRecipeForm.reset();
  [secondaryBasesOptions,techniquesOptions,tagsOptions].forEach(container => {
    container?.querySelectorAll('input[type="checkbox"]').forEach(input => { input.checked = false; });
  });
  if (recipeBasePrimary) recipeBasePrimary.value = '';
  if (recipeCategory) recipeCategory.value = '';
  if (recipeGlassware) recipeGlassware.value = '';
  if (recipeGarnish) recipeGarnish.value = '';
  clearRecipeValidation();
  syncRecipeCatalogControls();
  if (ingredientsRows) ingredientsRows.innerHTML = '';
  [{},{},{}].forEach(addIngredientRow);
  if (alchemySteps) alchemySteps.innerHTML = '';
  for (let i = 0; i < 4; i += 1) addAlchemyStep('');
  [document.getElementById('secondaryBasesPicker'),document.getElementById('techniquesPicker'),document.getElementById('tagsPicker')].forEach(details => { if (details) details.open = false; });
  releasePhotoPreview();
  updateRecipeStatusVisual();
  updateMultiSummary(secondaryBasesOptions,secondaryBasesSummary,'Selecciona bases (opcional)');
  updateMultiSummary(techniquesOptions,techniquesSummary,'Selecciona técnicas');
  updateMultiSummary(tagsOptions,tagsSummary,'Selecciona etiquetas');
  updateRecipeStorageNote();
}

function setRecipeEditorMode(isEditing){
  if (newRecipeTitle) newRecipeTitle.textContent = isEditing ? 'Editar Receta' : 'Nueva Receta';
  const label = recipeSaveButton?.querySelector('.recipe-save-label');
  if (label) label.textContent = isEditing ? 'Guardar cambios' : 'Guardar receta';
  if (recipeEditorBack) {
    recipeEditorBack.dataset.view = isEditing && activeRecipeId ? 'ficha-receta' : 'recetas';
    recipeEditorBack.setAttribute('aria-label',isEditing && activeRecipeId ? 'Volver a la ficha' : 'Volver a Recetas');
  }
}

async function showStoredPhotoInEditor(recipeId){
  try {
    const photos = await getRecipePhotos(recipeId);
    editorPhotoItems = photos.map(photo=>({
      photoId:photo.photoId,
      fullBlob:photo.fullBlob,
      thumbnailBlob:photo.thumbnailBlob,
      metadata:{...(photo.metadata || {})},
      createdAt:photo.createdAt || '',
      updatedAt:photo.updatedAt || ''
    }));
    editorPhotosDirty = false;
    renderEditorPhotos();
    return editorPhotoItems.length > 0;
  } catch {
    editorPhotoItems = [];
    editorPhotosDirty = false;
    renderEditorPhotos();
    return false;
  }
}

async function loadRecipeIntoEditor(recipe){
  if (!recipe || !newRecipeForm) return;
  recipeFormInitialized = true;
  clearRecipeValidation();
  syncRecipeCatalogControls();
  if (recipeName) recipeName.value = recipe.nombre || '';
  if (recipeBasePrimary) recipeBasePrimary.value = recipe.basePrincipal || '';
  if (recipeCategory) recipeCategory.value = recipe.categoria || '';
  if (recipeGlassware) recipeGlassware.value = recipe.cristaleria || '';
  if (recipeGarnish) recipeGarnish.value = recipe.decoracion || '';
  if (recipeNotes) recipeNotes.value = recipe.notas || '';
  if (recipeStatus) recipeStatus.value = recipe.estado || 'En prueba';
  renderMultiOptions(secondaryBasesOptions,catalogs.bases,recipe.basesSecundarias || [],{disabledValue:recipe.basePrincipal || null,summary:secondaryBasesSummary,emptyLabel:'Selecciona bases (opcional)'});
  renderMultiOptions(techniquesOptions,catalogs.tecnicas,recipe.tecnicas || [],{summary:techniquesSummary,emptyLabel:'Selecciona técnicas'});
  renderMultiOptions(tagsOptions,catalogs.etiquetas,recipe.etiquetas || [],{summary:tagsSummary,emptyLabel:'Selecciona etiquetas'});
  rebuildIngredientRows(recipe.ingredientes?.length ? recipe.ingredientes : [{},{},{}]);
  if (alchemySteps) alchemySteps.innerHTML = '';
  (recipe.alquimia?.length ? recipe.alquimia : [{texto:''}]).forEach(step => addAlchemyStep(step.texto || ''));
  updateSecondaryBaseAvailability();
  updateRecipeStatusVisual();
  releasePhotoPreview();
  if (recipe.foto || recipe.fotos?.length) await showStoredPhotoInEditor(recipe.id);
  else renderEditorPhotos();
  setRecipeEditorMode(true);
  updateRecipeStorageNote(`Editando “${recipe.nombre}” · los cambios conservarán el mismo registro.`);
  editorLoadedRecipeId = recipe.id;
}

function startNewRecipeEditor(){
  editingRecipeId = null;
  editorLoadedRecipeId = null;
  if (recipeFormInitialized) resetRecipeForm();
  setRecipeEditorMode(false);
  showView('nueva-receta');
}

function openRecipeEditor(recipeId){
  const recipe = recipes.find(item => item.id === recipeId);
  if (!recipe) {
    showToast('No fue posible editar esa receta.',{error:true});
    return;
  }
  editingRecipeId = recipe.id;
  activeRecipeId = recipe.id;
  editorLoadedRecipeId = null;
  showView('nueva-receta');
}

async function prepareNewRecipeView(){
  if (!newRecipeForm) return;
  if (editingRecipeId) {
    const recipe = recipes.find(item => item.id === editingRecipeId);
    if (!recipe) {
      editingRecipeId = null;
      editorLoadedRecipeId = null;
      showToast('La receta que intentabas editar ya no existe.',{error:true});
    } else if (editorLoadedRecipeId !== recipe.id) {
      await loadRecipeIntoEditor(recipe);
      return;
    } else {
      setRecipeEditorMode(true);
      syncRecipeCatalogControls();
      updateRecipeStatusVisual();
      return;
    }
  }

  setRecipeEditorMode(false);
  if (!recipeFormInitialized) {
    recipeFormInitialized = true;
    syncRecipeCatalogControls();
    rebuildIngredientRows([{},{},{}]);
    ensureAlchemySteps();
    releasePhotoPreview();
  } else {
    syncRecipeCatalogControls();
    if (!ingredientsRows?.children.length) rebuildIngredientRows([{},{},{}]);
    ensureAlchemySteps();
  }
  updateRecipeStatusVisual();
  updateRecipeStorageNote();
}

async function saveNewRecipe(event){
  event.preventDefault();
  if (photoProcessing) {
    showToast('Espera a que termine la optimización de la fotografía.',{error:true});
    return;
  }
  clearRecipeValidation();
  const clean = sanitizeRecipeDraft(collectRecipeDraft());
  const errors = validateRecipe(clean);
  if (errors.length) {
    showRecipeErrors(errors);
    showToast('Faltan datos obligatorios en la receta.',{error:true});
    return;
  }

  const existing = editingRecipeId ? recipes.find(item => item.id === editingRecipeId) : null;
  if (editingRecipeId && !existing) {
    showToast('La receta ya no existe y no puede actualizarse.',{error:true});
    return;
  }

  const now = new Date().toISOString();
  const record = existing
    ? sanitizeRecipeDraft({...existing,...clean,id:existing.id,createdAt:existing.createdAt || now,updatedAt:now,favorita:existing.favorita,foto:existing.foto,fotos:existing.fotos})
    : createRecipeRecord(clean);
  const mediaChanged = !existing || editorPhotosDirty;
  let previousMedia = null;
  let mediaWritten = false;

  try {
    if (mediaChanged) {
      if (existing) previousMedia = await getRecipePhotos(existing.id);
      if (editorPhotoItems.length) {
        await saveRecipePhotoCollection(record.id,editorPhotoItems);
        const references = buildPhotoReferences(record.id,editorPhotoItems,new Date(now));
        record.fotos = references;
        record.foto = references[0] || null;
      } else {
        await deleteRecipePhoto(record.id);
        record.fotos = [];
        record.foto = null;
      }
      mediaWritten = true;
    }

    recipes = existing
      ? saveRecipes(storage,recipes.map(item => item.id === record.id ? record : item))
      : saveRecipes(storage,[...recipes,record]);
  } catch (error) {
    if (mediaWritten) {
      try {
        if (existing && previousMedia?.length) await saveRecipePhotoCollection(existing.id,previousMedia);
        else await deleteRecipePhoto(record.id);
      } catch { /* rollback best effort */ }
    }
    showToast(error?.message || (existing ? 'No fue posible actualizar la receta.' : 'No fue posible guardar la receta.'),{error:true});
    return;
  }

  const wasEditing = Boolean(existing);
  const savedPhotoCount = record.fotos?.length || 0;
  editingRecipeId = null;
  editorLoadedRecipeId = null;
  showToast(wasEditing
    ? `Receta actualizada correctamente${savedPhotoCount ? ` · ${savedPhotoCount} ${savedPhotoCount === 1 ? 'fotografía' : 'fotografías'}.` : ' · sin fotografías.'}`
    : (savedPhotoCount ? `Receta guardada con ${savedPhotoCount} ${savedPhotoCount === 1 ? 'fotografía' : 'fotografías'}.` : 'Receta guardada correctamente.'));
  resetRecipeForm();
  updateRecipeStorageNote();
  if (wasEditing) openRecipeDetail(record.id,{replaceHash:true});
  else showView('recetas');
}

function updateClock(){
  if (!sidebarTime) return;
  const now = new Date();
  sidebarTime.textContent = new Intl.DateTimeFormat('es-NI',{hour:'numeric',minute:'2-digit',hour12:false}).format(now);
}

function routeFromHash(){
  const requested = location.hash.replace(/^#/,'') || 'inicio';
  if (requested.startsWith('ficha-receta/')) {
    const encodedId = requested.slice('ficha-receta/'.length);
    let recipeId = encodedId;
    try { recipeId = decodeURIComponent(encodedId); } catch { /* use raw id */ }
    if (recipes.some(recipe => recipe.id === recipeId)) {
      activeRecipeId = recipeId;
      showView('ficha-receta',{updateHash:false});
      return;
    }
    showView('recetas',{updateHash:false});
    return;
  }
  showView(requested,{updateHash:false});
}

document.addEventListener('click',event => {
  const viewButton = event.target.closest('[data-view]');
  if (viewButton){
    if (viewButton.dataset.view === 'nueva-receta') {
      startNewRecipeEditor();
      return;
    }
    if (viewButton.dataset.view === 'ficha-receta' && activeRecipeId) {
      openRecipeDetail(activeRecipeId);
      return;
    }
    navigate(viewButton.dataset.view);
    return;
  }

  const catalogTab = event.target.closest('[data-catalog-key]');
  if (catalogTab){
    switchCatalog(catalogTab.dataset.catalogKey);
    return;
  }

  const editCatalog = event.target.closest('[data-edit-catalog]');
  if (editCatalog){
    openCatalogModal(decodeURIComponent(editCatalog.dataset.editCatalog));
    return;
  }

  const deleteCatalog = event.target.closest('[data-delete-catalog]');
  if (deleteCatalog){
    openDeleteModal(decodeURIComponent(deleteCatalog.dataset.deleteCatalog));
    return;
  }

  if (event.target.closest('[data-close-catalog-modal]')) {
    closeCatalogModal();
    return;
  }

  if (event.target.closest('[data-close-delete-modal]')) {
    closeDeleteModal();
    return;
  }

  if (event.target.closest('[data-close-recipe-delete]')) {
    closeRecipeDeleteModal();
    return;
  }

  if (event.target.closest('[data-close-recipe-export]')) {
    closeRecipeExportModal();
    return;
  }

  const toggle = event.target.closest('[data-toggle-base]');
  if (toggle){
    const base = toggle.dataset.toggleBase;
    if (COLLAPSED.has(base)) COLLAPSED.delete(base); else COLLAPSED.add(base);
    renderRecipes();
    return;
  }

  const favorite = event.target.closest('[data-favorite]');
  if (favorite){
    const id = favorite.dataset.favorite;
    if (FAVORITES.has(id)) FAVORITES.delete(id); else FAVORITES.add(id);
    renderRecipes();
    return;
  }

  const selectRecipe = event.target.closest('[data-select-recipe]');
  if (selectRecipe){
    toggleRecipeSelection(selectRecipe.dataset.selectRecipe,selectRecipe.checked);
    return;
  }

  const galleryShift = event.target.closest('[data-gallery-shift]');
  if (galleryShift){
    event.preventDefault();
    event.stopPropagation();
    shiftGallery(galleryShift.closest('[data-recipe-gallery]'),Number(galleryShift.dataset.galleryShift || 0));
    return;
  }

  const openPhotoViewer = event.target.closest('[data-open-photo-viewer]');
  if (openPhotoViewer){
    event.preventDefault();
    event.stopPropagation();
    const gallery = openPhotoViewer.closest('[data-recipe-gallery]');
    const index = Number(gallery?.dataset.galleryIndex || 0);
    void openPhotoLightbox(openPhotoViewer.dataset.openPhotoViewer,index,openPhotoViewer);
    return;
  }

  const lightboxShift = event.target.closest('[data-lightbox-shift]');
  if (lightboxShift){
    event.preventDefault();
    event.stopPropagation();
    shiftPhotoLightbox(Number(lightboxShift.dataset.lightboxShift || 0));
    return;
  }

  if (event.target.closest('[data-close-photo-viewer]')) {
    closePhotoLightbox();
    return;
  }

  const openSavedRecipe = event.target.closest('[data-open-saved-recipe]');
  if (openSavedRecipe){
    openRecipeDetail(openSavedRecipe.dataset.openSavedRecipe);
    return;
  }

  const toggleSavedFavorite = event.target.closest('[data-toggle-recipe-favorite]');
  if (toggleSavedFavorite){
    toggleRecipeFavorite(toggleSavedFavorite.dataset.toggleRecipeFavorite);
    return;
  }

  const exportRecipeButton = event.target.closest('[data-export-recipe]');
  if (exportRecipeButton){
    openRecipeExportModal(exportRecipeButton.dataset.exportRecipe);
    return;
  }

  const editRecipe = event.target.closest('[data-edit-recipe]');
  if (editRecipe){
    openRecipeEditor(editRecipe.dataset.editRecipe);
    return;
  }

  const duplicateRecipeButton = event.target.closest('[data-duplicate-recipe]');
  if (duplicateRecipeButton){
    void duplicateRecipe(duplicateRecipeButton.dataset.duplicateRecipe);
    return;
  }

  const deleteRecipeButton = event.target.closest('[data-delete-recipe]');
  if (deleteRecipeButton){
    openRecipeDeleteModal(deleteRecipeButton.dataset.deleteRecipe);
    return;
  }

  const toggleLibraryBase = event.target.closest('[data-toggle-library-base]');
  if (toggleLibraryBase){
    const base = toggleLibraryBase.dataset.toggleLibraryBase;
    if (COLLAPSED_LIBRARY_BASES.has(base)) COLLAPSED_LIBRARY_BASES.delete(base); else COLLAPSED_LIBRARY_BASES.add(base);
    void renderBaseLibrary();
    return;
  }


  const changeSavedPhoto = event.target.closest('[data-change-saved-photo]');
  if (changeSavedPhoto){
    savedPhotoTargetId = changeSavedPhoto.dataset.changeSavedPhoto || null;
    if (savedRecipePhotoInput) {
      savedRecipePhotoInput.value = '';
      savedRecipePhotoInput.click();
    }
    return;
  }

  const deleteSavedPhoto = event.target.closest('[data-delete-saved-photo]');
  if (deleteSavedPhoto){
    void removeSavedRecipePhoto(deleteSavedPhoto.dataset.deleteSavedPhoto);
    return;
  }

  const openRecipe = event.target.closest('[data-open-recipe]');
  if (openRecipe) {
    const saved = recipes.find(recipe => recipe.id === openRecipe.dataset.openRecipe);
    if (saved) openRecipeDetail(saved.id); else navigate('recetas');
  }
});

catalogForm?.addEventListener('submit',event => {
  event.preventDefault();
  saveCatalogItem(catalogNameInput?.value || '');
});
catalogSearch?.addEventListener('input',renderCatalog);
catalogAddBtn?.addEventListener('click',()=>openCatalogModal());
catalogInlineAdd?.addEventListener('click',()=>openCatalogModal());
catalogModalClose?.addEventListener('click',closeCatalogModal);
catalogCancelBtn?.addEventListener('click',closeCatalogModal);
deleteModalClose?.addEventListener('click',closeDeleteModal);
deleteCancelBtn?.addEventListener('click',closeDeleteModal);
deleteConfirmBtn?.addEventListener('click',confirmDelete);
recipeDeleteModalClose?.addEventListener('click',closeRecipeDeleteModal);
recipeDeleteCancelBtn?.addEventListener('click',closeRecipeDeleteModal);
recipeDeleteConfirmBtn?.addEventListener('click',()=>void confirmRecipeDelete());
recipeExportModalClose?.addEventListener('click',closeRecipeExportModal);
recipeExportCancelBtn?.addEventListener('click',closeRecipeExportModal);
recipeLibraryExportBtn?.addEventListener('click',()=>openRecipeExportModal(null,{scope:selectedRecipeIds.size ? 'selected' : 'all'}));
recipeSelectionCancelBtn?.addEventListener('click',cancelRecipeSelectionMode);
recipeSelectionExportBtn?.addEventListener('click',()=>{
  if (!selectedRecipeIds.size) { showToast('Marca al menos una receta.',{error:true}); return; }
  openRecipeExportModal(null,{scope:'selected'});
});
recipeExportModal?.addEventListener('click',event => {
  const scopeButton = event.target.closest('[data-export-scope]');
  if (scopeButton) {
    selectExportScope(scopeButton.dataset.exportScope);
    return;
  }
  const formatButton = event.target.closest('[data-export-format]');
  if (!formatButton) return;
  void runRecipeExport(formatButton.dataset.exportFormat);
});

newRecipeForm?.addEventListener('submit',saveNewRecipe);
addIngredientBtn?.addEventListener('click',()=>addIngredientRow({}));
addAlchemyBtn?.addEventListener('click',()=>addAlchemyStep(''));
recipeBasePrimary?.addEventListener('change',updateSecondaryBaseAvailability);
recipeStatus?.addEventListener('change',updateRecipeStatusVisual);
secondaryBasesOptions?.addEventListener('change',()=>updateMultiSummary(secondaryBasesOptions,secondaryBasesSummary,'Selecciona bases (opcional)'));
techniquesOptions?.addEventListener('change',()=>updateMultiSummary(techniquesOptions,techniquesSummary,'Selecciona técnicas'));
tagsOptions?.addEventListener('change',()=>updateMultiSummary(tagsOptions,tagsSummary,'Selecciona etiquetas'));
ingredientsRows?.addEventListener('input',event => {
  const amount = event.target.closest('[data-ingredient-amount]');
  if (!amount) return;
  syncIngredientUnitForAmount(amount.closest('.ingredient-row'));
});
ingredientsRows?.addEventListener('change',event => {
  const amount = event.target.closest('[data-ingredient-amount]');
  if (!amount) return;
  syncIngredientUnitForAmount(amount.closest('.ingredient-row'));
});
ingredientsRows?.addEventListener('click',event => {
  const remove = event.target.closest('[data-remove-ingredient]');
  if (!remove) return;
  remove.closest('.ingredient-row')?.remove();
});
alchemySteps?.addEventListener('click',event => {
  const remove = event.target.closest('[data-remove-alchemy]');
  if (!remove) return;
  remove.closest('.alchemy-step')?.remove();
  renumberAlchemySteps();
});
recipePhotoInput?.addEventListener('change',event => void setTemporaryPhotos(event.target.files,photoInputMode));
savedRecipePhotoInput?.addEventListener('change',event => {
  const file = event.target.files?.[0];
  if (savedPhotoTargetId && file) void replaceSavedRecipePhoto(savedPhotoTargetId,file);
});
recipePhotoEdit?.addEventListener('click',()=>{ photoInputMode = 'replace-primary'; recipePhotoInput?.click(); });
recipePhotoAddMore?.addEventListener('click',()=>{ photoInputMode = 'append'; recipePhotoInput?.click(); });
recipePhotoDelete?.addEventListener('click',()=>removeEditorPhoto(0));
recipePhotoGallery?.addEventListener('click',event=>{
  const remove = event.target.closest('[data-remove-editor-photo]');
  if (!remove) return;
  removeEditorPhoto(Number(remove.dataset.removeEditorPhoto));
});
photoDropzone?.addEventListener('click',()=>{ photoInputMode = 'append'; });
photoDropzone?.addEventListener('dragover',event => { event.preventDefault(); photoDropzone.classList.add('is-dragging'); });
photoDropzone?.addEventListener('dragleave',()=>photoDropzone.classList.remove('is-dragging'));
photoDropzone?.addEventListener('drop',event => {
  event.preventDefault();
  photoDropzone.classList.remove('is-dragging');
  photoInputMode = 'append';
  void setTemporaryPhotos(event.dataTransfer?.files,'append');
});

recipeSearch?.addEventListener('input',renderRecipes);
baseFilter?.addEventListener('change',renderRecipes);
libraryRecipeSearch?.addEventListener('input',()=>void renderRecipesLibrary());
librarySort?.addEventListener('change',()=>void renderRecipesLibrary());
libraryBaseFilter?.addEventListener('change',()=>void renderRecipesLibrary());
libraryCategoryFilter?.addEventListener('change',()=>void renderRecipesLibrary());
baseLibrarySearch?.addEventListener('input',()=>void renderBaseLibrary());
baseLibraryFilter?.addEventListener('change',()=>void renderBaseLibrary());
favoritesSearch?.addEventListener('input',()=>void renderFavorites());
favoritesBaseFilter?.addEventListener('change',()=>void renderFavorites());
mobileMenu?.addEventListener('click',()=> sidebar?.classList.contains('is-open') ? closeSidebar() : openSidebar());
backdrop?.addEventListener('click',closeSidebar);
window.addEventListener('keydown',event=>{
  if (photoLightbox && !photoLightbox.hidden) {
    if (event.key === 'ArrowLeft') { event.preventDefault(); shiftPhotoLightbox(-1); return; }
    if (event.key === 'ArrowRight') { event.preventDefault(); shiftPhotoLightbox(1); return; }
    if (event.key === 'Escape') { event.preventDefault(); closePhotoLightbox(); return; }
    return;
  }
  if(event.key !== 'Escape') return;
  if (recipeExportModal && !recipeExportModal.hidden) { closeRecipeExportModal(); return; }
  if (recipeDeleteModal && !recipeDeleteModal.hidden) { closeRecipeDeleteModal(); return; }
  if (deleteModal && !deleteModal.hidden) { closeDeleteModal(); return; }
  if (catalogModal && !catalogModal.hidden) { closeCatalogModal(); return; }
  closeSidebar();
});
window.addEventListener('resize',()=>{if(window.innerWidth > 900) closeSidebar();});
window.addEventListener('hashchange',routeFromHash);
window.addEventListener('popstate',routeFromHash);
document.addEventListener('error',event => {
  const img = event.target;
  if (!(img instanceof HTMLImageElement)) return;
  const gallery = img.closest('[data-recipe-gallery]');
  if (gallery) {
    gallery.classList.add('is-broken');
    return;
  }
  if (img === photoLightboxImage && photoLightbox && !photoLightbox.hidden) {
    photoLightbox.classList.add('is-broken');
    img.hidden = true;
    if (photoLightboxFallback) photoLightboxFallback.hidden = false;
  }
},true);

window.addEventListener('beforeunload',()=>{
  releaseEditorPhotoUrls();
  releaseDetailPhotoUrl();
  releaseLightboxUrls();
  revokeSavedRecipeThumbUrls();
});

initSettings();
populateBaseFilter();
syncStage7Filters();
renderRecipes();
renderCatalog();
updateClock();
setInterval(updateClock,30000);
routeFromHash();
