export const RECIPE_STORAGE_KEY = 'recipes.v1';

const cleanString = value => String(value ?? '').trim().replace(/\s+/g,' ');

const cleanArray = value => Array.isArray(value)
  ? value.map(cleanString).filter(Boolean)
  : [];

function sanitizePhotoReference(value){
  const source = value && typeof value === 'object' ? value : null;
  if (!source || source.storage !== 'indexeddb' || !cleanString(source.key)) return null;
  const numberOrNull = input => Number.isFinite(Number(input)) && Number(input) > 0 ? Number(input) : null;
  return {
    storage:'indexeddb',
    key:cleanString(source.key),
    photoId:cleanString(source.photoId),
    position:Number.isFinite(Number(source.position)) && Number(source.position) > 0 ? Number(source.position) : null,
    mime:cleanString(source.mime),
    width:numberOrNull(source.width),
    height:numberOrNull(source.height),
    thumbnailMime:cleanString(source.thumbnailMime),
    thumbnailWidth:numberOrNull(source.thumbnailWidth),
    thumbnailHeight:numberOrNull(source.thumbnailHeight),
    originalMime:cleanString(source.originalMime),
    originalBytes:numberOrNull(source.originalBytes),
    optimizedBytes:numberOrNull(source.optimizedBytes),
    thumbnailBytes:numberOrNull(source.thumbnailBytes),
    updatedAt:cleanString(source.updatedAt)
  };
}

function sanitizePhotoReferences(value){
  const source = Array.isArray(value) ? value : [];
  const seen = new Set();
  return source.map((raw,index)=>({reference:sanitizePhotoReference(raw),index}))
    .filter(item=>Boolean(item.reference))
    .filter(item => {
      const reference=item.reference;
      const identity = `${reference.key}::${reference.photoId || reference.position || item.index + 1}`;
      if (seen.has(identity)) return false;
      seen.add(identity);
      return true;
    })
    .map((item,index)=>({...item.reference,position:index + 1}));
}

export function sanitizeRecipeDraft(draft){
  const source = draft && typeof draft === 'object' ? draft : {};
  const ingredientes = Array.isArray(source.ingredientes)
    ? source.ingredientes.map(row => {
        const rawCantidad = row?.cantidad;
        const isNumericSource = typeof rawCantidad === 'number' || typeof rawCantidad === 'string';
        const hasCantidad = isNumericSource && rawCantidad !== null && rawCantidad !== undefined && String(rawCantidad).trim() !== '';
        const parsedCantidad = hasCantidad ? Number(rawCantidad) : NaN;
        const cantidad = Number.isFinite(parsedCantidad) && parsedCantidad >= 0 ? parsedCantidad : null;
        return {
          ingrediente: cleanString(row?.ingrediente),
          cantidad,
          // Conservar la unidad histórica tal como venga. La conversión visual de
          // 0 + unidad vacía a “Al Gusto” pertenece al formulario/ficha, no a una
          // migración global durante carga/guardado.
          unidad: cleanString(row?.unidad)
        };
      }).filter(row => row.ingrediente || row.cantidad !== null || row.unidad)
    : [];

  const alquimia = Array.isArray(source.alquimia)
    ? source.alquimia.map((step,index) => ({
        orden:index + 1,
        texto:cleanString(typeof step === 'string' ? step : step?.texto)
      })).filter(step => step.texto)
    : [];

  const recipe = {
    id: cleanString(source.id),
    nombre: cleanString(source.nombre),
    alquimista: cleanString(source.alquimista),
    basePrincipal: cleanString(source.basePrincipal),
    basesSecundarias: cleanArray(source.basesSecundarias),
    categoria: cleanString(source.categoria),
    cristaleria: cleanString(source.cristaleria),
    ingredientes,
    tecnicas: cleanArray(source.tecnicas),
    alquimia,
    decoracion: cleanString(source.decoracion),
    etiquetas: cleanArray(source.etiquetas),
    notas: String(source.notas ?? '').trim(),
    estado: ['En prueba','Aprobada','Descartada'].includes(source.estado) ? source.estado : 'En prueba',
    favorita:Boolean(source.favorita),
    fotos:[],
    foto:null,
    createdAt: cleanString(source.createdAt),
    updatedAt: cleanString(source.updatedAt)
  };

  const legacyPhoto = sanitizePhotoReference(source.foto);
  const photoCollection = sanitizePhotoReferences(source.fotos);
  recipe.fotos = photoCollection.length ? photoCollection : (legacyPhoto ? [{...legacyPhoto,position:1}] : []);
  recipe.foto = recipe.fotos[0] || legacyPhoto || null;
  if (recipe.foto && !recipe.fotos.length) recipe.fotos = [{...recipe.foto,position:1}];

  recipe.basesSecundarias = recipe.basesSecundarias.filter(value => value !== recipe.basePrincipal);
  return recipe;
}

export function validateRecipe(recipe){
  const errors = [];
  if (!recipe.nombre) errors.push({field:'recipeName',message:'Escribe el nombre de la bebida.'});
  if (!recipe.basePrincipal) errors.push({field:'recipeBasePrimary',message:'Selecciona una base principal.'});
  if (!recipe.categoria) errors.push({field:'recipeCategory',message:'Selecciona una categoría.'});
  if (!recipe.cristaleria) errors.push({field:'recipeGlassware',message:'Selecciona la cristalería.'});

  if (!recipe.ingredientes.length) {
    errors.push({field:'ingredientsRows',message:'Añade al menos un ingrediente.'});
  } else {
    const invalidIngredient = recipe.ingredientes.find(row =>
      !row.ingrediente
      || !Number.isFinite(row.cantidad)
      || row.cantidad < 0
      || (row.cantidad > 0 && !row.unidad)
      || (row.cantidad === 0 && Boolean(row.unidad))
    );
    if (invalidIngredient) errors.push({field:'ingredientsRows',message:'Completa ingrediente y cantidad. Para cantidades mayores que 0 selecciona una unidad; con 0 se guarda como “Al gusto” sin unidad.'});
  }

  if (!recipe.alquimia.length) errors.push({field:'alchemySteps',message:'Añade al menos un paso de ALQUIMIA.'});
  return errors;
}

export function loadRecipes(storage){
  const saved = storage.get(RECIPE_STORAGE_KEY,[]);
  if (!Array.isArray(saved)) return [];
  return saved
    .map(sanitizeRecipeDraft)
    .filter(recipe => recipe.id && recipe.nombre);
}

export function saveRecipes(storage,recipes){
  const safe = Array.isArray(recipes)
    ? recipes.map(sanitizeRecipeDraft).filter(recipe => recipe.id && recipe.nombre)
    : [];
  storage.set(RECIPE_STORAGE_KEY,safe);
  return safe;
}

export function createRecipeRecord(draft,now = new Date()){
  const recipe = sanitizeRecipeDraft(draft);
  const timestamp = now.toISOString();
  const randomId = globalThis.crypto?.randomUUID?.()
    || `receta-${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
  recipe.id = recipe.id || randomId;
  recipe.createdAt = recipe.createdAt || timestamp;
  recipe.updatedAt = timestamp;
  return recipe;
}
