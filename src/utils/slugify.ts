import slugifyLib from 'slugify';

/**
 * Generar slug único a partir de texto
 */
export const generateSlug = (text: string): string => {
  return slugifyLib(text, {
    lower: true,
    strict: true,
    remove: /[*+~.()'"!:@]/g,
  });
};

/**
 * Agregar timestamp al slug para hacerlo único
 */
export const generateUniqueSlug = (text: string): string => {
  const baseSlug = generateSlug(text);
  const timestamp = Date.now().toString(36);
  return `${baseSlug}-${timestamp}`;
};
