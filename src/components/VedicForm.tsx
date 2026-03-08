import { useState } from 'react';
import type { VedicInput, VedicAyanamsha } from '../types/vedic';
import { AYANAMSHA_NAMES } from '../types/vedic';
import type { GeocodingResult } from '../lib/geocode';
import { TIMEZONES, decimalToDMS, dmsToDecimal, localToUtc, validateCoords } from '../lib/formUtils';
import { useGeoSearch } from '../hooks/useGeoSearch';

interface VedicFormProps {
  onSubmit: (input: VedicInput) => void;
  isLoading?: boolean;
}

export function VedicForm({ onSubmit, isLoading = false }: VedicFormProps) {
  const [dateStr, setDateStr] = useState('1990-01-01');
  const [timeStr, setTimeStr] = useState('12:00');
  const [locationName, setLocationName] = useState('台北市');
  const [latDeg, setLatDeg] = useState(25);
  const [latMin, setLatMin] = useState(3);
  const [latDir, setLatDir] = useState<'N' | 'S'>('N');
  const [lonDeg, setLonDeg] = useState(121);
  const [lonMin, setLonMin] = useState(30);
  const [lonDir, setLonDir] = useState<'E' | 'W'>('E');
  const [tzOffset, setTzOffset] = useState(8);
  const [ayanamsha, setAyanamsha] = useState<VedicAyanamsha>('lahiri');

  const [coordError, setCoordError] = useState<string | null>(null);
  const { geoLoading, geoError, geoResults, search: searchGeo, clearResults } = useGeoSearch();

  const handleSelectGeo = (r: GeocodingResult) => {
    const latDMS = decimalToDMS(r.latitude);
    const lonDMS = decimalToDMS(r.longitude);
    setLatDeg(latDMS.deg);
    setLatMin(latDMS.min);
    setLatDir(r.latitude >= 0 ? 'N' : 'S');
    setLonDeg(lonDMS.deg);
    setLonMin(lonDMS.min);
    setLonDir(r.longitude >= 0 ? 'E' : 'W');
    setLocationName(r.displayName.split(',')[0]);
    clearResults();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const coordErr = validateCoords(latDeg, latMin, lonDeg, lonMin);
    if (coordErr) { setCoordError(coordErr); return; }
    setCoordError(null);
    const utc = localToUtc(dateStr, timeStr, tzOffset);
    if (!utc) return;
    onSubmit({
      ...utc,
      latitude: dmsToDecimal(latDeg, latMin, latDir),
      longitude: dmsToDecimal(lonDeg, lonMin, lonDir),
      locationName,
      ayanamsha,
    });
  };

  return (
    <form className="quick-chart-form" onSubmit={handleSubmit}>
      <table className="form-table" cellPadding={3} cellSpacing={0}>
        <tbody>
          <tr>
            <td className="form-label">日期</td>
            <td>
              <input type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)} className="form-input" />
            </td>
          </tr>
          <tr>
            <td className="form-label">時間</td>
            <td>
              <input type="time" value={timeStr} onChange={(e) => setTimeStr(e.target.value)} className="form-input" />
            </td>
          </tr>
          <tr>
            <td className="form-label">地點名稱</td>
            <td>
              <div className="location-wrapper">
                <input
                  type="text"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); searchGeo(locationName); } }}
                  className="form-input form-input-wide"
                  placeholder="城市名稱"
                />
                <button
                  type="button"
                  className="geo-search-btn"
                  onClick={() => searchGeo(locationName)}
                  disabled={geoLoading}
                >
                  {geoLoading ? '查詢中' : '搜尋'}
                </button>
                {geoError && <div className="geo-error">{geoError}</div>}
                {geoResults.length > 0 && (
                  <ul className="geo-results">
                    {geoResults.map((r, i) => (
                      <li key={i} onClick={() => handleSelectGeo(r)}>{r.displayName}</li>
                    ))}
                  </ul>
                )}
              </div>
            </td>
          </tr>
          <tr>
            <td className="form-label">北緯/南緯</td>
            <td className="dms-cell">
              <input type="number" min={0} max={90} value={latDeg} onChange={(e) => setLatDeg(parseInt(e.target.value, 10) || 0)} className="form-input form-input-dms" />
              <span className="dms-sep">°</span>
              <select value={latDir} onChange={(e) => setLatDir(e.target.value as 'N' | 'S')} className="form-select-dir">
                <option value="N">N 北</option>
                <option value="S">S 南</option>
              </select>
              <input type="number" min={0} max={59} value={latMin} onChange={(e) => setLatMin(parseInt(e.target.value, 10) || 0)} className="form-input form-input-dms" />
              <span className="dms-sep">'</span>
            </td>
          </tr>
          <tr>
            <td className="form-label">東經/西經</td>
            <td className="dms-cell">
              <input type="number" min={0} max={180} value={lonDeg} onChange={(e) => setLonDeg(parseInt(e.target.value, 10) || 0)} className="form-input form-input-dms" />
              <span className="dms-sep">°</span>
              <select value={lonDir} onChange={(e) => setLonDir(e.target.value as 'E' | 'W')} className="form-select-dir">
                <option value="E">E 東</option>
                <option value="W">W 西</option>
              </select>
              <input type="number" min={0} max={59} value={lonMin} onChange={(e) => setLonMin(parseInt(e.target.value, 10) || 0)} className="form-input form-input-dms" />
              <span className="dms-sep">'</span>
            </td>
          </tr>
          <tr>
            <td className="form-label">時區</td>
            <td>
              <select value={tzOffset} onChange={(e) => setTzOffset(parseFloat(e.target.value))} className="form-select">
                {TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>{tz.label}</option>
                ))}
              </select>
            </td>
          </tr>
          <tr>
            <td className="form-label">歲差系統</td>
            <td>
              <select value={ayanamsha} onChange={(e) => setAyanamsha(e.target.value as VedicAyanamsha)} className="form-select">
                {(Object.entries(AYANAMSHA_NAMES) as [VedicAyanamsha, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </td>
          </tr>
          {coordError && (
            <tr>
              <td colSpan={2}>
                <div className="geo-error" role="alert">{coordError}</div>
              </td>
            </tr>
          )}
          <tr>
            <td colSpan={2} className="form-submit-cell">
              <button type="submit" className="submit-btn" disabled={isLoading}>
                {isLoading ? '✦ 推算中⋯' : '✦ 製作命盤'}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </form>
  );
}
