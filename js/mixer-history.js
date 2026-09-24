export const MIXER_HISTORY_KEY = 'mixer.history.v1';
export const MAX_MIXER_HISTORY_RECORDS = 5000;
export const MAX_MIXER_HISTORY_INGREDIENTS = 500;

function text(value){
  return value === null || value === undefined ? '' : String(value).trim();
}

function finiteNumber(value,{positive=false,allowNull=false}={}){
  if ((value === null || value === undefined || value === '') && allowNull) return null;
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number)) throw new Error('El Histórico de Mixer contiene una cantidad inválida.');
  if (positive && number <= 0) throw new Error('El Histórico de Mixer contiene una proporción inválida.');
  return Object.is(number,-0) ? 0 : number;
}

function normalizeUnit(value){
  const unit = text(value).toLowerCase();
  if (unit !== 'ml' && unit !== 'oz') throw new Error('El Histórico de Mixer contiene una unidad de proporción inválida.');
  return unit;
}

function normalizeIngredient(raw){
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('El Histórico de Mixer contiene un ingrediente inválido.');
  const nombre = text(raw.nombre) || 'Ingrediente';
  const alGusto = raw.alGusto === true;
  const cantidadVacia = raw.cantidadVacia === true || raw.cantidadOriginal === null || raw.cantidadOriginal === undefined || raw.cantidadOriginal === '';
  const unidadOriginal = text(raw.unidadOriginal);

  if (alGusto) {
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

  if (cantidadVacia) {
    return {
      nombre,
      cantidadOriginal:null,
      unidadOriginal,
      cantidadCalculada:null,
      visualOriginal:text(raw.visualOriginal) || 'Sin cantidad',
      visualCalculada:text(raw.visualCalculada) || 'Sin cantidad',
      alGusto:false,
      cantidadVacia:true
    };
  }

  const cantidadOriginal = finiteNumber(raw.cantidadOriginal);
  const cantidadCalculada = finiteNumber(raw.cantidadCalculada,{allowNull:true});
  return {
    nombre,
    cantidadOriginal,
    unidadOriginal,
    cantidadCalculada,
    visualOriginal:text(raw.visualOriginal),
    visualCalculada:text(raw.visualCalculada),
    alGusto:false,
    cantidadVacia:false
  };
}

function normalizeRecord(raw){
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('El Histórico de Mixer contiene un registro inválido.');
  const id = text(raw.id);
  const nombreReceta = text(raw.nombreReceta);
  const nombreVisible = text(raw.nombreVisible);
  if (!id) throw new Error('Un cálculo de Mixer no tiene identificador válido.');
  if (!nombreReceta || !nombreVisible) throw new Error('Un cálculo de Mixer no tiene nombre válido.');

  const fechaHoraGuardado = text(raw.fechaHoraGuardado);
  const savedDate = new Date(fechaHoraGuardado);
  if (!fechaHoraGuardado || Number.isNaN(savedDate.getTime())) throw new Error('Un cálculo de Mixer no tiene fecha/hora válida.');

  const ingredientes = Array.isArray(raw.ingredientes) ? raw.ingredientes : [];
  if (ingredientes.length > MAX_MIXER_HISTORY_INGREDIENTS) throw new Error('Un cálculo de Mixer contiene demasiados ingredientes.');

  return {
    id,
    recipeId:text(raw.recipeId) || null,
    nombreReceta,
    nombreVisible,
    rendimientoOriginal:finiteNumber(raw.rendimientoOriginal,{positive:true}),
    unidadProporcion:normalizeUnit(raw.unidadProporcion),
    volumenObjetivo:finiteNumber(raw.volumenObjetivo,{positive:true}),
    factor:finiteNumber(raw.factor,{positive:true}),
    fechaHoraGuardado:savedDate.toISOString(),
    ingredientes:ingredientes.map(normalizeIngredient)
  };
}

export function normalizeMixerHistory(value,{strict=true}={}){
  if (value === null || value === undefined) return [];
  if (!Array.isArray(value)) {
    if (strict) throw new Error('La colección de Histórico de Mixer no es válida.');
    return [];
  }
  if (value.length > MAX_MIXER_HISTORY_RECORDS) throw new Error('El Histórico de Mixer excede el límite seguro.');
  const seen = new Set();
  const records = value.map(normalizeRecord);
  for (const record of records) {
    if (seen.has(record.id)) throw new Error(`El Histórico de Mixer contiene un identificador duplicado: ${record.id}.`);
    seen.add(record.id);
  }
  return records;
}

export function loadMixerHistory(storageApi){
  const raw = storageApi?.get?.(MIXER_HISTORY_KEY,[]);
  try {
    return normalizeMixerHistory(raw,{strict:false});
  } catch {
    return [];
  }
}

export function saveMixerHistory(storageApi,records){
  const normalized = normalizeMixerHistory(records);
  storageApi.set(MIXER_HISTORY_KEY,normalized);
  return normalized;
}
