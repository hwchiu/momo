/**
 * SolarReturnPanel — Solar Return Chart (太陽回歸盤).
 *
 * Computes the exact moment the transiting Sun returns to its natal position
 * and renders the SR chart's planetary positions and angles.
 */

import { useState } from 'react';
import type { NatalChart } from '../types/astro';
import { ZODIAC_SIGNS, PLANET_INFO } from '../types/astro';
import { calculateSolarReturn } from '../lib/solarReturn';
import type { SolarReturnChart } from '../types/returns';
import { LoadingMessage } from './LoadingMessage';

interface SolarReturnPanelProps {
  chart: NatalChart;
}

function formatDegree(lon: number): string {
  const sign = Math.floor((((lon % 360) + 360) % 360) / 30);
  const within = (((lon % 360) + 360) % 360) % 30;
  const deg = Math.floor(within);
  const min = Math.floor((within - deg) * 60);
  const si = ZODIAC_SIGNS[sign as keyof typeof ZODIAC_SIGNS];
  return `${si.glyph} ${si.name} ${deg}°${String(min).padStart(2, '0')}'`;
}

export function SolarReturnPanel({ chart }: SolarReturnPanelProps) {
  const [open, setOpen] = useState(false);
  const currentYear = new Date().getFullYear();
  const [yearInput, setYearInput] = useState(String(currentYear));
  const [srChart, setSrChart] = useState<SolarReturnChart | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCalculate = () => {
    const year = parseInt(yearInput, 10);
    if (isNaN(year) || year < 1800 || year > 2200) {
      setError('請輸入有效年份（1800–2200）');
      return;
    }
    setLoading(true);
    setError(null);
    setSrChart(null);

    // Use setTimeout to avoid blocking the UI thread
    setTimeout(() => {
      try {
        const result = calculateSolarReturn(chart, year);
        setSrChart(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : '太陽回歸計算失敗');
      } finally {
        setLoading(false);
      }
    }, 10);
  };

  return (
    <section className="classical-panel">
      <button
        type="button"
        className="panel-toggle-btn"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {open ? '▲' : '▼'} 太陽回歸盤
        <span className="panel-toggle-hint">（Solar Return）</span>
      </button>

      {open && (
        <div className="panel-body">
          <div className="sr-controls">
            <label className="form-label" htmlFor="sr-year">
              回歸年份：
            </label>
            <input
              id="sr-year"
              type="number"
              min={1800}
              max={2200}
              value={yearInput}
              onChange={(e) => setYearInput(e.target.value)}
              className="form-input profection-age-input"
            />
            <button
              type="button"
              className="submit-btn sr-calc-btn"
              onClick={handleCalculate}
              disabled={loading}
            >
              {loading ? '推算中⋯' : '✦ 起盤'}
            </button>
          </div>

          {loading && <LoadingMessage text="計算太陽回歸中⋯" />}
          {error && (
            <div className="geo-error" role="alert">
              {error}
            </div>
          )}

          {srChart && (
            <div className="sr-result">
              <div className="sr-datetime-card">
                <strong>太陽回歸時刻（UTC）：</strong>
                {srChart.utc.year}-{String(srChart.utc.month).padStart(2, '0')}-
                {String(srChart.utc.day).padStart(2, '0')}
                &nbsp;{String(srChart.utc.hour).padStart(2, '0')}:
                {String(srChart.utc.minute).padStart(2, '0')}
                <span className="form-hint"> 地點：{chart.birthData.locationName}</span>
              </div>

              <div className="sr-angles">
                <span className="sr-angle-item">
                  ↑ ASC：<strong>{formatDegree(srChart.chart.ascendant)}</strong>
                </span>
                <span className="sr-angle-item">
                  ↑ MC：<strong>{formatDegree(srChart.chart.midheaven)}</strong>
                </span>
              </div>

              <div className="table-scroll">
                <table className="data-table" cellPadding={4} cellSpacing={0}>
                  <thead>
                    <tr className="table-header">
                      <th>行星</th>
                      <th>回歸盤位置</th>
                      <th>回歸宮位</th>
                      <th>本命位置</th>
                    </tr>
                  </thead>
                  <tbody>
                    {srChart.chart.planets.map((srPlanet, i) => {
                      const natalPlanet = chart.planets.find((p) => p.planet === srPlanet.planet);
                      const pi = PLANET_INFO[srPlanet.planet];
                      const srSi = ZODIAC_SIGNS[srPlanet.sign];
                      const nSi = natalPlanet ? ZODIAC_SIGNS[natalPlanet.sign] : null;
                      return (
                        <tr key={srPlanet.planet} className={i % 2 === 0 ? 'row-even' : 'row-odd'}>
                          <td className="planet-cell">
                            <span className="planet-glyph">{pi.glyph}</span> {pi.name}
                            {srPlanet.retrograde && <span className="retrograde-tag"> ℞</span>}
                          </td>
                          <td className="center-cell" style={{ whiteSpace: 'nowrap' }}>
                            {srSi.glyph} {srSi.name} {srPlanet.degree}°
                            {String(srPlanet.minute).padStart(2, '0')}'
                          </td>
                          <td className="center-cell">第 {srPlanet.house} 宮</td>
                          <td className="center-cell form-hint" style={{ whiteSpace: 'nowrap' }}>
                            {nSi && natalPlanet
                              ? `${nSi.glyph} ${nSi.name} ${natalPlanet.degree}°${String(natalPlanet.minute).padStart(2, '0')}'`
                              : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
