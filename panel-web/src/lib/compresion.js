// Compresion automatica de fotos antes de subirlas: se reducen al maximo
// de 1920 px (suficiente para cualquier TV) y se guardan en WebP calidad
// alta, que pesa mucho menos que la foto original del celular.

const MAX_LADO = 1920;
const CALIDAD = 0.8;
export const MAX_VIDEO_MB = 20;

export async function comprimirImagen(file) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const escala = Math.min(1, MAX_LADO / Math.max(bitmap.width, bitmap.height));
    const ancho = Math.round(bitmap.width * escala);
    const alto = Math.round(bitmap.height * escala);

    const canvas = document.createElement('canvas');
    canvas.width = ancho;
    canvas.height = alto;
    canvas.getContext('2d').drawImage(bitmap, 0, 0, ancho, alto);
    bitmap.close?.();

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', CALIDAD));
    if (!blob || blob.size >= file.size) return file;

    const nombre = file.name.replace(/\.[^.]+$/, '') + '.webp';
    return new File([blob], nombre, { type: 'image/webp' });
  } catch (err) {
    return file;
  }
}

export function videoMuyPesado(file) {
  return file.size > MAX_VIDEO_MB * 1024 * 1024;
}
