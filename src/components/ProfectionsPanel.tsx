/**
 * ProfectionsPanel — Annual Profections (小限法).
 *
 * Shows the activated house, year lord, and natal planets in that house for
 * any given age. Users can also browse a 12-year cycle table.
 */

import { useState } from 'react';
import type { NatalChart } from '../types/astro';
import { ZODIAC_SIGNS, PLANET_INFO } from '../types/astro';
import { calculateProfection, calculateProfectionRange } from '../lib/profections';

interface ProfectionsPanelProps {
  chart: NatalChart;
}

function currentAge(birthData: { year: number; month: number; day: number }): number {
  const today = new Date();
  let age = today.getFullYear() - birthData.year;
  const hadBirthday =
    today.getMonth() + 1 > birthData.month ||
    (today.getMonth() + 1 === birthData.month && today.getDate() >= birthData.day);
  if (!hadBirthday) age--;
  return Math.max(0, age);
}

export function ProfectionsPanel({ chart }: ProfectionsPanelProps) {
  const [open, setOpen] = useState(false);
  const [showTable, setShowTable] = useState(false);

  const defaultAge = currentAge(chart.birthData);
  const [ageInput, setAgeInput] = useState(String(defaultAge));
  const age = Math.max(0, Math.min(120, parseInt(ageInput, 10) || 0));

  const result = open ? calculateProfection(chart, age) : null;
  const tableRows = open && showTable ? calculateProfectionRange(chart, 0, 83) : null;

  const si = result ? ZODIAC_SIGNS[result.signOnCusp] : null;
  const lordInfo = result ? PLANET_INFO[result.lord] : null;

  return (
    <section className="classical-panel">
      <button
        type="button"
        className="panel-toggle-btn"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {open ? '▲' : '▼'} 小限法（年度宮位推進）
        <span className="panel-toggle-hint">（Annual Profections）</span>
      </button>

      {open && result && si && lordInfo && (
        <div className="panel-body">
          <div className="profection-controls">
            <label className="form-label" htmlFor="prof-age">查詢年齡：</label>
            <input
              id="prof-age"
              type="number"
              min={0}
              max={120}
              value={ageInput}
              onChange={(e) => setAgeInput(e.target.value)}
              className="form-input profection-age-input"
            />
            <span className="form-hint">歲（0 = 出生年）</span>
          </div>

          <div className="profection-result-card">
            <div className="profection-main">
              <div className="profection-house-badge">第 {result.house} 宮</div>
              <div className="profection-detail">
                <div className="profection-sign">
                  {si.glyph} {si.name}（{si.element}象）
                </div>
                <div className="profection-lord">
                  年主星：<strong>{lordInfo.glyph} {lordInfo.name}</strong>
                </div>
                {result.planetsInHouse.length > 0 && (
                  <div className="profection-planets">
                    宮內本命行星：
                    {result.planetsInHouse.map((p) => {
                      const pi = PLANET_INFO[p];
                      return (
                        <span key={p} className="profection-planet-tag">
                          {pi.glyph} {pi.name}
                        </span>
                      );
                    })}
                  </div>
                )}
                {result.planetsInHouse.length === 0 && (
                  <div className="form-hint">此宮無本命行星</div>
                )}
              </div>
            </div>
            <div className="profection-cycle-note">
              每 12 年一個完整循環。{age} 歲對應宮位週期第 {(age % 12) + 1}/12 年。
            </div>
          </div>

          <button
            type="button"
            className="orb-settings-toggle"
            style={{ marginTop: '10px' }}
            onClick={() => setShowTable((v) => !v)}
          >
            {showTable ? '▲' : '▼'} 完整小限年表（0–83 歲）
          </button>

          {tableRows && (
            <div className="table-scroll" style={{ marginTop: '8px' }}>
              <table className="data-table" cellPadding={3} cellSpacing={0}>
                <thead>
                  <tr className="table-header">
                    <th>年齡</th>
                    <th>活化宮</th>
                    <th>星座</th>
                    <th>年主星</th>
                    <th>宮內行星</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((r) => {
                    const rSi = ZODIAC_SIGNS[r.signOnCusp];
                    const rLord = PLANET_INFO[r.lord];
                    const isCurrentAge = r.age === age;
                    return (
                      <tr
                        key={r.age}
                        className={`${r.age % 2 === 0 ? 'row-even' : 'row-odd'}${isCurrentAge ? ' profection-current-row' : ''}`}
                      >
                        <td className="center-cell">{r.age}</td>
                        <td className="center-cell">第 {r.house} 宮</td>
                        <td>{rSi.glyph} {rSi.name}</td>
                        <td>{rLord.glyph} {rLord.name}</td>
                        <td className="form-hint">
                          {r.planetsInHouse.length > 0
                            ? r.planetsInHouse.map((p) => PLANET_INFO[p].glyph).join(' ')
                            : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
