import { useState } from 'react';
import { geocode } from '../lib/geocode';
import type { GeocodingResult } from '../lib/geocode';

export interface GeoSearchState {
  geoLoading: boolean;
  geoError: string;
  geoResults: GeocodingResult[];
  search: (locationName: string) => Promise<void>;
  clearResults: () => void;
}

/** Shared geocoding search logic for all birth-data forms. */
export function useGeoSearch(): GeoSearchState {
  const [geoResults, setGeoResults] = useState<GeocodingResult[]>([]);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState('');

  const search = async (locationName: string) => {
    if (!locationName.trim()) return;
    setGeoLoading(true);
    setGeoError('');
    setGeoResults([]);
    try {
      const results = await geocode(locationName);
      if (results.length === 0) setGeoError('找不到地點，請換個關鍵字');
      else setGeoResults(results);
    } catch {
      setGeoError('地址查詢失敗，請稍後再試');
    } finally {
      setGeoLoading(false);
    }
  };

  const clearResults = () => setGeoResults([]);

  return { geoLoading, geoError, geoResults, search, clearResults };
}
