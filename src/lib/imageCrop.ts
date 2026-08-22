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
