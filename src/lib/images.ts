/**
 * Compresión de fotos en el navegador antes de subirlas.
 * Redimensiona a un máximo de 1600 px en el lado mayor y convierte a JPEG
 * (formato compatible con la generación de PDF).
 */
const MAX_LADO = 1600;
const CALIDAD = 0.8;

export const TIPOS_ACEPTADOS = "image/jpeg,image/png,image/webp,image/heic,image/heif";

export async function comprimirImagen(file: File): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error(`No se pudo leer «${file.name}». Usa una foto JPG, PNG o WebP.`);
  }

  const escala = Math.min(1, MAX_LADO / Math.max(bitmap.width, bitmap.height));
  const ancho = Math.round(bitmap.width * escala);
  const alto = Math.round(bitmap.height * escala);

  const canvas = document.createElement("canvas");
  canvas.width = ancho;
  canvas.height = alto;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("El navegador no permite procesar imágenes.");
  // Fondo blanco para PNG con transparencia
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, ancho, alto);
  ctx.drawImage(bitmap, 0, 0, ancho, alto);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", CALIDAD));
  if (!blob) throw new Error(`No se pudo comprimir «${file.name}».`);
  return blob;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
