import { storage } from './storage.js';
import { CATALOG_DEFINITIONS, loadCatalogs, saveCatalogs } from './catalog.js';
import { loadRecipes, saveRecipes, sanitizeRecipeDraft } from './recipes.js';
import { MIXER_HISTORY_KEY, loadMixerHistory, saveMixerHistory, normalizeMixerHistory } from './mixer-history.js';
import {
  listRecipePhotos, replaceAllRecipePhotos, processRecipePhotoDataUrl,
  recipePhotoRecordFromEntries, photoEntryFromProcessed, buildPhotoReferences
} from './media.js';

export const APP_VERSION = '1.21.0';
export const BACKUP_SCHEMA_VERSION = 1;
const SETTINGS_KEY = 'settings.v1';
const RUNTIME_KEY = 'runtime.pwa.v1';
const MAX_BACKUP_BYTES = 80 * 1024 * 1024;

const $ = id => document.getElementById(id);
const elements = {};
let installPromptEvent = null;
let swRegistration = null;
let pendingRestore = null;
let initialized = false;
let applyingUpdate = false;

function cacheElements(){
  [
    'pwaInstallStatus','pwaSwStatus','pwaCurrentVersion','pwaLastSearch','pwaLastUpdate',
    'pwaUpdateState','pwaUpdateTitle','pwaUpdateCopy','pwaApplyUpdate','pwaCheckUpdate',
    'pwaInstallApp','pwaActionStatus','exportBackupBtn','backupExportStatus','selectBackupBtn',
    'restoreBackupInput','backupRestoreStatus','clearLocalDataBtn','clearDataStatus',
    'restoreConfirmModal','restoreConfirmClose','restoreConfirmCopy','restoreSummary','restoreCancelBtn',
    'restoreConfirmBtn','clearDataModal','clearDataModalClose','clearDataConfirmInput','clearDataCancelBtn',
    'clearDataConfirmBtn'
  ].forEach(id => { elements[id] = $(id); });
}

function setStatus(element,message,type=''){
  if (!element) return;
  element.textContent = message || '';
  element.classList.remove('is-success','is-error','is-working');
  if (type) element.classList.add(`is-${type}`);
}

function formatDateTime(value){
  if (!value) return 'Nunca';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Nunca';
  return new Intl.DateTimeFormat('es-NI',{
    day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false
  }).format(date).replace(',', ' ·');
}

function runtimeState(){
  const value = storage.get(RUNTIME_KEY,{});
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function patchRuntime(patch){
  const next = {...runtimeState(),...patch};
  storage.set(RUNTIME_KEY,next);
  renderRuntime();
  return next;
}

function isStandalone(){
  return window.matchMedia?.('(display-mode: standalone)')?.matches === true
    || window.navigator.standalone === true;
}

function renderRuntime(){
  const runtime = runtimeState();
  if (elements.pwaCurrentVersion) elements.pwaCurrentVersion.textContent = `v${APP_VERSION}`;
  if (elements.pwaLastSearch) elements.pwaLastSearch.textContent = formatDateTime(runtime.lastSearchAt);
  if (elements.pwaLastUpdate) elements.pwaLastUpdate.textContent = formatDateTime(runtime.lastUpdateAt);
  if (elements.pwaInstallStatus) {
    const installed = isStandalone();
    elements.pwaInstallStatus.textContent = installed ? 'Instalada' : (installPromptEvent ? 'Disponible' : 'En navegador');
    elements.pwaInstallStatus.closest('.status-row')?.classList.toggle('is-success',installed);
  }
  if (elements.pwaInstallApp) elements.pwaInstallApp.hidden = !installPromptEvent || isStandalone();
}

function renderSwStatus(text,tone=''){
  if (!elements.pwaSwStatus) return;
  elements.pwaSwStatus.textContent = text;
  const row = elements.pwaSwStatus.closest('.status-row');
  row?.classList.remove('is-success','is-warning','is-error');
  if (tone) row?.classList.add(`is-${tone}`);
}

function renderUpdateState({available=false,version='',message=''}={}){
  if (!elements.pwaUpdateState) return;
  elements.pwaUpdateState.classList.toggle('has-update',available);
  if (elements.pwaUpdateTitle) elements.pwaUpdateTitle.textContent = available
    ? `Hay una nueva versión disponible${version ? ` · v${version}` : ''}`
    : 'Tu versión está al día';
  if (elements.pwaUpdateCopy) elements.pwaUpdateCopy.textContent = message || (available
    ? 'La actualización está preparada y mantendrá tus datos locales.'
    : 'Puedes buscar una versión nueva cuando quieras.');
  if (elements.pwaApplyUpdate) elements.pwaApplyUpdate.hidden = !available;
}

function compareVersions(a,b){
  const parse = value => String(value || '').replace(/^v/i,'').split('.').map(part => Number.parseInt(part,10) || 0);
  const aa=parse(a), bb=parse(b), len=Math.max(aa.length,bb.length);
  for (let i=0;i<len;i+=1){
    const diff=(aa[i]||0)-(bb[i]||0);
    if (diff) return diff;
  }
  return 0;
}

async function getRegistration(){
  if (!('serviceWorker' in navigator)) return null;
  if (swRegistration) return swRegistration;
  try {
    swRegistration = await navigator.serviceWorker.register('./service-worker.js',{scope:'./',updateViaCache:'none'});
    renderSwStatus(navigator.serviceWorker.controller ? 'Activo' : 'Registrado','success');
    return swRegistration;
  } catch (error) {
    renderSwStatus('No disponible','error');
    throw error;
  }
}

function waitForWaiting(registration,timeout=6500){
  if (registration?.waiting) return Promise.resolve(registration.waiting);
  return new Promise(resolve => {
    let done=false;
    const finish = worker => { if(done) return; done=true; clearTimeout(timer); resolve(worker || registration?.waiting || null); };
    const inspect = () => {
      const worker=registration?.installing;
      if (!worker) return;
      worker.addEventListener('statechange',()=>{
        if (worker.state === 'installed') finish(registration.waiting || worker);
        if (worker.state === 'redundant') finish(null);
      });
    };
    registration?.addEventListener('updatefound',inspect,{once:true});
    inspect();
    const timer=setTimeout(()=>finish(registration?.waiting || null),timeout);
  });
}

async function fetchRemoteVersion(){
  const response = await fetch(`./app-version.json?check=${Date.now()}`,{cache:'no-store',headers:{'Cache-Control':'no-cache'}});
  if (!response.ok) throw new Error(`No se pudo consultar la versión (${response.status}).`);
  const payload = await response.json();
  if (!payload || typeof payload.version !== 'string') throw new Error('La información de versión no es válida.');
  return payload;
}

async function checkForUpdates(){
  setStatus(elements.pwaActionStatus,'Buscando una versión nueva…','working');
  if (elements.pwaCheckUpdate) elements.pwaCheckUpdate.disabled = true;
  try {
    const registration = await getRegistration();
    const metadata = await fetchRemoteVersion();
    if (registration) await registration.update();
    patchRuntime({lastSearchAt:new Date().toISOString()});

    const newer = compareVersions(metadata.version,APP_VERSION) > 0;
    if (!newer) {
      renderUpdateState({available:false,message:'No hay una versión más reciente publicada.'});
      setStatus(elements.pwaActionStatus,'Búsqueda completada: la app está actualizada.','success');
      return;
    }

    const waiting = registration ? await waitForWaiting(registration) : null;
    if (waiting || registration?.waiting) {
      renderUpdateState({available:true,version:metadata.version,message:metadata.notes || 'Actualización preparada. Tus datos locales se conservarán.'});
      setStatus(elements.pwaActionStatus,'Actualización lista para aplicar.','success');
    } else {
      renderUpdateState({available:false,message:`Se detectó v${metadata.version}, pero el navegador aún no terminó de preparar el Service Worker. Vuelve a buscar en unos segundos.`});
      setStatus(elements.pwaActionStatus,'Nueva versión detectada; preparación pendiente.','working');
    }
  } catch (error) {
    setStatus(elements.pwaActionStatus,error?.message || 'No fue posible buscar actualizaciones.','error');
  } finally {
    if (elements.pwaCheckUpdate) elements.pwaCheckUpdate.disabled = false;
  }
}

async function applyUpdate(){
  if (applyingUpdate) return;
  applyingUpdate = true;
  if (elements.pwaApplyUpdate) elements.pwaApplyUpdate.disabled = true;
  setStatus(elements.pwaActionStatus,'Aplicando actualización…','working');
  try {
    const registration = await getRegistration();
    const waiting = registration?.waiting || await waitForWaiting(registration,3000);
    if (!waiting) throw new Error('La actualización todavía no está lista. Usa “Buscar actualizaciones” nuevamente.');

    const changed = new Promise((resolve,reject) => {
      const timer=setTimeout(()=>reject(new Error('El navegador no confirmó el cambio de versión.')),7000);
      navigator.serviceWorker.addEventListener('controllerchange',()=>{ clearTimeout(timer); resolve(); },{once:true});
    });
    waiting.postMessage({type:'SKIP_WAITING'});
    await changed;
    patchRuntime({lastUpdateAt:new Date().toISOString()});
    setStatus(elements.pwaActionStatus,'Actualización aplicada. Recargando…','success');
    location.reload();
  } catch (error) {
    setStatus(elements.pwaActionStatus,error?.message || 'No fue posible aplicar la actualización.','error');
    if (elements.pwaApplyUpdate) elements.pwaApplyUpdate.disabled = false;
    applyingUpdate = false;
  }
}

async function installApp(){
  if (!installPromptEvent) return;
  const prompt = installPromptEvent;
  installPromptEvent = null;
  try {
    await prompt.prompt();
    const result = await prompt.userChoice;
    renderRuntime();
    setStatus(elements.pwaActionStatus,result?.outcome === 'accepted' ? 'Instalación solicitada al navegador.' : 'Instalación cancelada.',result?.outcome === 'accepted' ? 'success' : '');
  } catch (error) {
    renderRuntime();
    setStatus(elements.pwaActionStatus,error?.message || 'No fue posible iniciar la instalación desde este navegador.','error');
  }
}

function blobToDataUrl(blob){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(String(reader.result));
    reader.onerror=()=>reject(reader.error || new Error('No fue posible incorporar una fotografía al respaldo.'));
    reader.readAsDataURL(blob);
  });
}

function safeSettings(){
  const value=storage.get(SETTINGS_KEY,{});
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

async function buildBackup(){
  const recipes=loadRecipes(storage);
  const catalogs=loadCatalogs(storage);
  const photoRecords=await listRecipePhotos();
  const recipeIds=new Set(recipes.map(recipe=>recipe.id));
  const media=[];
  for (const record of photoRecords) {
    const recipeId=String(record.recipeId||'');
    if (!recipeIds.has(recipeId)) continue;
    const photos=Array.isArray(record.photos) ? record.photos : [];
    for (let index=0; index<photos.length; index+=1) {
      const photo=photos[index];
      if (!(photo.fullBlob instanceof Blob)) continue;
      media.push({
        recipeId,
        photoId:String(photo.photoId||`legacy-${recipeId}-${index+1}`),
        position:index+1,
        mime:photo.fullBlob.type || 'application/octet-stream',
        bytes:photo.fullBlob.size,
        dataUrl:await blobToDataUrl(photo.fullBlob)
      });
    }
  }
  return {
    app:'Barra de El Ágora del Sir',
    schemaVersion:BACKUP_SCHEMA_VERSION,
    appVersion:APP_VERSION,
    createdAt:new Date().toISOString(),
    data:{
      recipes,
      catalogs,
      favoritas:recipes.filter(recipe=>recipe.favorita).map(recipe=>recipe.id),
      configuracion:safeSettings(),
      mixerHistorico:loadMixerHistory(storage)
    },
    media:{strategy:'embedded-optimized-full-v2',photos:media}
  };
}

function downloadJson(payload){
  const text=JSON.stringify(payload,null,2);
  const blob=new Blob([text],{type:'application/json;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const now=new Date();
  const stamp=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const anchor=document.createElement('a');
  anchor.href=url;
  anchor.download=`Barra Ágora Respaldo ${stamp}.json`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  return blob.size;
}

async function exportBackup(){
  if (elements.exportBackupBtn) elements.exportBackupBtn.disabled=true;
  setStatus(elements.backupExportStatus,'Preparando respaldo y fotografías…','working');
  try {
    const payload=await buildBackup();
    const bytes=downloadJson(payload);
    setStatus(elements.backupExportStatus,`Respaldo creado correctamente · ${payload.data.recipes.length} recetas · ${payload.data.mixerHistorico.length} cálculos Mixer · ${payload.media.photos.length} fotografías · ${formatBytes(bytes)}.`,'success');
  } catch (error) {
    setStatus(elements.backupExportStatus,error?.message || 'No fue posible crear el respaldo.','error');
  } finally {
    if (elements.exportBackupBtn) elements.exportBackupBtn.disabled=false;
  }
}

function formatBytes(bytes){
  if (!Number.isFinite(bytes) || bytes < 1024) return `${Math.max(0,bytes||0)} B`;
  if (bytes < 1024*1024) return `${(bytes/1024).toFixed(1)} KB`;
  return `${(bytes/(1024*1024)).toFixed(1)} MB`;
}

function validateCatalogs(catalogs){
  if (!catalogs || typeof catalogs !== 'object' || Array.isArray(catalogs)) throw new Error('El catálogo del respaldo no es válido.');
  const clean={};
  for (const key of Object.keys(CATALOG_DEFINITIONS)) {
    if (!Array.isArray(catalogs[key])) throw new Error(`Falta el catálogo “${CATALOG_DEFINITIONS[key].label}”.`);
    if (catalogs[key].length > 2000) throw new Error('Un catálogo excede el límite seguro.');
    clean[key]=catalogs[key].map(value=>String(value||'').trim()).filter(Boolean);
    if (clean[key].length !== catalogs[key].length) throw new Error(`El catálogo “${CATALOG_DEFINITIONS[key].label}” contiene valores inválidos.`);
  }
  return clean;
}

function validateBackup(payload){
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('El archivo no contiene un respaldo JSON válido.');
  if (payload.app !== 'Barra de El Ágora del Sir') throw new Error('Este JSON no pertenece a Barra de El Ágora del Sir.');
  const schema = Number(payload.schemaVersion ?? 1);
  if (schema !== BACKUP_SCHEMA_VERSION) throw new Error(`Versión de respaldo incompatible. Se requiere esquema ${BACKUP_SCHEMA_VERSION}.`);
  if (!payload.data || typeof payload.data !== 'object' || Array.isArray(payload.data)) throw new Error('El respaldo no contiene el bloque de datos requerido.');
  if (!Array.isArray(payload.data.recipes)) throw new Error('El respaldo no contiene una lista válida de recetas.');
  if (payload.data.recipes.length > 5000) throw new Error('El respaldo contiene demasiadas recetas para una restauración segura.');

  const ids=new Set();
  const recipes=payload.data.recipes.map(raw=>{
    const recipe=sanitizeRecipeDraft(raw);
    if (!recipe.id || !recipe.nombre) throw new Error('Una receta del respaldo no tiene identificador o nombre válido.');
    if (ids.has(recipe.id)) throw new Error(`El respaldo contiene un identificador de receta duplicado: ${recipe.id}.`);
    ids.add(recipe.id);
    return {...recipe,foto:null,fotos:[]};
  });
  const catalogs=validateCatalogs(payload.data.catalogs);

  // Respaldos antiguos podían depender solo de recipe.favorita y no traer data.favoritas.
  const favoritas=Array.isArray(payload.data.favoritas)
    ? payload.data.favoritas.map(String)
    : payload.data.recipes.map(raw=>sanitizeRecipeDraft(raw)).filter(recipe=>recipe.favorita).map(recipe=>recipe.id);
  if (favoritas.some(id=>!ids.has(id))) throw new Error('El respaldo contiene una favorita que no corresponde a una receta.');
  const favoriteSet=new Set(favoritas);
  recipes.forEach(recipe=>{ recipe.favorita=favoriteSet.has(recipe.id); });

  const config=payload.data.configuracion && typeof payload.data.configuracion === 'object' && !Array.isArray(payload.data.configuracion)
    ? payload.data.configuracion : {};

  // Compatibilidad: respaldos anteriores a Mixer Histórico no traen esta colección.
  // En ese caso la restauración continúa normalmente con histórico vacío.
  const mixerHistory=normalizeMixerHistory(payload.data.mixerHistorico ?? []);

  // Compatibilidad: v2 actual usa media.photos; respaldos de una foto podían omitir photoId/position.
  // También se acepta un bloque media como arreglo o media.recipePhotos si proviene de una variante anterior.
  let photos=[];
  if (Array.isArray(payload.media)) photos=payload.media;
  else if (Array.isArray(payload.media?.photos)) photos=payload.media.photos;
  else if (Array.isArray(payload.media?.recipePhotos)) photos=payload.media.recipePhotos;
  else if (payload.media == null) photos=[];
  else if (payload.media && typeof payload.media === 'object' && !Object.hasOwn(payload.media,'photos') && !Object.hasOwn(payload.media,'recipePhotos')) photos=[];
  else throw new Error('El bloque de fotografías no es válido.');

  const seenPhotos=new Set();
  const safePhotos=photos.map((photo,sourceIndex)=>{
    if (!photo || typeof photo !== 'object' || Array.isArray(photo)) throw new Error('El respaldo contiene una fotografía inválida.');
    const recipeId=String(photo.recipeId || photo.recipe || photo.key || '');
    if (!ids.has(recipeId)) throw new Error('Una fotografía del respaldo no corresponde a ninguna receta.');
    const requestedPosition=Number(photo.position);
    const position=Number.isInteger(requestedPosition) && requestedPosition>0 ? requestedPosition : Number.MAX_SAFE_INTEGER;
    const photoId=String(photo.photoId || photo.id || `legacy-${recipeId}-${sourceIndex+1}`);
    const identity=`${recipeId}::${photoId}`;
    if (seenPhotos.has(identity)) throw new Error('El respaldo contiene una fotografía duplicada.');
    const dataUrl=photo.dataUrl || photo.fullDataUrl || photo.imageDataUrl || '';
    if (typeof dataUrl !== 'string' || !/^data:image\/(?:jpeg|png|webp);base64,/i.test(dataUrl)) throw new Error('Una fotografía no tiene un formato compatible.');
    if (dataUrl.length > 12 * 1024 * 1024) throw new Error('Una fotografía del respaldo excede el límite seguro.');
    seenPhotos.add(identity);
    return {recipeId,photoId,position,dataUrl,sourceIndex};
  });

  safePhotos.sort((a,b)=>a.recipeId.localeCompare(b.recipeId,'es',{numeric:true}) || a.position-b.position || a.sourceIndex-b.sourceIndex);
  let activeRecipeId=null;
  let sequentialPosition=0;
  safePhotos.forEach(photo=>{
    if (photo.recipeId !== activeRecipeId) { activeRecipeId=photo.recipeId; sequentialPosition=0; }
    sequentialPosition+=1;
    photo.position=sequentialPosition;
    delete photo.sourceIndex;
  });

  return {recipes,catalogs,favoritas:[...favoriteSet],config,mixerHistory,photos:safePhotos,createdAt:payload.createdAt,appVersion:payload.appVersion};
}
function openRestoreModal(validated){
  pendingRestore=validated;
  if (elements.restoreConfirmCopy) elements.restoreConfirmCopy.textContent=`Respaldo del ${formatDateTime(validated.createdAt)}${validated.appVersion ? ` · app v${validated.appVersion}` : ''}. Confirma para reemplazar los datos locales actuales.`;
  if (elements.restoreSummary) elements.restoreSummary.innerHTML=`
    <div><strong>${validated.recipes.length}</strong><span>Recetas</span></div>
    <div><strong>${validated.favoritas.length}</strong><span>Favoritas</span></div>
    <div><strong>${Object.values(validated.catalogs).reduce((sum,items)=>sum+items.length,0)}</strong><span>Elementos de catálogo</span></div>
    <div><strong>${validated.mixerHistory.length}</strong><span>Cálculos Mixer</span></div>
    <div><strong>${validated.photos.length}</strong><span>Fotografías</span></div>`;
  if (elements.restoreConfirmModal) elements.restoreConfirmModal.hidden=false;
  document.body.classList.add('modal-open');
}

function closeRestoreModal(){
  if (elements.restoreConfirmModal) elements.restoreConfirmModal.hidden=true;
  pendingRestore=null;
  document.body.classList.remove('modal-open');
  if (elements.restoreBackupInput) elements.restoreBackupInput.value='';
}

async function handleRestoreFile(file){
  if (!file) return;
  setStatus(elements.backupRestoreStatus,'Validando respaldo…','working');
  try {
    if (file.size > MAX_BACKUP_BYTES) throw new Error(`El archivo supera el límite seguro de ${formatBytes(MAX_BACKUP_BYTES)}.`);
    const text=await file.text();
    let payload;
    try { payload=JSON.parse(text); } catch { throw new Error('El archivo seleccionado no contiene JSON válido.'); }
    const validated=validateBackup(payload);
    setStatus(elements.backupRestoreStatus,'Archivo válido. Revisa el resumen antes de restaurar.','success');
    openRestoreModal(validated);
  } catch (error) {
    setStatus(elements.backupRestoreStatus,error?.message || 'El respaldo es incompatible o está dañado.','error');
    if (elements.restoreBackupInput) elements.restoreBackupInput.value='';
  }
}

async function restoreConfirmed(){
  if (!pendingRestore) return;
  const validated=pendingRestore;
  if (elements.restoreConfirmBtn) elements.restoreConfirmBtn.disabled=true;
  setStatus(elements.backupRestoreStatus,'Preparando fotografías y restauración segura…','working');
  try {
    const prepared=[];
    for (const photo of validated.photos) {
      const processed=await processRecipePhotoDataUrl(photo.dataUrl);
      prepared.push({recipeId:photo.recipeId,photoId:photo.photoId,position:photo.position,processed});
    }
    const oldRecipes=loadRecipes(storage);
    const oldCatalogs=loadCatalogs(storage);
    const oldSettings=safeSettings();
    const oldMixerHistory=loadMixerHistory(storage);
    const oldPhotos=await listRecipePhotos();

    const nextRecipes=validated.recipes.map(recipe=>({...recipe,foto:null,fotos:[]}));
    const byId=new Map(nextRecipes.map(recipe=>[recipe.id,recipe]));
    const grouped=new Map();
    prepared.forEach(item=>{
      if (!grouped.has(item.recipeId)) grouped.set(item.recipeId,[]);
      grouped.get(item.recipeId).push(item);
    });
    const newRecords=[];
    for (const [recipeId,items] of grouped.entries()) {
      items.sort((a,b)=>a.position-b.position);
      const entries=items.map(item=>photoEntryFromProcessed(recipeId,item.processed,{photoId:item.photoId}));
      const recipe=byId.get(recipeId);
      const references=buildPhotoReferences(recipeId,entries);
      recipe.fotos=references;
      recipe.foto=references[0]||null;
      const record=recipePhotoRecordFromEntries(recipeId,entries);
      if (record) newRecords.push(record);
    }

    try {
      await replaceAllRecipePhotos(newRecords);
      saveCatalogs(storage,validated.catalogs);
      saveRecipes(storage,nextRecipes);
      storage.set(SETTINGS_KEY,validated.config);
      saveMixerHistory(storage,validated.mixerHistory);
    } catch (error) {
      await replaceAllRecipePhotos(oldPhotos).catch(()=>{});
      saveCatalogs(storage,oldCatalogs);
      saveRecipes(storage,oldRecipes);
      storage.set(SETTINGS_KEY,oldSettings);
      saveMixerHistory(storage,oldMixerHistory);
      throw error;
    }

    closeRestoreModal();
    setStatus(elements.backupRestoreStatus,'Restauración completada. Recargando la aplicación…','success');
    setTimeout(()=>location.reload(),450);
  } catch (error) {
    setStatus(elements.backupRestoreStatus,error?.message || 'No fue posible restaurar el respaldo sin riesgo.','error');
    if (elements.restoreConfirmBtn) elements.restoreConfirmBtn.disabled=false;
  }
}

function openClearModal(){
  if (elements.clearDataConfirmInput) elements.clearDataConfirmInput.value='';
  if (elements.clearDataConfirmBtn) elements.clearDataConfirmBtn.disabled=true;
  if (elements.clearDataModal) elements.clearDataModal.hidden=false;
  document.body.classList.add('modal-open');
  setTimeout(()=>elements.clearDataConfirmInput?.focus(),50);
}

function closeClearModal(){
  if (elements.clearDataModal) elements.clearDataModal.hidden=true;
  document.body.classList.remove('modal-open');
}

async function clearLocalData(){
  if (elements.clearDataConfirmInput?.value !== 'BORRAR') return;
  if (elements.clearDataConfirmBtn) elements.clearDataConfirmBtn.disabled=true;
  setStatus(elements.clearDataStatus,'Eliminando datos locales…','working');
  try {
    await replaceAllRecipePhotos([]);
    storage.remove('recipes.v1');
    storage.remove('catalogs.v1');
    storage.remove(SETTINGS_KEY);
    storage.remove(MIXER_HISTORY_KEY);
    storage.remove(RUNTIME_KEY);
    closeClearModal();
    setStatus(elements.clearDataStatus,'Datos eliminados. Recargando la aplicación…','success');
    setTimeout(()=>location.reload(),350);
  } catch (error) {
    setStatus(elements.clearDataStatus,error?.message || 'No fue posible eliminar todos los datos.','error');
    if (elements.clearDataConfirmBtn) elements.clearDataConfirmBtn.disabled=false;
  }
}

function bindEvents(){
  elements.pwaCheckUpdate?.addEventListener('click',()=>void checkForUpdates());
  elements.pwaApplyUpdate?.addEventListener('click',()=>void applyUpdate());
  elements.pwaInstallApp?.addEventListener('click',()=>void installApp());
  elements.exportBackupBtn?.addEventListener('click',()=>void exportBackup());
  elements.selectBackupBtn?.addEventListener('click',()=>elements.restoreBackupInput?.click());
  elements.restoreBackupInput?.addEventListener('change',event=>void handleRestoreFile(event.target.files?.[0]));
  elements.restoreConfirmClose?.addEventListener('click',closeRestoreModal);
  elements.restoreCancelBtn?.addEventListener('click',closeRestoreModal);
  elements.restoreConfirmModal?.querySelector('[data-close-restore-confirm]')?.addEventListener('click',closeRestoreModal);
  elements.restoreConfirmBtn?.addEventListener('click',()=>void restoreConfirmed());
  elements.clearLocalDataBtn?.addEventListener('click',openClearModal);
  elements.clearDataModalClose?.addEventListener('click',closeClearModal);
  elements.clearDataCancelBtn?.addEventListener('click',closeClearModal);
  elements.clearDataModal?.querySelector('[data-close-clear-data]')?.addEventListener('click',closeClearModal);
  elements.clearDataConfirmInput?.addEventListener('input',()=>{
    if (elements.clearDataConfirmBtn) elements.clearDataConfirmBtn.disabled=elements.clearDataConfirmInput.value !== 'BORRAR';
  });
  elements.clearDataConfirmBtn?.addEventListener('click',()=>void clearLocalData());
  window.addEventListener('keydown',event=>{
    if (event.key !== 'Escape') return;
    if (elements.restoreConfirmModal && !elements.restoreConfirmModal.hidden) { closeRestoreModal(); return; }
    if (elements.clearDataModal && !elements.clearDataModal.hidden) closeClearModal();
  });
}

async function initServiceWorker(){
  if (!('serviceWorker' in navigator)) {
    renderSwStatus('No compatible','warning');
    return;
  }
  try {
    const registration=await getRegistration();
    if (registration?.waiting) {
      const metadata=await fetchRemoteVersion().catch(()=>({version:''}));
      renderUpdateState({available:true,version:metadata.version,message:'Hay una actualización ya preparada para aplicar.'});
    }
  } catch (error) {
    setStatus(elements.pwaActionStatus,error?.message || 'Service Worker no disponible.','error');
  }
}

export function refreshSettingsView(){
  renderRuntime();
  if ('serviceWorker' in navigator) renderSwStatus(navigator.serviceWorker.controller ? 'Activo' : (swRegistration ? 'Registrado' : 'Comprobando…'),navigator.serviceWorker.controller ? 'success' : '');
}

export function initSettings(){
  if (initialized) return;
  initialized=true;
  cacheElements();
  renderRuntime();
  renderUpdateState();
  bindEvents();

  window.addEventListener('beforeinstallprompt',event=>{
    event.preventDefault();
    installPromptEvent=event;
    renderRuntime();
  });
  window.addEventListener('appinstalled',()=>{
    installPromptEvent=null;
    renderRuntime();
    setStatus(elements.pwaActionStatus,'Aplicación instalada correctamente.','success');
  });
  window.matchMedia?.('(display-mode: standalone)')?.addEventListener?.('change',renderRuntime);
  void initServiceWorker();
}

// Exportaciones puras útiles para verificación de compatibilidad del respaldo/versionado.
export { validateBackup as validateBackupPayload, compareVersions as compareAppVersions };
