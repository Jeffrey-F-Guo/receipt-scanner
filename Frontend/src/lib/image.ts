// Textract's synchronous API rejects files over 10MB, and phone photos (especially
// HEIC converted to JPEG) often exceed that. Receipts only need ~150 DPI text, so
// downscale and re-encode large images before upload.
export const MAX_IMAGE_EDGE = 2500;
const MAX_UNTOUCHED_BYTES = 4 * 1024 * 1024;
const JPEG_QUALITY = 0.85;

export function fitWithin(width: number, height: number, maxEdge: number) {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

export function needsShrink(width: number, height: number, bytes: number): boolean {
  return Math.max(width, height) > MAX_IMAGE_EDGE || bytes > MAX_UNTOUCHED_BYTES;
}

export function jpegName(name: string): string {
  if (/\.jpe?g$/i.test(name)) return name;
  const dot = name.lastIndexOf('.');
  return `${dot > 0 ? name.slice(0, dot) : name}.jpg`;
}

// Returns a smaller JPEG, or the original file if it's already small or can't be decoded.
export async function shrinkImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file;

  try {
    const bitmap = await createImageBitmap(file);
    if (!needsShrink(bitmap.width, bitmap.height, file.size)) {
      bitmap.close();
      return file;
    }

    const { width, height } = fitWithin(bitmap.width, bitmap.height, MAX_IMAGE_EDGE);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>(resolve =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
    );
    if (!blob) return file;
    return new File([blob], jpegName(file.name), { type: 'image/jpeg' });
  } catch (error) {
    console.error(`Could not resize ${file.name}; uploading original`, error);
    return file;
  }
}
