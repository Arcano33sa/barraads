export const CATALOG_DEFINITIONS = {
  bases: {
    label:'Bases', short:'B', help:'Destilados o familias principales para clasificar recetas.',
    items:['Tequila','Ron','Whisky','Vodka','Gin','Brandy','Vino','Cerveza','Mezcal','Sin alcohol']
  },
  categorias: {
    label:'Categorías', short:'C', help:'Estilos y familias que describen el carácter de cada bebida.',
    items:['Cóctel','Sangría','Shot','Frozen','Sour','Highball','Tropical','Mocktail','Digestivo','Experimental','De la casa']
  },
  cristaleria: {
    label:'Cristalería', short:'CR', help:'Vasos, copas y recipientes disponibles para el servicio.',
    items:['Highball','Old Fashioned','Coupé','Margarita','Martini','Vaso corto','Copa de vino','Shot','Jarra']
  },
  unidades: {
    label:'Unidades', short:'U', help:'Medidas que podrán asignarse a ingredientes y cantidades.',
    items:['ml','oz','dash','gotas','cucharadita','cucharada','parte','unidad','rodaja','ramita']
  },
  ingredientes: {
    label:'Ingredientes', short:'I', help:'Ingredientes disponibles para construir las recetas.',
    items:['Tequila blanco','Tequila reposado','Ron blanco','Ron oscuro','Triple sec','Jugo de limón','Jarabe simple','Menta','Hielo','Agua tónica']
  },
  tecnicas: {
    label:'Técnicas', short:'T', help:'Métodos de preparación que podrán seleccionarse en cada receta.',
    items:['Agitar','Mezclar','Macerar','Colar','Flamear','Licuar','Construir en vaso']
  },
  decoraciones: {
    label:'Decoraciones / Garnish', short:'G', help:'Acabados, bordes y guarniciones para la presentación final.',
    items:['Rodaja de limón','Twist de naranja','Hojas de menta','Cereza','Sal en el borde','Canela']
  },
  etiquetas: {
    label:'Etiquetas', short:'E', help:'Descriptores rápidos para búsqueda, estilo y ocasión.',
    items:['Refrescante','Cítrico','Dulce','Fuerte','Nocturno','Elegante','Veraniego','Clásico','De autor']
  }
};

export const CATALOG_STORAGE_KEY = 'catalogs.v1';

export function normalizeCatalogValue(value){
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .toLocaleLowerCase('es')
    .replace(/[^\p{L}\p{N}]+/gu,' ')
    .trim()
    .replace(/\s+/g,' ');
}

export function isAlGustoUnit(value){
  return normalizeCatalogValue(value) === 'al gusto';
}

export function cloneSeedCatalogs(){
  return Object.fromEntries(
    Object.entries(CATALOG_DEFINITIONS).map(([key,definition]) => [key,[...definition.items]])
  );
}

export function loadCatalogs(storage){
  const saved = storage.get(CATALOG_STORAGE_KEY,null);
  if (!saved || typeof saved !== 'object' || Array.isArray(saved)) {
    const initial = cloneSeedCatalogs();
    storage.set(CATALOG_STORAGE_KEY,initial);
    return initial;
  }

  const valid = {};
  for (const key of Object.keys(CATALOG_DEFINITIONS)) {
    valid[key] = Array.isArray(saved[key])
      ? saved[key].filter(item => typeof item === 'string' && item.trim()).map(item => item.trim())
      : [...CATALOG_DEFINITIONS[key].items];
  }
  return valid;
}

export function saveCatalogs(storage,catalogs){
  storage.set(CATALOG_STORAGE_KEY,catalogs);
}

export function hasEquivalentDuplicate(catalogs,key,value,ignoreValue=null){
  const normalized = normalizeCatalogValue(value);
  return (catalogs[key] || []).some(item => {
    if (ignoreValue !== null && item === ignoreValue) return false;
    return normalizeCatalogValue(item) === normalized;
  });
}

export function addCatalogItem(catalogs,key,value){
  const clean = String(value).trim().replace(/\s+/g,' ');
  if (!clean) return {ok:false,reason:'empty'};
  if (key === 'unidades' && isAlGustoUnit(clean)) return {ok:false,reason:'reserved'};
  if (hasEquivalentDuplicate(catalogs,key,clean)) return {ok:false,reason:'duplicate'};
  catalogs[key].push(clean);
  return {ok:true,value:clean};
}

export function editCatalogItem(catalogs,key,originalValue,value){
  const clean = String(value).trim().replace(/\s+/g,' ');
  if (!clean) return {ok:false,reason:'empty'};
  if (key === 'unidades' && isAlGustoUnit(clean)) return {ok:false,reason:'reserved'};
  if (hasEquivalentDuplicate(catalogs,key,clean,originalValue)) return {ok:false,reason:'duplicate'};
  const index = catalogs[key].indexOf(originalValue);
  if (index === -1) return {ok:false,reason:'missing'};
  catalogs[key][index] = clean;
  return {ok:true,value:clean};
}

export function deleteCatalogItem(catalogs,key,value){
  const index = catalogs[key].indexOf(value);
  if (index === -1) return {ok:false,reason:'missing'};
  catalogs[key].splice(index,1);
  return {ok:true};
}
