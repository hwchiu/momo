import { useState } from 'react';
import type { VedicInput, VedicAyanamsha } from '../types/vedic';
import { AYANAMSHA_NAMES } from '../types/vedic';
import type { BirthData } from '../types/astro';
import { geocode } from '../lib/geocode';
import type { GeocodingResult } from '../lib/geocode';

interface VedicFormProps {
  onSubmit: (input: VedicInput) => void;
  isLoading?: boolean;
}

const TIMEZONES = [
  { label: 'GMT-12', value: -12 }, { label: 'GMT-11', value: -11 }, { label: 'GMT-10', value: -10 },
  { label: 'GMT-9', value: -9 }, { label: 'GMT-8', value: -8 }, { label: 'GMT-7', value: -7 },
  { label: 'GMT-6', value: -6 }, { label: 'GMT-5', value: -5 }, { label: 'GMT-4', value: -4 },
  { label: 'GMT-3', value: -3 }, { label: 'GMT-2', value: -2 }, { label: 'GMT-1', value: -1 },
  { label: 'GMT+0 (UTC)', value: 0 }, { label: 'GMT+1', value: 1 }, { label: 'GMT+2', value: 2 },
  { label: 'GMT+3', value: 3 }, { label: 'GMT+4', value: 4 }, { label: 'GMT+5', value: 5 },
  { label: 'GMT+5:30 (印度)', value: 5.5 }, { label: 'GMT+6', value: 6 }, { label: 'GMT+7', value: 7 },
  { label: 'GMT+8 (台灣/中國)', value: 8 }, { label: 'GMT+9 (日本/韓國)', value: 9 },
  { label: 'GMT+10', value: 10 }, { label: 'GMT+11', value: 11 }, { label: 'GMT+12', value: 12 },
];

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
  const [geoResults, setGeoResults] = useState<GeocodingResult[]>([]);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState('');

  function decimalToDMS(decimal: number) {
    const abs = Math.abs(decimal);
    return { deg: Math.floor(abs), min: Math.round((abs % 1) * 60) };
  }

  const handleGeoSearch = async () => {
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
    setGeoResults([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const [yearStr, monthStr, dayStr] = dateStr.split('-');
    let year = parseInt(yearStr, 10);
    let month = parseInt(monthStr, 10);
    let day = parseInt(dayStr, 10);
    const [hourStr, minuteStr] = timeStr.split(':');
    let hour = parseInt(hourStr, 10);
    let minute = parseInt(minuteStr, 10);

    // Convert local time → UTC
    const totalMinutes = hour * 60 + minute - Math.round(tzOffset * 60);
    let dayOffset = 0;
    if (totalMinutes < 0) dayOffset = -1;
    else if (totalMinutes >= 24 * 60) dayOffset = 1;
    const utcMinutes = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
    hour = Math.floor(utcMinutes / 60);
    minute = utcMinutes % 60;
    if (dayOffset !== 0) {
      const d = new Date(year, month - 1, day + dayOffset);
      year = d.getFullYear();
      month = d.getMonth() + 1;
      day = d.getDate();
    }

    const lat = (latDeg + latMin / 60) * (latDir === 'S' ? -1 : 1);
    const lon = (lonDeg + lonMin / 60) * (lonDir === 'W' ? -1 : 1);

    const birthData: BirthData = { year, month, day, hour, minute, latitude: lat, longitude: lon, locationName };
    onSubmit({ ...birthData, ayanamsha });
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
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleGeoSearch(); } }}
                  className="form-input form-input-wide"
                  placeholder="城市名稱"
                />
                <button
                  type="button"
                  className="submit-btn"
                  style={{ padding: '3px 10px', fontSize: '12px', marginLeft: '4px' }}
                  onClick={handleGeoSearch}
                  disabled={geoLoading}
                >
                  {geoLoading ? '查詢中' : '搜尋'}
                </button>
                {geoError && <div style={{ fontSize: '11px', color: '#c00', marginTop: '2px' }}>{geoError}</div>}
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
          <tr>
            <td colSpan={2} className="form-submit-cell">
              <button type="submit" className="submit-btn" disabled={isLoading}>
                {isLoading ? '計算中...' : '製作命盤'}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </form>
  );
}
