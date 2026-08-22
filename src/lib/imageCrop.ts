function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not load image for cropping'));
    };
    img.src = url;
  });
}

// A small margin around the detected box so the crop isn't cut flush
// against the plant's edges — helps Plant.id's identification, which does
// better with a bit of surrounding context.
const PADDING_RATIO = 0.08;

export async function cropImageRegion(
  file: File,
  box: { xMin: number; yMin: number; xMax: number; yMax: number },
): Promise<File> {
  const img = await loadImage(file);

  const boxWidth = box.xMax - box.xMin;
  const boxHeight = box.yMax - box.yMin;
  const xMin = Math.max(0, box.xMin - boxWidth * PADDING_RATIO);
  const yMin = Math.max(0, box.yMin - boxHeight * PADDING_RATIO);
  const xMax = Math.min(1, box.xMax + boxWidth * PADDING_RATIO);
  const yMax = Math.min(1, box.yMax + boxHeight * PADDING_RATIO);

  const sx = xMin * img.width;
  const sy = yMin * img.height;
  const sWidth = (xMax - xMin) * img.width;
  const sHeight = (yMax - yMin) * img.height;

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(sWidth));
  canvas.height = Math.max(1, Math.round(sHeight));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
  if (!blob) throw new Error('Could not encode cropped image');

  return new File([blob], `crop-${crypto.randomUUID()}.jpg`, { type: 'image/jpeg' });
}

const COMPRESS_MAX_DIMENSION = 1600;
const COMPRESS_JPEG_QUALITY = 0.85;
// Below this, the file is already small enough that compressing it isn't
// worth the CPU time or the (minor) quality loss.
const COMPRESS_SKIP_BELOW_BYTES = 500_000;

// Modern phone cameras routinely produce 3–10MB+ photos. Uploading those
// directly over a mobile connection is slow and, per Supabase's own storage
// source, can fail outright with a "No content provided" error when the
// upload stream gets interrupted before finishing — resizing/re-encoding
// client-side first makes uploads faster and meaningfully more reliable.
// Never throws: any failure just returns the original file untouched, so a
// compression bug can never be the reason an upload doesn't happen at all.
export async function compressImage(file: File): Promise<File> {
  if (file.size < COMPRESS_SKIP_BELOW_BYTES) return file;

  try {
    const img = await loadImage(file);
    const scale = Math.min(1, COMPRESS_MAX_DIMENSION / Math.max(img.width, img.height));
    if (scale >= 1) return file;

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', COMPRESS_JPEG_QUALITY),
    );
    if (!blob || blob.size >= file.size) return file;

    return new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' });
  } catch {
    return file;
  }
}
