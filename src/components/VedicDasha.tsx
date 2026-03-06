import { useState } from 'react';
import type { VedicChart, MahaDasha } from '../types/vedic';
import { PLANET_COLORS, NAKSHATRAS } from '../types/vedic';

interface VedicDashaProps {
  chart: VedicChart;
}

function fmtDate(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function fmtDuration(years: number): string {
  const y = Math.floor(years);
  const months = Math.round((years - y) * 12);
  if (months === 0) return `${y} 年`;
  return `${y} 年 ${months} 月`;
}

function MahaDashaRow({ maha, defaultOpen }: { maha: MahaDasha; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const color = PLANET_COLORS[maha.lord] ?? '#333';

  return (
    <>
      <tr
        className={maha.isCurrent ? 'vedic-dasha-current' : ''}
        style={{ cursor: 'pointer' }}
        onClick={() => setOpen(!open)}
      >
        <td className="center-cell" style={{ fontSize: '11px', color: '#888' }}>
          {open ? '▼' : '▶'}
        </td>
        <td style={{ fontWeight: 'bold', color, whiteSpace: 'nowrap' }}>
          {maha.lord}
        </td>
        <td>{maha.lordZh}</td>
        <td className="longitude-cell">{fmtDate(maha.startDate)}</td>
        <td className="longitude-cell">{fmtDate(maha.endDate)}</td>
        <td>{fmtDuration(maha.durationYears)}</td>
        <td className="center-cell">
          {maha.isCurrent && <span className="vedic-current-badge">▶ 現在</span>}
        </td>
      </tr>
      {open &&
        maha.antardasha.map((a) => (
          <tr
            key={a.lord}
            className={`vedic-antardasha-row${a.isCurrent ? ' vedic-dasha-current' : ''}`}
          >
            <td></td>
            <td style={{ color: PLANET_COLORS[a.lord] ?? '#555', paddingLeft: '20px', fontSize: '12px' }}>
              └ {a.lord}
            </td>
            <td style={{ fontSize: '12px' }}>{a.lordZh}</td>
            <td className="longitude-cell" style={{ fontSize: '12px' }}>{fmtDate(a.startDate)}</td>
            <td className="longitude-cell" style={{ fontSize: '12px' }}>{fmtDate(a.endDate)}</td>
            <td style={{ fontSize: '12px' }}>
              {fmtDuration((a.endDate.getTime() - a.startDate.getTime()) / (365.2425 * 86400000))}
            </td>
            <td className="center-cell">
              {a.isCurrent && <span className="vedic-current-badge">▶ 現在</span>}
            </td>
          </tr>
        ))}
    </>
  );
}

export function VedicDasha({ chart }: VedicDashaProps) {
  const { dashas, planets } = chart;
  const moon = planets.find((p) => p.name === 'Moon');
  const currentMaha = dashas.find((d) => d.isCurrent);
  const currentAntar = currentMaha?.antardasha.find((a) => a.isCurrent);

  return (
    <div className="vedic-dasha-section">
      {/* Current dasha summary */}
      {currentMaha && (
        <div className="vedic-dasha-now">
          <strong>當前大運：</strong>
          <span style={{ color: PLANET_COLORS[currentMaha.lord], fontWeight: 'bold' }}>
            {currentMaha.lord}（{currentMaha.lordZh}）
          </span>
          {currentAntar && (
            <>
              {' '}/ 子運{' '}
              <span style={{ color: PLANET_COLORS[currentAntar.lord], fontWeight: 'bold' }}>
                {currentAntar.lord}（{currentAntar.lordZh}）
              </span>
              {' '}至 {fmtDate(currentAntar.endDate)}
            </>
          )}
        </div>
      )}

      {/* Moon info */}
      {moon && (
        <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
          月亮星宿：{NAKSHATRAS[moon.nakshatra]}（第 {moon.nakshatra + 1} 宿），Pada {moon.pada}，
          Rashi {Math.floor(moon.siderealLon)}° {(moon.siderealLon % 1 * 60).toFixed(0)}'
        </div>
      )}

      {/* Dasha table */}
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr className="table-header">
              <th style={{ width: '24px' }}></th>
              <th>主星</th>
              <th>名稱</th>
              <th>開始日期</th>
              <th>結束日期</th>
              <th>時長</th>
              <th>狀態</th>
            </tr>
          </thead>
          <tbody>
            {dashas.map((maha) => (
              <MahaDashaRow key={maha.lord + maha.startDate.getFullYear()} maha={maha} defaultOpen={maha.isCurrent} />
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: '11px', color: '#888', marginTop: '6px' }}>
        點擊大運列可展開/收合子運（Antardasha）。Vimshottari 總週期 120 年。
      </div>
    </div>
  );
}
