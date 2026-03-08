/**
 * SynastryForm — Dual person input form for synastry analysis.
 * Each person has name, birth date/time, location (with geocoding), timezone, and house system.
 * Form format mirrors BirthDataForm exactly.
 */

import { useState } from 'react';
import type { BirthData } from '../types/astro';
import { HouseSystem, HOUSE_SYSTEM_INFO } from '../types/astro';
import { geocode } from '../lib/geocode';
import type { GeocodingResult } from '../lib/geocode';
import type { SynastryInput } from '../types/synastry';

const TIMEZONES = [
  { label: 'GMT-12', value: -12 },
  { label: 'GMT-11', value: -11 },
  { label: 'GMT-10', value: -10 },
  { label: 'GMT-9', value: -9 },
  { label: 'GMT-8', value: -8 },
  { label: 'GMT-7', value: -7 },
  { label: 'GMT-6', value: -6 },
  { label: 'GMT-5', value: -5 },
  { label: 'GMT-4', value: -4 },
  { label: 'GMT-3', value: -3 },
  { label: 'GMT-2', value: -2 },
  { label: 'GMT-1', value: -1 },
  { label: 'GMT+0 (UTC)', value: 0 },
  { label: 'GMT+1', value: 1 },
  { label: 'GMT+2', value: 2 },
  { label: 'GMT+3', value: 3 },
  { label: 'GMT+4', value: 4 },
  { label: 'GMT+5', value: 5 },
  { label: 'GMT+5:30 (印度)', value: 5.5 },
  { label: 'GMT+6', value: 6 },
  { label: 'GMT+7', value: 7 },
  { label: 'GMT+8 (台灣/中國/香港)', value: 8 },
  { label: 'GMT+9 (日本/韓國)', value: 9 },
  { label: 'GMT+10', value: 10 },
  { label: 'GMT+11', value: 11 },
  { label: 'GMT+12', value: 12 },
];

interface PersonState {
  name: string;
  dateStr: string;    // 'YYYY-MM-DD'
  timeStr: string;    // 'HH:MM'
  locationName: string;
  latDeg: number;
  latMin: number;
  latDir: 'N' | 'S';
  lonDeg: number;
  lonMin: number;
  lonDir: 'E' | 'W';
  tzOffset: number;
  houseSystem: HouseSystem;
}

function defaultPerson(name: string): PersonState {
  return {
    name,
    dateStr: '1990-01-01',
    timeStr: '12:00',
    locationName: '台北市',
    latDeg: 25,
    latMin: 3,
    latDir: 'N',
    lonDeg: 121,
    lonMin: 30,
    lonDir: 'E',
    tzOffset: 8,
    houseSystem: HouseSystem.Placidus,
  };
}

function decimalToDMS(decimal: number): { deg: number; min: number } {
  const abs = Math.abs(decimal);
  return { deg: Math.floor(abs), min: Math.round((abs % 1) * 60) };
}

function parsePerson(p: PersonState): { name: string; birthData: BirthData; houseSystem: HouseSystem } | null {
  if (!p.name.trim() || !p.dateStr || !p.timeStr || !p.locationName.trim()) return null;
  const [yearStr, monthStr, dayStr] = p.dateStr.split('-');
  let year = parseInt(yearStr, 10);
  let month = parseInt(monthStr, 10);
  let day = parseInt(dayStr, 10);
  const [hourStr, minuteStr] = p.timeStr.split(':');
  let hour = parseInt(hourStr, 10);
  let minute = parseInt(minuteStr, 10);
  if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hour) || isNaN(minute)) return null;

  // Convert local time → UTC
  const totalMinutes = hour * 60 + minute - Math.round(p.tzOffset * 60);
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

  const lat = (p.latDeg + p.latMin / 60) * (p.latDir === 'S' ? -1 : 1);
  const lon = (p.lonDeg + p.lonMin / 60) * (p.lonDir === 'W' ? -1 : 1);

  return {
    name: p.name.trim(),
    birthData: { year, month, day, hour, minute, latitude: lat, longitude: lon, locationName: p.locationName },
    houseSystem: p.houseSystem,
  };
}

// Per-person form — mirrors BirthDataForm layout exactly
function PersonInput({
  label,
  person,
  onChange,
  colorClass,
}: {
  label: string;
  person: PersonState;
  onChange: (next: PersonState) => void;
  colorClass: string;
}) {
  const [geoResults, setGeoResults] = useState<GeocodingResult[]>([]);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState('');

  const set = <K extends keyof PersonState>(key: K, val: PersonState[K]) =>
    onChange({ ...person, [key]: val });

  const handleGeoSearch = async () => {
    if (!person.locationName.trim()) return;
    setGeoLoading(true);
    setGeoError('');
    setGeoResults([]);
    try {
      const results = await geocode(person.locationName);
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
    onChange({
      ...person,
      locationName: r.displayName.split(',')[0],
      latDeg: latDMS.deg,
      latMin: latDMS.min,
      latDir: r.latitude >= 0 ? 'N' : 'S',
      lonDeg: lonDMS.deg,
      lonMin: lonDMS.min,
      lonDir: r.longitude >= 0 ? 'E' : 'W',
    });
    setGeoResults([]);
  };

  return (
    <div className={`synastry-person-block ${colorClass}`}>
      <div className="synastry-person-label">{label}</div>

      <form className="quick-chart-form">
        <table className="form-table" cellPadding={3} cellSpacing={0}>
          <tbody>
            <tr>
              <td className="form-label">姓名</td>
              <td>
                <input
                  type="text"
                  value={person.name}
                  onChange={(e) => set('name', e.target.value)}
                  className="form-input form-input-wide"
                  placeholder="輸入姓名"
                  aria-label={`${label} 姓名`}
                />
              </td>
            </tr>
            <tr>
              <td className="form-label">日期</td>
              <td>
                <input
                  type="date"
                  value={person.dateStr}
                  onChange={(e) => set('dateStr', e.target.value)}
                  className="form-input"
                  aria-label={`${label} 日期`}
                />
              </td>
            </tr>
            <tr>
              <td className="form-label">時間</td>
              <td>
                <input
                  type="time"
                  value={person.timeStr}
                  onChange={(e) => set('timeStr', e.target.value)}
                  className="form-input"
                  aria-label={`${label} 時間`}
                />
              </td>
            </tr>
            <tr>
              <td className="form-label">地點名稱</td>
              <td>
                <div className="location-wrapper">
                  <input
                    type="text"
                    value={person.locationName}
                    onChange={(e) => set('locationName', e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleGeoSearch(); } }}
                    className="form-input form-input-wide"
                    placeholder="城市名稱"
                    aria-label={`${label} 地點名稱`}
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
                <input
                  type="number"
                  min={0}
                  max={90}
                  value={person.latDeg}
                  onChange={(e) => set('latDeg', parseInt(e.target.value, 10) || 0)}
                  className="form-input form-input-dms"
                  aria-label={`${label} 緯度度數`}
                />
                <span className="dms-sep">°</span>
                <select
                  value={person.latDir}
                  onChange={(e) => set('latDir', e.target.value as 'N' | 'S')}
                  className="form-select-dir"
                  aria-label={`${label} 緯度方向`}
                >
                  <option value="N">N 北</option>
                  <option value="S">S 南</option>
                </select>
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={person.latMin}
                  onChange={(e) => set('latMin', parseInt(e.target.value, 10) || 0)}
                  className="form-input form-input-dms"
                  aria-label={`${label} 緯度分數`}
                />
                <span className="dms-sep">'</span>
              </td>
            </tr>
            <tr>
              <td className="form-label">東經/西經</td>
              <td className="dms-cell">
                <input
                  type="number"
                  min={0}
                  max={180}
                  value={person.lonDeg}
                  onChange={(e) => set('lonDeg', parseInt(e.target.value, 10) || 0)}
                  className="form-input form-input-dms"
                  aria-label={`${label} 經度度數`}
                />
                <span className="dms-sep">°</span>
                <select
                  value={person.lonDir}
                  onChange={(e) => set('lonDir', e.target.value as 'E' | 'W')}
                  className="form-select-dir"
                  aria-label={`${label} 經度方向`}
                >
                  <option value="E">E 東</option>
                  <option value="W">W 西</option>
                </select>
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={person.lonMin}
                  onChange={(e) => set('lonMin', parseInt(e.target.value, 10) || 0)}
                  className="form-input form-input-dms"
                  aria-label={`${label} 經度分數`}
                />
                <span className="dms-sep">'</span>
              </td>
            </tr>
            <tr>
              <td className="form-label">時區</td>
              <td>
                <select
                  value={person.tzOffset}
                  onChange={(e) => set('tzOffset', parseFloat(e.target.value))}
                  className="form-select"
                  aria-label={`${label} 時區`}
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>{tz.label}</option>
                  ))}
                </select>
              </td>
            </tr>
            <tr>
              <td className="form-label">宮位制度</td>
              <td>
                <select
                  value={person.houseSystem}
                  onChange={(e) => set('houseSystem', e.target.value as HouseSystem)}
                  className="form-select"
                  aria-label={`${label} 宮位制度`}
                >
                  {Object.entries(HOUSE_SYSTEM_INFO).map(([key, info]) => (
                    <option key={key} value={key}>{info.name}</option>
                  ))}
                </select>
              </td>
            </tr>
          </tbody>
        </table>
      </form>
    </div>
  );
}

interface SynastryFormProps {
  onSubmit: (input: SynastryInput) => void;
  isLoading: boolean;
}

export function SynastryForm({ onSubmit, isLoading }: SynastryFormProps) {
  const [personA, setPersonA] = useState<PersonState>(defaultPerson('本命人（A）'));
  const [personB, setPersonB] = useState<PersonState>(defaultPerson('對象（B）'));
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const a = parsePerson(personA);
    const b = parsePerson(personB);
    if (!a) { setFormError('請完整填寫本命人（A）的資料'); return; }
    if (!b) { setFormError('請完整填寫對象（B）的資料'); return; }
    setFormError(null);
    onSubmit({
      nameA: a.name, birthDataA: a.birthData, houseSystemA: a.houseSystem,
      nameB: b.name, birthDataB: b.birthData, houseSystemB: b.houseSystem,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="synastry-form">
      <div className="synastry-persons-grid">
        <PersonInput label="本命人（A）" person={personA} onChange={setPersonA} colorClass="person-a" />
        <PersonInput label="對象（B）" person={personB} onChange={setPersonB} colorClass="person-b" />
      </div>

      {formError && <div className="error-banner">{formError}</div>}

      <div className="synastry-submit-row">
        <button type="submit" className="submit-btn" disabled={isLoading}>
          {isLoading ? '✦ 推算中⋯' : '✦ 計算合盤'}
        </button>
      </div>
    </form>
  );
}
