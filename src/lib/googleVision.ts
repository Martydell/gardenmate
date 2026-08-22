const ENDPOINT = 'https://vision.googleapis.com/v1/images:annotate';

// Google Vision's generic object-localization labels that plausibly cover a
// single plant/pot in a garden or room photo. It has no plant-species
// concept of its own — this only narrows down "where in the photo is
// something plant-shaped", species identification still happens via
// Plant.id on each cropped region afterward.
const PLANT_LABELS = new Set([
  'Plant',
  'Houseplant',
  'Flower',
  'Flowerpot',
  'Tree',
  'Shrub',
  'Vegetable',
  'Fruit',
  'Herb',
  'Leaf',
  'Flowering plant',
]);

export interface DetectedPlantRegion {
  label: string;
  score: number;
  // Normalized 0–1 coordinates, relative to image width/height.
  box: { xMin: number; yMin: number; xMax: number; yMax: number };
}

function getApiKey(): string | undefined {
  return import.meta.env.VITE_GOOGLE_VISION_API_KEY;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function detectPlantRegions(file: File): Promise<DetectedPlantRegion[]> {
  const apiKey = getApiKey();
  if (!apiKey) return [];

  try {
    const base64 = await fileToBase64(file);
    const response = await fetch(`${ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [
          {
            image: { content: base64 },
            features: [{ type: 'OBJECT_LOCALIZATION', maxResults: 20 }],
          },
        ],
      }),
    });

    if (!response.ok) return [];

    const json = await response.json();
    const objects = json?.responses?.[0]?.localizedObjectAnnotations ?? [];

    return objects
      .filter((obj: { name?: string }) => obj.name && PLANT_LABELS.has(obj.name))
      .map((obj: { name: string; score: number; boundingPoly: { normalizedVertices: { x?: number; y?: number }[] } }) => {
        const vertices = obj.boundingPoly.normalizedVertices;
        const xs = vertices.map((v) => v.x ?? 0);
        const ys = vertices.map((v) => v.y ?? 0);
        return {
          label: obj.name,
          score: obj.score,
          box: {
            xMin: Math.min(...xs),
            yMin: Math.min(...ys),
            xMax: Math.max(...xs),
            yMax: Math.max(...ys),
          },
        };
      });
  } catch {
    return [];
  }
}
