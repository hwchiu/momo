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
        className={`row-clickable${maha.isCurrent ? ' vedic-dasha-current' : ''}`}
        onClick={() => setOpen(!open)}
      >
        <td className="center-cell form-hint">{open ? '▼' : '▶'}</td>
        <td style={{ fontWeight: 'bold', color, whiteSpace: 'nowrap' }}>{maha.lord}</td>
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
            {/* planet color is dynamic — must stay inline */}
            <td
              className="vedic-antardasha-cell"
              style={{ color: PLANET_COLORS[a.lord] ?? '#555' }}
            >
              └ {a.lord}
            </td>
            <td className="vedic-antardasha-cell">{a.lordZh}</td>
            <td className="longitude-cell vedic-antardasha-cell">{fmtDate(a.startDate)}</td>
            <td className="longitude-cell vedic-antardasha-cell">{fmtDate(a.endDate)}</td>
            <td className="vedic-antardasha-cell">
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
      {currentMaha && (
        <div className="vedic-dasha-now">
          <strong>當前大運：</strong>
          {/* PLANET_COLORS is dynamic — must stay inline */}
          <span style={{ color: PLANET_COLORS[currentMaha.lord], fontWeight: 'bold' }}>
            {currentMaha.lord}（{currentMaha.lordZh}）
          </span>
          {currentAntar && (
            <>
              {' '}
              / 子運{' '}
              <span style={{ color: PLANET_COLORS[currentAntar.lord], fontWeight: 'bold' }}>
                {currentAntar.lord}（{currentAntar.lordZh}）
              </span>{' '}
              至 {fmtDate(currentAntar.endDate)}
            </>
          )}
        </div>
      )}

      {moon && (
        <div className="vedic-moon-info">
          月亮星宿：{NAKSHATRAS[moon.nakshatra]}（第 {moon.nakshatra + 1} 宿），Pada {moon.pada}，
          Rashi {Math.floor(moon.siderealLon)}° {((moon.siderealLon % 1) * 60).toFixed(0)}'
        </div>
      )}

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
              <MahaDashaRow
                key={maha.lord + maha.startDate.getFullYear()}
                maha={maha}
                defaultOpen={maha.isCurrent}
              />
            ))}
          </tbody>
        </table>
      </div>
      <div className="form-hint" style={{ marginTop: '6px' }}>
        點擊大運列可展開/收合子運（Antardasha）。Vimshottari 總週期 120 年。
      </div>
    </div>
  );
}
