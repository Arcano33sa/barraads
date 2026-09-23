const DB_NAME = 'agoraSir.media.v1';
const DB_VERSION = 1;
const STORE_NAME = 'recipePhotos';

const FULL_MAX_EDGE = 1600;
const THUMB_MAX_EDGE = 360;
const FULL_QUALITY = 0.86;
const THUMB_QUALITY = 0.8;

let dbPromise = null;

function openMediaDb(){
  if (!('indexedDB' in globalThis)) {
    return Promise.reject(new Error('IndexedDB no está disponible en este navegador.'));
  }
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve,reject) => {
    const request = indexedDB.open(DB_NAME,DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME,{keyPath:'recipeId'});
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('No fue posible abrir el almacenamiento de fotografías.'));
    request.onblocked = () => reject(new Error('El almacenamiento de fotografías está bloqueado por otra pestaña.'));
  }).catch(error => {
    dbPromise = null;
    throw error;
  });

  return dbPromise;
}

function transactionDone(transaction){
  return new Promise((resolve,reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error('Falló la operación de almacenamiento.'));
    transaction.onabort = () => reject(transaction.error || new Error('La operación de almacenamiento fue cancelada.'));
  });
}

function makePhotoId(recipeId,index = 0){
  return globalThis.crypto?.randomUUID?.()
    || `${String(recipeId || 'receta')}-foto-${Date.now()}-${index}-${Math.random().toString(36).slice(2,9)}`;
}

function normalizePhotoEntry(recipeId,value,index = 0){
  if (!value || typeof value !== 'object') return null;
  const fullBlob = value.fullBlob instanceof Blob ? value.fullBlob : null;
  const thumbnailBlob = value.thumbnailBlob instanceof Blob ? value.thumbnailBlob : null;
  if (!fullBlob || !thumbnailBlob) return null;
  const photoId = String(value.photoId || value.id || `legacy-${recipeId}-${index + 1}`);
  return {
    photoId,
    fullBlob,
    thumbnailBlob,
    metadata:{...(value.metadata || {})},
    createdAt:String(value.createdAt || value.updatedAt || ''),
    updatedAt:String(value.updatedAt || '')
  };
}

function normalizeRecipeMediaRecord(record){
  if (!record || typeof record !== 'object' || !record.recipeId) return null;
  const recipeId = String(record.recipeId);
  let photos = Array.isArray(record.photos)
    ? record.photos.map((photo,index)=>normalizePhotoEntry(recipeId,photo,index)).filter(Boolean)
    : [];

  if (!photos.length && record.fullBlob instanceof Blob && record.thumbnailBlob instanceof Blob) {
    const legacy = normalizePhotoEntry(recipeId,{
      photoId:`legacy-${recipeId}-1`,
      fullBlob:record.fullBlob,
      thumbnailBlob:record.thumbnailBlob,
      metadata:{...(record.metadata || {})},
      createdAt:record.updatedAt || '',
      updatedAt:record.updatedAt || ''
    },0);
    if (legacy) photos = [legacy];
  }

  const primary = photos[0] || null;
  return {
    recipeId,
    photos,
    fullBlob:primary?.fullBlob || null,
    thumbnailBlob:primary?.thumbnailBlob || null,
    metadata:primary ? {...primary.metadata} : {},
    updatedAt:String(record.updatedAt || primary?.updatedAt || '')
  };
}

async function decodeBitmap(file){
  if ('createImageBitmap' in globalThis) {
    try {
      return await createImageBitmap(file,{imageOrientation:'from-image'});
    } catch {
      try { return await createImageBitmap(file); } catch { /* fallback below */ }
    }
  }

  return new Promise((resolve,reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No fue posible leer la fotografía seleccionada.'));
    };
    img.src = url;
  });
}

function targetSize(width,height,maxEdge){
  const longest = Math.max(width,height);
  if (!longest || longest <= maxEdge) return {width,height};
  const scale = maxEdge / longest;
  return {
    width:Math.max(1,Math.round(width * scale)),
    height:Math.max(1,Math.round(height * scale))
  };
}

function canvasBlob(canvas,type,quality){
  return new Promise((resolve,reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('No fue posible optimizar la fotografía.')),type,quality);
  });
}

async function renderVariant(source,width,height,maxEdge,quality){
  const size = targetSize(width,height,maxEdge);
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext('2d',{alpha:true});
  if (!context) throw new Error('No fue posible preparar la fotografía.');
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(source,0,0,size.width,size.height);

  let blob;
  try {
    blob = await canvasBlob(canvas,'image/webp',quality);
    if (blob.type !== 'image/webp') throw new Error('WebP no disponible');
  } catch {
    blob = await canvasBlob(canvas,'image/jpeg',Math.min(0.9,quality + 0.02));
  }

  return {blob,width:size.width,height:size.height,mime:blob.type};
}

export async function optimizeRecipePhoto(file){
  if (!(file instanceof Blob)) throw new Error('Selecciona una fotografía válida.');
  if (!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('La foto debe ser JPG o PNG.');
  if (file.size > 5 * 1024 * 1024) throw new Error('La foto supera el máximo de 5 MB.');

  const source = await decodeBitmap(file);
  const width = Number(source.width || source.naturalWidth || 0);
  const height = Number(source.height || source.naturalHeight || 0);
  if (!width || !height) {
    if (typeof source.close === 'function') source.close();
    throw new Error('La fotografía no tiene dimensiones válidas.');
  }

  try {
    const [full,thumb] = await Promise.all([
      renderVariant(source,width,height,FULL_MAX_EDGE,FULL_QUALITY),
      renderVariant(source,width,height,THUMB_MAX_EDGE,THUMB_QUALITY)
    ]);

    return {
      fullBlob:full.blob,
      thumbnailBlob:thumb.blob,
      metadata:{
        storage:'indexeddb',
        mime:full.mime,
        width:full.width,
        height:full.height,
        thumbnailMime:thumb.mime,
        thumbnailWidth:thumb.width,
        thumbnailHeight:thumb.height,
        originalMime:file.type,
        originalBytes:file.size,
        optimizedBytes:full.blob.size,
        thumbnailBytes:thumb.blob.size
      }
    };
  } finally {
    if (typeof source.close === 'function') source.close();
  }
}

export function photoEntryFromProcessed(recipeId,processed,{photoId=null,createdAt=null,updatedAt=null} = {}){
  if (!recipeId || !processed?.fullBlob || !processed?.thumbnailBlob) throw new Error('Fotografía procesada inválida.');
  const now = new Date().toISOString();
  return {
    photoId:String(photoId || makePhotoId(recipeId)),
    fullBlob:processed.fullBlob,
    thumbnailBlob:processed.thumbnailBlob,
    metadata:{...(processed.metadata || {})},
    createdAt:String(createdAt || now),
    updatedAt:String(updatedAt || now)
  };
}

export function buildPhotoReference(recipeId,processed,now = new Date(),options = {}){
  if (!processed?.metadata || !recipeId) return null;
  const photoId = String(options.photoId || processed.photoId || `legacy-${recipeId}-1`);
  const position = Number.isFinite(Number(options.position)) && Number(options.position) > 0 ? Number(options.position) : 1;
  return {
    ...processed.metadata,
    key:String(recipeId),
    photoId,
    position,
    updatedAt:now.toISOString()
  };
}

export function buildPhotoReferences(recipeId,entries,now = new Date()){
  const safe = Array.isArray(entries) ? entries : [];
  return safe.map((entry,index)=>buildPhotoReference(recipeId,{metadata:{...(entry.metadata || {})},photoId:entry.photoId},now,{
    photoId:entry.photoId,
    position:index + 1
  })).filter(Boolean);
}

export async function saveRecipePhotoCollection(recipeId,entries){
  if (!recipeId) throw new Error('No hay una receta válida para guardar fotografías.');
  const safe = (Array.isArray(entries) ? entries : [])
    .map((entry,index)=>normalizePhotoEntry(String(recipeId),entry,index))
    .filter(Boolean);
  const db = await openMediaDb();
  const transaction = db.transaction(STORE_NAME,'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  if (!safe.length) {
    store.delete(String(recipeId));
  } else {
    const primary = safe[0];
    store.put({
      recipeId:String(recipeId),
      photos:safe,
      fullBlob:primary.fullBlob,
      thumbnailBlob:primary.thumbnailBlob,
      metadata:{...primary.metadata},
      updatedAt:new Date().toISOString()
    });
  }
  await transactionDone(transaction);
}

export async function saveRecipePhoto(recipeId,processed){
  if (!recipeId || !processed?.fullBlob || !processed?.thumbnailBlob) {
    throw new Error('No hay una fotografía optimizada para guardar.');
  }
  await saveRecipePhotoCollection(recipeId,[photoEntryFromProcessed(recipeId,processed)]);
}

export async function getRecipePhoto(recipeId){
  if (!recipeId) return null;
  const db = await openMediaDb();
  return new Promise((resolve,reject) => {
    const transaction = db.transaction(STORE_NAME,'readonly');
    const request = transaction.objectStore(STORE_NAME).get(String(recipeId));
    request.onsuccess = () => resolve(normalizeRecipeMediaRecord(request.result || null));
    request.onerror = () => reject(request.error || new Error('No fue posible leer la fotografía.'));
  });
}

export async function getRecipePhotos(recipeId){
  const record = await getRecipePhoto(recipeId);
  return record?.photos || [];
}

export async function deleteRecipePhoto(recipeId){
  if (!recipeId) return;
  const db = await openMediaDb();
  const transaction = db.transaction(STORE_NAME,'readwrite');
  transaction.objectStore(STORE_NAME).delete(String(recipeId));
  await transactionDone(transaction);
}

function requestResult(request,message){
  return new Promise((resolve,reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error(message));
  });
}

export async function listRecipePhotos(){
  const db = await openMediaDb();
  const transaction = db.transaction(STORE_NAME,'readonly');
  const store = transaction.objectStore(STORE_NAME);
  const result = await requestResult(store.getAll(),'No fue posible leer las fotografías para el respaldo.');
  return (Array.isArray(result) ? result : []).map(normalizeRecipeMediaRecord).filter(Boolean);
}

export async function clearAllRecipePhotos(){
  const db = await openMediaDb();
  const transaction = db.transaction(STORE_NAME,'readwrite');
  transaction.objectStore(STORE_NAME).clear();
  await transactionDone(transaction);
}

function dataUrlToBlob(dataUrl){
  const match = /^data:([^;,]+);base64,(.+)$/s.exec(String(dataUrl || ''));
  if (!match) throw new Error('La fotografía del respaldo no tiene un formato válido.');
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes],{type:match[1] || 'application/octet-stream'});
}

export async function processRecipePhotoDataUrl(dataUrl){
  const blob = dataUrlToBlob(dataUrl);
  if (!blob.type.startsWith('image/')) throw new Error('El respaldo contiene una fotografía inválida.');
  if (blob.size > 8 * 1024 * 1024) throw new Error('Una fotografía del respaldo excede el límite seguro.');
  return optimizeRecipePhoto(blob);
}

export async function restoreRecipePhotoFromDataUrl(recipeId,dataUrl){
  if (!recipeId) throw new Error('La fotografía del respaldo no está ligada a una receta.');
  const processed = await processRecipePhotoDataUrl(dataUrl);
  const entry = photoEntryFromProcessed(recipeId,processed);
  await saveRecipePhotoCollection(recipeId,[entry]);
  return buildPhotoReference(recipeId,{...processed,photoId:entry.photoId},new Date(),{photoId:entry.photoId,position:1});
}

export async function replaceAllRecipePhotos(records){
  const safeRecords = Array.isArray(records)
    ? records.map(normalizeRecipeMediaRecord).filter(record => record && record.recipeId && record.photos.length)
    : [];
  const db = await openMediaDb();
  const transaction = db.transaction(STORE_NAME,'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  store.clear();
  for (const record of safeRecords) store.put(record);
  await transactionDone(transaction);
}

export function recipePhotoRecordFromProcessed(recipeId,processed,now = new Date()){
  const entry = photoEntryFromProcessed(recipeId,processed,{createdAt:now.toISOString(),updatedAt:now.toISOString()});
  return {
    recipeId:String(recipeId),
    photos:[entry],
    fullBlob:entry.fullBlob,
    thumbnailBlob:entry.thumbnailBlob,
    metadata:{...entry.metadata},
    updatedAt:now.toISOString()
  };
}

export function recipePhotoRecordFromEntries(recipeId,entries,now = new Date()){
  const safe = (Array.isArray(entries) ? entries : [])
    .map((entry,index)=>normalizePhotoEntry(String(recipeId),entry,index))
    .filter(Boolean);
  if (!safe.length) return null;
  const primary = safe[0];
  return {
    recipeId:String(recipeId),
    photos:safe,
    fullBlob:primary.fullBlob,
    thumbnailBlob:primary.thumbnailBlob,
    metadata:{...primary.metadata},
    updatedAt:now.toISOString()
  };
}
