/** Geocoding result from OpenStreetMap Nominatim */
export interface GeocodingResult {
  latitude: number;
  longitude: number;
  displayName: string;
}

/** Raw Nominatim API response item */
interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

/**
 * Geocode a location query using OpenStreetMap Nominatim API.
 * Respects Nominatim usage policy (User-Agent header required).
 */
export async function geocode(query: string): Promise<GeocodingResult[]> {
  if (!query.trim()) return [];

  const params = new URLSearchParams({
    q: query,
    format: 'json',
    limit: '5',
    addressdetails: '0',
  });

  const response = await fetch(`${NOMINATIM_URL}?${params}`, {
    headers: {
      'User-Agent': 'MomoAstrologyChart/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`Geocoding failed: ${response.statusText}`);
  }

  const data: NominatimResult[] = await response.json();

  return data.map((item) => ({
    latitude: parseFloat(item.lat),
    longitude: parseFloat(item.lon),
    displayName: item.display_name,
  }));
}

/**
 * Debounced geocode for use with autocomplete inputs.
 * Returns a function that can be called repeatedly; only the last call
 * within the delay window will execute.
 */
export function createDebouncedGeocode(delayMs = 500) {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return (query: string): Promise<GeocodingResult[]> => {
    return new Promise((resolve, reject) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        geocode(query).then(resolve).catch(reject);
      }, delayMs);
    });
  };
}
