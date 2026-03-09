import { useState } from 'react';
import type { VedicChart } from '../types/vedic';
import { RASHIS_ZH, NAKSHATRAS, PLANET_COLORS, AYANAMSHA_NAMES } from '../types/vedic';

interface VedicPlanetTableProps {
  chart: VedicChart;
}

function formatDeg(deg: number): string {
  const d = Math.floor(deg);
  const mRaw = (deg - d) * 60;
  const m = Math.floor(mRaw);
  const s = Math.floor((mRaw - m) * 60);
  return `${d}°${String(m).padStart(2, '0')}'${String(s).padStart(2, '0')}"`;
}

export function VedicPlanetTable({ chart }: VedicPlanetTableProps) {
  const [showCsv, setShowCsv] = useState(false);

  const exportCsv = () => {
    const headers = ['行星', 'Rashi', '度數', 'Nakshatra', 'Pada', '宮位', '逆行', '入廟/弱勢'];
    const rows = chart.planets.map((p) => [
      `${p.nameZh}(${p.name})`,
      RASHIS_ZH[p.rashi],
      formatDeg(p.degreeInRashi),
      NAKSHATRAS[p.nakshatra],
      String(p.pada),
      String(p.house),
      p.retrograde ? '是' : '否',
      p.dignity === 'exalted' ? '入廟↑' : p.dignity === 'debilitated' ? '弱勢↓' : '',
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vedic_chart_${chart.input.year}${String(chart.input.month).padStart(2, '0')}${String(chart.input.day).padStart(2, '0')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setShowCsv(false);
  };

  return (
    <div>
      <div style={{ textAlign: 'right', marginBottom: '6px' }}>
        <button
          className="submit-btn"
          style={{ padding: '3px 12px', fontSize: '12px', fontWeight: 'normal' }}
          onClick={exportCsv}
          onMouseEnter={() => setShowCsv(true)}
          onMouseLeave={() => setShowCsv(false)}
        >
          匯出 CSV
        </button>
        {showCsv && (
          <span style={{ fontSize: '11px', color: '#555', marginLeft: '6px' }}>
            下載行星位置資料
          </span>
        )}
      </div>
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr className="table-header">
              <th>行星</th>
              <th>Rashi（星座）</th>
              <th>度數</th>
              <th>Nakshatra（星宿）</th>
              <th>Pada</th>
              <th>宮位</th>
              <th>逆行</th>
              <th>廟/弱</th>
            </tr>
          </thead>
          <tbody>
            {chart.planets.map((planet, i) => (
              <tr key={planet.name} className={i % 2 === 0 ? 'row-even' : 'row-odd'}>
                <td className="planet-cell" style={{ whiteSpace: 'nowrap' }}>
                  <span style={{ color: PLANET_COLORS[planet.name] ?? '#333', fontWeight: 'bold' }}>
                    {planet.abbr}
                  </span>{' '}
                  {planet.nameZh}
                </td>
                <td>{RASHIS_ZH[planet.rashi]}</td>
                <td className="longitude-cell">{formatDeg(planet.degreeInRashi)}</td>
                <td style={{ fontSize: '12px' }}>{NAKSHATRAS[planet.nakshatra]}</td>
                <td className="center-cell">{planet.pada}</td>
                <td className="center-cell">{planet.house}</td>
                <td className="center-cell">
                  {planet.retrograde ? (
                    <span className="retrograde-symbol">℞</span>
                  ) : (
                    <span style={{ color: '#aaa' }}>—</span>
                  )}
                </td>
                <td className="dignity-cell">
                  {planet.dignity === 'exalted' && (
                    <span className="dignity-廟" title="入廟（Exaltation）">
                      ↑入廟
                    </span>
                  )}
                  {planet.dignity === 'debilitated' && (
                    <span className="dignity-陷" title="弱勢（Debilitation）">
                      ↓弱勢
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: '11px', color: '#777', marginTop: '6px' }}>
        Ayanamsha: {AYANAMSHA_NAMES[chart.input.ayanamsha]} = {chart.ayanamshaValue.toFixed(4)}°
      </div>
    </div>
  );
}
