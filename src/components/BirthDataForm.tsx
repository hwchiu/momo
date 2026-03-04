import { useState } from 'react';
import type { BirthData } from '../types/astro';
import { HouseSystem, HOUSE_SYSTEM_INFO } from '../types/astro';

interface BirthDataFormProps {
  onSubmit: (data: BirthData, houseSystem: HouseSystem) => void;
  isLoading?: boolean;
  defaultHouseSystem?: HouseSystem;
}

// Timezone options
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

export function BirthDataForm({
  onSubmit,
  isLoading = false,
  defaultHouseSystem = HouseSystem.Alcabitius,
}: BirthDataFormProps) {
  // Date fields
  const [dateStr, setDateStr] = useState('2026-03-04');
  // Time fields
  const [timeStr, setTimeStr] = useState('04:26');
  // Location
  const [locationName, setLocationName] = useState('台北市');
  // Latitude DMS
  const [latDeg, setLatDeg] = useState(25);
  const [latMin, setLatMin] = useState(3);
  const [latDir, setLatDir] = useState<'N' | 'S'>('N');
  // Longitude DMS
  const [lonDeg, setLonDeg] = useState(121);
  const [lonMin, setLonMin] = useState(30);
  const [lonDir, setLonDir] = useState<'E' | 'W'>('E');
  // Timezone offset hours
  const [tzOffset, setTzOffset] = useState(8);
  // House system
  const [houseSystem, setHouseSystem] = useState<HouseSystem>(defaultHouseSystem);
  // Ayanamsa
  const [ayanamsa, setAyanamsa] = useState('tropical');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Parse date
    const [yearStr, monthStr, dayStr] = dateStr.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const day = parseInt(dayStr, 10);

    // Parse time
    const [hourStr, minuteStr] = timeStr.split(':');
    let hour = parseInt(hourStr, 10);
    let minute = parseInt(minuteStr, 10);

    // Convert local time to UTC
    // UTC = local time - tzOffset
    const totalMinutes = hour * 60 + minute - Math.round(tzOffset * 60);
    // Handle day overflow/underflow (simplified: only adjusts minutes within same day calc)
    const utcMinutes = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
    hour = Math.floor(utcMinutes / 60);
    minute = utcMinutes % 60;

    // Convert DMS to decimal degrees
    const lat = (latDeg + latMin / 60) * (latDir === 'S' ? -1 : 1);
    const lon = (lonDeg + lonMin / 60) * (lonDir === 'W' ? -1 : 1);

    const birthData: BirthData = {
      year,
      month,
      day,
      hour,
      minute,
      latitude: lat,
      longitude: lon,
      locationName,
    };

    onSubmit(birthData, houseSystem);
  };

  return (
    <form className="quick-chart-form" onSubmit={handleSubmit}>
      <table className="form-table" cellPadding={3} cellSpacing={0}>
        <tbody>
          <tr>
            <td className="form-label">日期</td>
            <td>
              <input
                type="date"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className="form-input"
              />
            </td>
          </tr>
          <tr>
            <td className="form-label">時間</td>
            <td>
              <input
                type="time"
                value={timeStr}
                onChange={(e) => setTimeStr(e.target.value)}
                className="form-input"
              />
            </td>
          </tr>
          <tr>
            <td className="form-label">地點名稱</td>
            <td>
              <input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                className="form-input form-input-wide"
                placeholder="城市名稱"
              />
            </td>
          </tr>
          <tr>
            <td className="form-label">北緯/南緯</td>
            <td className="dms-cell">
              <input
                type="number"
                min={0}
                max={90}
                value={latDeg}
                onChange={(e) => setLatDeg(parseInt(e.target.value, 10) || 0)}
                className="form-input form-input-dms"
              />
              <span className="dms-sep">°</span>
              <select
                value={latDir}
                onChange={(e) => setLatDir(e.target.value as 'N' | 'S')}
                className="form-select-dir"
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
                value={lonDeg}
                onChange={(e) => setLonDeg(parseInt(e.target.value, 10) || 0)}
                className="form-input form-input-dms"
              />
              <span className="dms-sep">°</span>
              <select
                value={lonDir}
                onChange={(e) => setLonDir(e.target.value as 'E' | 'W')}
                className="form-select-dir"
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
              />
              <span className="dms-sep">'</span>
            </td>
          </tr>
          <tr>
            <td className="form-label">時區</td>
            <td>
              <select
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
            </td>
          </tr>
          <tr>
            <td className="form-label">宮位制度</td>
            <td>
              <select
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
            </td>
          </tr>
          <tr>
            <td className="form-label">黃道系統</td>
            <td>
              <select
                value={ayanamsa}
                onChange={(e) => setAyanamsa(e.target.value)}
                className="form-select"
              >
                <option value="tropical">回歸黃道（Tropical）</option>
                <option value="sidereal_lahiri">恆星黃道 - Lahiri</option>
                <option value="sidereal_fagan">恆星黃道 - Fagan/Bradley</option>
              </select>
            </td>
          </tr>
          <tr>
            <td colSpan={2} className="form-submit-cell">
              <button type="submit" className="submit-btn" disabled={isLoading}>
                {isLoading ? '計算中...' : '製作星盤'}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </form>
  );
}
