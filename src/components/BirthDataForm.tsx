import { useState } from 'react';
import type { BirthData, OrbConfig } from '../types/astro';
import { HouseSystem, HOUSE_SYSTEM_INFO } from '../types/astro';
import type { GeocodingResult } from '../lib/geocode';
import { TIMEZONES, decimalToDMS, dmsToDecimal, localToUtc } from '../lib/formUtils';
import { useGeoSearch } from '../hooks/useGeoSearch';
import { OrbSettings } from './OrbSettings';

interface BirthDataFormProps {
  onSubmit: (data: BirthData, houseSystem: HouseSystem) => void;
  isLoading?: boolean;
  defaultHouseSystem?: HouseSystem;
  orbConfig: OrbConfig;
  onOrbChange: (config: OrbConfig) => void;
}

export function BirthDataForm({
  onSubmit,
  isLoading = false,
  defaultHouseSystem = HouseSystem.Alcabitius,
  orbConfig,
  onOrbChange,
}: BirthDataFormProps) {
  const [dateStr, setDateStr] = useState('2026-03-04');
  const [timeStr, setTimeStr] = useState('04:26');
  const [locationName, setLocationName] = useState('台北市');
  const [latDeg, setLatDeg] = useState(25);
  const [latMin, setLatMin] = useState(3);
  const [latDir, setLatDir] = useState<'N' | 'S'>('N');
  const [lonDeg, setLonDeg] = useState(121);
  const [lonMin, setLonMin] = useState(30);
  const [lonDir, setLonDir] = useState<'E' | 'W'>('E');
  const [tzOffset, setTzOffset] = useState(8);
  const [houseSystem, setHouseSystem] = useState<HouseSystem>(defaultHouseSystem);
  const [ayanamsa, setAyanamsa] = useState('tropical');

  const { geoLoading, geoError, geoResults, search: searchGeo, clearResults } = useGeoSearch();

  const handleSelectGeoResult = (result: GeocodingResult) => {
    const latDMS = decimalToDMS(result.latitude);
    const lonDMS = decimalToDMS(result.longitude);
    setLatDeg(latDMS.deg);
    setLatMin(latDMS.min);
    setLatDir(result.latitude >= 0 ? 'N' : 'S');
    setLonDeg(lonDMS.deg);
    setLonMin(lonDMS.min);
    setLonDir(result.longitude >= 0 ? 'E' : 'W');
    setLocationName(result.displayName.split(',')[0]);
    clearResults();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const utc = localToUtc(dateStr, timeStr, tzOffset);
    if (!utc) return;
    const birthData: BirthData = {
      ...utc,
      latitude: dmsToDecimal(latDeg, latMin, latDir),
      longitude: dmsToDecimal(lonDeg, lonMin, lonDir),
      locationName,
    };
    onSubmit(birthData, houseSystem);
  };

  return (
    <form className="quick-chart-form" onSubmit={handleSubmit}>
      <div className="form-grid">
        <label className="form-label" htmlFor="bf-date">日期</label>
        <div className="form-field">
          <input
            id="bf-date"
            type="date"
            value={dateStr}
            onChange={(e) => setDateStr(e.target.value)}
            className="form-input"
          />
        </div>

        <label className="form-label" htmlFor="bf-time">時間</label>
        <div className="form-field">
          <input
            id="bf-time"
            type="time"
            value={timeStr}
            onChange={(e) => setTimeStr(e.target.value)}
            className="form-input"
          />
        </div>

        <label className="form-label" htmlFor="bf-location">地點名稱</label>
        <div className="form-field">
          <div className="location-wrapper">
            <input
              id="bf-location"
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
                  <li key={i} onClick={() => handleSelectGeoResult(r)}>
                    {r.displayName}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <label className="form-label" htmlFor="bf-lat-deg">北緯/南緯</label>
        <div className="form-field dms-cell">
          <input
            id="bf-lat-deg"
            type="number"
            min={0}
            max={90}
            value={latDeg}
            onChange={(e) => setLatDeg(parseInt(e.target.value, 10) || 0)}
            className="form-input form-input-dms"
            aria-label="緯度度數"
          />
          <span className="dms-sep">°</span>
          <select
            value={latDir}
            onChange={(e) => setLatDir(e.target.value as 'N' | 'S')}
            className="form-select-dir"
            aria-label="緯度方向"
          >
            <option value="N">N 北</option>
            <option value="S">S 南</option>
          </select>
          <input
            type="number"
            min={0}
            max={59}
            value={latMin}
            onChange={(e) => setLatMin(parseInt(e.target.value, 10) || 0)}
            className="form-input form-input-dms"
            aria-label="緯度分數"
          />
          <span className="dms-sep">'</span>
        </div>

        <label className="form-label" htmlFor="bf-lon-deg">東經/西經</label>
        <div className="form-field dms-cell">
          <input
            id="bf-lon-deg"
            type="number"
            min={0}
            max={180}
            value={lonDeg}
            onChange={(e) => setLonDeg(parseInt(e.target.value, 10) || 0)}
            className="form-input form-input-dms"
            aria-label="經度度數"
          />
          <span className="dms-sep">°</span>
          <select
            value={lonDir}
            onChange={(e) => setLonDir(e.target.value as 'E' | 'W')}
            className="form-select-dir"
            aria-label="經度方向"
          >
            <option value="E">E 東</option>
            <option value="W">W 西</option>
          </select>
          <input
            type="number"
            min={0}
            max={59}
            value={lonMin}
            onChange={(e) => setLonMin(parseInt(e.target.value, 10) || 0)}
            className="form-input form-input-dms"
            aria-label="經度分數"
          />
          <span className="dms-sep">'</span>
        </div>

        <label className="form-label" htmlFor="bf-tz">時區</label>
        <div className="form-field">
          <select
            id="bf-tz"
            value={tzOffset}
            onChange={(e) => setTzOffset(parseFloat(e.target.value))}
            className="form-select"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
        </div>

        <label className="form-label" htmlFor="bf-house">宮位制度</label>
        <div className="form-field">
          <select
            id="bf-house"
            value={houseSystem}
            onChange={(e) => setHouseSystem(e.target.value as HouseSystem)}
            className="form-select"
          >
            {Object.entries(HOUSE_SYSTEM_INFO).map(([key, info]) => (
              <option key={key} value={key}>
                {info.name}
              </option>
            ))}
          </select>
        </div>

        <label className="form-label" htmlFor="bf-ayanamsa">黃道系統</label>
        <div className="form-field">
          <select
            id="bf-ayanamsa"
            value={ayanamsa}
            onChange={(e) => setAyanamsa(e.target.value)}
            className="form-select"
          >
            <option value="tropical">回歸黃道（Tropical）</option>
            <option value="sidereal_lahiri">恆星黃道 - Lahiri</option>
            <option value="sidereal_fagan">恆星黃道 - Fagan/Bradley</option>
          </select>
        </div>

        <div className="form-submit-cell">
          <OrbSettings orbConfig={orbConfig} onChange={onOrbChange} />
        </div>

        <div className="form-submit-cell">
          <button type="submit" className="submit-btn" disabled={isLoading}>
            {isLoading ? '✦ 推算中⋯' : '✦ 製作星盤'}
          </button>
        </div>
      </div>
    </form>
  );
}
