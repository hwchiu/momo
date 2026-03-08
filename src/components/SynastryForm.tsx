/**
 * SynastryForm — Dual person input form for synastry analysis.
 * Each person has name, birth date/time, location (with geocoding), timezone, and house system.
 */

import { useState } from 'react';
import type { BirthData } from '../types/astro';
import { HouseSystem, HOUSE_SYSTEM_INFO } from '../types/astro';
import type { GeocodingResult } from '../lib/geocode';
import type { SynastryInput } from '../types/synastry';
import { TIMEZONES, decimalToDMS, dmsToDecimal, localToUtc, validateCoords } from '../lib/formUtils';
import { useGeoSearch } from '../hooks/useGeoSearch';

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

function parsePerson(p: PersonState): { name: string; birthData: BirthData; houseSystem: HouseSystem } | null {
  if (!p.name.trim() || !p.dateStr || !p.timeStr || !p.locationName.trim()) return null;
  const utc = localToUtc(p.dateStr, p.timeStr, p.tzOffset);
  if (!utc) return null;
  return {
    name: p.name.trim(),
    birthData: {
      ...utc,
      latitude: dmsToDecimal(p.latDeg, p.latMin, p.latDir),
      longitude: dmsToDecimal(p.lonDeg, p.lonMin, p.lonDir),
      locationName: p.locationName,
    },
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
  const { geoLoading, geoError, geoResults, search: searchGeo, clearResults } = useGeoSearch();

  const set = <K extends keyof PersonState>(key: K, val: PersonState[K]) =>
    onChange({ ...person, [key]: val });

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
    clearResults();
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
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); searchGeo(person.locationName); } }}
                    className="form-input form-input-wide"
                    placeholder="城市名稱"
                    aria-label={`${label} 地點名稱`}
                  />
                  <button
                    type="button"
                    className="geo-search-btn"
                    onClick={() => searchGeo(person.locationName)}
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
    const coordErrA = validateCoords(personA.latDeg, personA.latMin, personA.lonDeg, personA.lonMin);
    if (coordErrA) { setFormError(`本命人（A）坐標錯誤：${coordErrA}`); return; }
    const coordErrB = validateCoords(personB.latDeg, personB.latMin, personB.lonDeg, personB.lonMin);
    if (coordErrB) { setFormError(`對象（B）坐標錯誤：${coordErrB}`); return; }
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
