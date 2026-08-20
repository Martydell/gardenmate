const BASE_URL = 'https://api.plant.id/v3/identification';

function getApiKey(): string | undefined {
  return import.meta.env.VITE_PLANT_ID_API_KEY;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // readAsDataURL yields "data:image/jpeg;base64,<data>" — the API wants
      // just the base64 payload.
      resolve(result.split(',')[1] ?? '');
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export interface PlantIdResult {
  name: string;
  probability: number;
}

export async function identifyPlant(file: File): Promise<PlantIdResult | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  try {
    const base64 = await fileToBase64(file);
    const response = await fetch(`${BASE_URL}?details=common_names`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': apiKey,
      },
      body: JSON.stringify({ images: [base64] }),
    });

    if (!response.ok) return null;

    const json = await response.json();
    if (json?.result?.is_plant?.binary === false) return null;

    const suggestions = json?.result?.classification?.suggestions;
    if (!Array.isArray(suggestions) || suggestions.length === 0) return null;

    const top = suggestions[0];
    const commonNames: string[] | undefined = top?.details?.common_names;
    const name: string | undefined = commonNames?.[0] || top?.name;
    if (!name || typeof top?.probability !== 'number') return null;

    return { name, probability: top.probability };
  } catch {
    return null;
  }
}
