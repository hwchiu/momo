/**
 * SynastryForm — Dual person input form for synastry analysis.
 * Each person has name, birth date/time, and location (with geocoding).
 */

import { useState, useCallback, useRef } from 'react';
import type { BirthData } from '../types/astro';
import { HouseSystem } from '../types/astro';
import { createDebouncedGeocode } from '../lib/geocode';
import type { GeocodingResult } from '../lib/geocode';
import type { SynastryInput } from '../types/synastry';

interface PersonState {
  name: string;
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
  locationName: string;
  latitude: string;
  longitude: string;
  houseSystem: HouseSystem;
}

function defaultPerson(name: string): PersonState {
  return {
    name,
    year: '1990',
    month: '6',
    day: '15',
    hour: '12',
    minute: '0',
    locationName: '台北市',
    latitude: '25.05',
    longitude: '121.5',
    houseSystem: HouseSystem.Placidus,
  };
}

function parsePerson(p: PersonState): { name: string; birthData: BirthData; houseSystem: HouseSystem } | null {
  const year = parseInt(p.year);
  const month = parseInt(p.month);
  const day = parseInt(p.day);
  const hour = parseInt(p.hour);
  const minute = parseInt(p.minute);
  const lat = parseFloat(p.latitude);
  const lon = parseFloat(p.longitude);
  if (
    isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hour) || isNaN(minute) ||
    isNaN(lat) || isNaN(lon) || !p.name.trim() || !p.locationName.trim()
  ) return null;
  return {
    name: p.name.trim(),
    birthData: { year, month, day, hour, minute, latitude: lat, longitude: lon, locationName: p.locationName },
    houseSystem: p.houseSystem,
  };
}

// Per-person geocoding section (controlled sub-component)
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
  const debouncedGeo = useRef(createDebouncedGeocode(600)).current;

  const set = (key: keyof PersonState, val: string) => onChange({ ...person, [key]: val });

  const handleLocationChange = useCallback(
    async (query: string) => {
      set('locationName', query);
      if (query.trim().length < 2) { setGeoResults([]); return; }
      setGeoLoading(true);
      try {
        const results = await debouncedGeo(query);
        setGeoResults(results);
      } catch {
        setGeoResults([]);
      } finally {
        setGeoLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [person],
  );

  const selectGeo = (r: GeocodingResult) => {
    onChange({
      ...person,
      locationName: r.displayName.split(',')[0].trim(),
      latitude: r.latitude.toFixed(4),
      longitude: r.longitude.toFixed(4),
    });
    setGeoResults([]);
  };

  const years = Array.from({ length: 181 }, (_, i) => 1920 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  return (
    <div className={`synastry-person-block ${colorClass}`}>
      <div className="synastry-person-label">{label}</div>

      <table className="quick-chart-form" cellPadding={4} cellSpacing={0}>
        <tbody>
          <tr>
            <td className="form-label">姓名</td>
            <td colSpan={3}>
              <input
                className="form-text-input"
                type="text"
                placeholder="輸入姓名"
                value={person.name}
                onChange={(e) => set('name', e.target.value)}
                style={{ width: '100%' }}
              />
            </td>
          </tr>
          <tr>
            <td className="form-label">出生日期</td>
            <td>
              <select className="form-select" value={person.year} onChange={(e) => set('year', e.target.value)}>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              {' '}年
            </td>
            <td>
              <select className="form-select" value={person.month} onChange={(e) => set('month', e.target.value)}>
                {months.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              {' '}月
            </td>
            <td>
              <select className="form-select" value={person.day} onChange={(e) => set('day', e.target.value)}>
                {days.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              {' '}日
            </td>
          </tr>
          <tr>
            <td className="form-label">出生時間</td>
            <td>
              <select className="form-select" value={person.hour} onChange={(e) => set('hour', e.target.value)}>
                {hours.map((h) => <option key={h} value={h}>{String(h).padStart(2, '0')}時</option>)}
              </select>
            </td>
            <td>
              <select className="form-select" value={person.minute} onChange={(e) => set('minute', e.target.value)}>
                {minutes.map((m) => <option key={m} value={m}>{String(m).padStart(2, '0')}分</option>)}
              </select>
            </td>
            <td>
              <small className="form-note">UTC時間</small>
            </td>
          </tr>
          <tr>
            <td className="form-label">出生地點</td>
            <td colSpan={3} style={{ position: 'relative' }}>
              <input
                className="form-text-input"
                type="text"
                placeholder="輸入城市名稱搜尋"
                value={person.locationName}
                onChange={(e) => handleLocationChange(e.target.value)}
                style={{ width: '100%' }}
              />
              {geoLoading && <span className="geo-searching"> 搜尋中...</span>}
              {geoResults.length > 0 && (
                <ul className="geo-dropdown">
                  {geoResults.slice(0, 5).map((r, i) => (
                    <li key={i} className="geo-dropdown-item" onClick={() => selectGeo(r)}>
                      {r.displayName}
                    </li>
                  ))}
                </ul>
              )}
            </td>
          </tr>
          <tr>
            <td className="form-label">緯度 / 經度</td>
            <td>
              <input
                className="form-text-input"
                type="number" step="0.0001"
                value={person.latitude}
                onChange={(e) => set('latitude', e.target.value)}
                style={{ width: '80px' }}
              />
            </td>
            <td>
              <input
                className="form-text-input"
                type="number" step="0.0001"
                value={person.longitude}
                onChange={(e) => set('longitude', e.target.value)}
                style={{ width: '80px' }}
              />
            </td>
            <td></td>
          </tr>
          <tr>
            <td className="form-label">宮位制</td>
            <td colSpan={3}>
              <select
                className="form-select"
                value={person.houseSystem}
                onChange={(e) => onChange({ ...person, houseSystem: e.target.value as HouseSystem })}
              >
                {Object.values(HouseSystem).map((hs) => (
                  <option key={hs} value={hs}>{hs}</option>
                ))}
              </select>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

interface SynastryFormProps {
  onSubmit: (input: SynastryInput) => void;
  isLoading: boolean;
  /** If provided, show a "載入A" button to prefill Person A from the current natal chart */
  currentChartData?: BirthData;
}

export function SynastryForm({ onSubmit, isLoading, currentChartData }: SynastryFormProps) {
  const [personA, setPersonA] = useState<PersonState>(defaultPerson('本命人（A）'));
  const [personB, setPersonB] = useState<PersonState>(defaultPerson('對象（B）'));
  const [formError, setFormError] = useState<string | null>(null);

  const loadCurrentChart = () => {
    if (!currentChartData) return;
    const d = currentChartData;
    setPersonA((prev) => ({
      ...prev,
      year: String(d.year),
      month: String(d.month),
      day: String(d.day),
      hour: String(d.hour),
      minute: String(d.minute),
      locationName: d.locationName,
      latitude: String(d.latitude),
      longitude: String(d.longitude),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const a = parsePerson(personA);
    const b = parsePerson(personB);
    if (!a) { setFormError('請完整填寫本命人（A）的資料'); return; }
    if (!b) { setFormError('請完整填寫對象（B）的資料'); return; }
    setFormError(null);
    onSubmit({ ...a, nameA: a.name, birthDataA: a.birthData, houseSystemA: a.houseSystem,
               nameB: b.name, birthDataB: b.birthData, houseSystemB: b.houseSystem });
  };

  return (
    <form onSubmit={handleSubmit} className="synastry-form">
      {currentChartData && (
        <div className="synastry-load-hint">
          <button type="button" className="synastry-load-btn" onClick={loadCurrentChart}>
            ← 從目前星盤載入 A
          </button>
        </div>
      )}

      <div className="synastry-persons-grid">
        <PersonInput label="🔵 本命人（A）" person={personA} onChange={setPersonA} colorClass="person-a" />
        <PersonInput label="🔴 對象（B）" person={personB} onChange={setPersonB} colorClass="person-b" />
      </div>

      {formError && <div className="error-banner">{formError}</div>}

      <div className="synastry-submit-row">
        <button type="submit" className="submit-btn" disabled={isLoading}>
          {isLoading ? '計算中...' : '✦ 計算合盤'}
        </button>
      </div>
    </form>
  );
}
