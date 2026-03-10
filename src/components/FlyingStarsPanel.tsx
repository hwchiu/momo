import { useState } from 'react';
import { STAR_QUALITY } from '../types/bazi';
import { getAnnualFlyingStars, getMonthlyFlyingStars } from '../lib/bazi';
import type { FlyingStarPalace } from '../types/bazi';

const QUALITY_BG: Record<string, string> = {
  大吉: '#d4edda',
  吉: '#e8f4e8',
  凶: '#fff3cd',
  大凶: '#f8d7da',
};
const QUALITY_COLOR: Record<string, string> = {
  大吉: '#155724',
  吉: '#1a7a1a',
  凶: '#856404',
  大凶: '#721c24',
};

// Display grid rows: [SE, S, SW], [E, C, W], [NE, N, NW]
const GRID_LAYOUT = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
];

const MONTH_NAMES = ['一月', '二月', '三月', '四月', '五月', '六月',
  '七月', '八月', '九月', '十月', '十一月', '十二月'];

function StarGrid({ palaces, compact }: { palaces: FlyingStarPalace[]; compact?: boolean }) {
  return (
    <div className={`flying-star-grid ${compact ? 'flying-star-grid-compact' : ''}`}>
      {GRID_LAYOUT.map((row, ri) => (
        <div key={ri} className="flying-star-row">
          {row.map((palaceIdx) => {
            const palace = palaces[palaceIdx];
            const bg = QUALITY_BG[palace.quality];
            const color = QUALITY_COLOR[palace.quality];
            return (
              <div
                key={palaceIdx}
                className="flying-star-cell"
                style={{ backgroundColor: bg, borderColor: color + '66' }}
              >
                <div className="fs-direction" style={{ color: '#666' }}>
                  {palace.direction}
                </div>
                <div className="fs-star-number" style={{ color }}>
                  {palace.star}
                </div>
                <div className="fs-star-name" style={{ color }}>
                  {palace.starName}
                </div>
                {!compact && (
                  <div className="fs-quality" style={{ color }}>
                    {palace.quality}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function FlyingStarsPanel() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);

  const annualGrid = getAnnualFlyingStars(year);
  const monthlyGrid = getMonthlyFlyingStars(year, month);

  const wuHuangAnnual = annualGrid.palaces.find((p) => p.star === 5);
  const wuHuangMonthly = monthlyGrid.palaces.find((p) => p.star === 5);

  return (
    <div className="flying-stars-panel">
      {/* Controls */}
      <div className="flying-stars-controls">
        <div className="fs-control-group">
          <label className="form-label">年份</label>
          <input
            type="number"
            className="form-input flying-star-year-input"
            value={year}
            min={1900}
            max={2100}
            onChange={(e) => setYear(parseInt(e.target.value, 10) || currentYear)}
          />
        </div>
        <div className="fs-control-group">
          <label className="form-label">月份</label>
          <select
            className="form-input"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
          >
            {MONTH_NAMES.map((name, i) => (
              <option key={i + 1} value={i + 1}>{name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Dual grid */}
      <div className="fs-dual-grid-wrapper">
        <div className="fs-grid-section">
          <div className="fs-grid-label">
            {year} 年飛星
            <span className="fs-center-badge" style={{ color: QUALITY_COLOR[STAR_QUALITY[annualGrid.centerStar]] }}>
              中宮 {annualGrid.centerStar} 白
            </span>
          </div>
          <StarGrid palaces={annualGrid.palaces} />
          {wuHuangAnnual && (
            <div className="flying-star-warning">
              ⚠ 年五黃飛臨「{wuHuangAnnual.direction}」，宜靜勿動
            </div>
          )}
        </div>

        <div className="fs-grid-section">
          <div className="fs-grid-label">
            {MONTH_NAMES[month - 1]}月飛星
            <span className="fs-center-badge" style={{ color: QUALITY_COLOR[STAR_QUALITY[monthlyGrid.centerStar]] }}>
              中宮 {monthlyGrid.centerStar} 白
            </span>
          </div>
          <StarGrid palaces={monthlyGrid.palaces} compact />
          {wuHuangMonthly && (
            <div className="flying-star-warning">
              ⚠ 月五黃飛臨「{wuHuangMonthly.direction}」，本月宜靜
            </div>
          )}
        </div>
      </div>

      <div className="flying-star-legend">
        {(['大吉', '吉', '凶', '大凶'] as const).map((q) => (
          <span key={q} className="fs-legend-item" style={{ color: QUALITY_COLOR[q] }}>
            <span
              className="fs-legend-dot"
              style={{ backgroundColor: QUALITY_BG[q], borderColor: QUALITY_COLOR[q] }}
            />
            {q}
          </span>
        ))}
      </div>

      <div className="flying-star-stars-guide">
        <h4>各星簡介</h4>
        <div className="fs-star-list">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((s) => (
            <div
              key={s}
              className="fs-star-item"
              style={{ borderLeftColor: QUALITY_COLOR[STAR_QUALITY[s]] }}
            >
              <span className="fs-star-num" style={{ color: QUALITY_COLOR[STAR_QUALITY[s]] }}>
                {s}
              </span>
              <span className="fs-star-full-name">{STAR_BRIEF[s]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const STAR_BRIEF: Record<number, string> = {
  1: '一白水星 — 吉，主事業、桃花、考試',
  2: '二黑土星 — 凶，主疾病、災厄，宜化解',
  3: '三碧木星 — 凶，主口舌是非、官司',
  4: '四綠木星 — 吉，主文昌、讀書、藝術',
  5: '五黃土星 — 大凶，主重病、意外，勿動',
  6: '六白金星 — 吉，主偏財、貴人、升遷',
  7: '七赤金星 — 凶，主血光、盜竊、損財',
  8: '八白土星 — 大吉，主財富、旺丁、置產',
  9: '九紫火星 — 吉，主喜慶、婚嫁、名聲',
};
