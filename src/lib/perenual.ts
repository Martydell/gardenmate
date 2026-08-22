import type { PerenualSpeciesDetails, PerenualSpeciesSummary } from '../types';

const BASE_URL = 'https://perenual.com/api/v2';

// Perenual's free tier has a low daily request quota, so successful lookups
// are cached in memory for the life of the session rather than re-fetched
// every time a tab is revisited.
const searchCache = new Map<string, PerenualSpeciesSummary[]>();
const detailsCache = new Map<number, PerenualSpeciesDetails>();

function getApiKey(): string | undefined {
  return import.meta.env.VITE_PERENUAL_API_KEY;
}

export async function searchPlants(query: string): Promise<PerenualSpeciesSummary[]> {
  const trimmed = query.trim();
  const apiKey = getApiKey();
  if (!trimmed || !apiKey) return [];

  const cacheKey = trimmed.toLowerCase();
  const cached = searchCache.get(cacheKey);
  if (cached) return cached;

  try {
    const url = `${BASE_URL}/species-list?key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(trimmed)}`;
    const response = await fetch(url);
    if (!response.ok) return [];

    const json = await response.json();
    const results = (json?.data ?? []) as PerenualSpeciesSummary[];
    searchCache.set(cacheKey, results);
    return results;
  } catch {
    return [];
  }
}

// Perenual's search only matches when the query is a substring of its
// stored common/scientific name, so a multi-word name like "Chilli de
// Cayenne" can come back empty even though "Cayenne" alone would hit (it's
// indexed as "cayenne pepper"). Retry word-by-word, longest first, as a
// best-effort fallback before giving up.
export async function searchPlantsResilient(query: string): Promise<PerenualSpeciesSummary[]> {
  const direct = await searchPlants(query);
  if (direct.length > 0) return direct;

  const words = query
    .split(/\s+/)
    .filter((word) => word.length > 2)
    .sort((a, b) => b.length - a.length);

  for (const word of words) {
    const results = await searchPlants(word);
    if (results.length > 0) return results;
  }

  return [];
}

export async function getPlantDetails(id: number): Promise<PerenualSpeciesDetails | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const cached = detailsCache.get(id);
  if (cached) return cached;

  try {
    const url = `${BASE_URL}/species/details/${id}?key=${encodeURIComponent(apiKey)}`;
    const response = await fetch(url);
    if (!response.ok) return null;

    const details = (await response.json()) as PerenualSpeciesDetails;
    detailsCache.set(id, details);
    return details;
  } catch {
    return null;
  }
}
