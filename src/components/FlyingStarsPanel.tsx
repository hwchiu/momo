import { useState } from 'react';
import { STAR_QUALITY } from '../types/bazi';
import { getAnnualFlyingStars } from '../lib/bazi';

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
// palaces array is in order: SE=0,S=1,SW=2,E=3,C=4,W=5,NE=6,N=7,NW=8
const GRID_LAYOUT = [
  [0, 1, 2], // top row: SE, S, SW
  [3, 4, 5], // mid row: E, C, W
  [6, 7, 8], // bot row: NE, N, NW
];

export function FlyingStarsPanel() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);

  const grid = getAnnualFlyingStars(year);

  // Find 五黃 palace
  const wuHuangPalace = grid.palaces.find((p) => p.star === 5);

  return (
    <div className="flying-stars-panel">
      <div className="flying-stars-controls">
        <label className="form-label">選擇年份</label>
        <input
          type="number"
          className="form-input flying-star-year-input"
          value={year}
          min={1900}
          max={2100}
          onChange={(e) => setYear(parseInt(e.target.value, 10) || currentYear)}
        />
        <span className="flying-star-center-info">
          {year} 年中宮飛星：
          <strong style={{ color: QUALITY_COLOR[STAR_QUALITY[grid.centerStar]] }}>
            {grid.centerStar}（{grid.palaces[4]?.starName}）
          </strong>
        </span>
      </div>

      {wuHuangPalace && (
        <div className="flying-star-warning">
          ⚠ 本年五黃凶星飛臨「{wuHuangPalace.direction}」方，此方宜靜勿動，避免裝修施工。
        </div>
      )}

      <div className="flying-star-grid">
        {GRID_LAYOUT.map((row, ri) => (
          <div key={ri} className="flying-star-row">
            {row.map((palaceIdx) => {
              const palace = grid.palaces[palaceIdx];
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
                  <div className="fs-quality" style={{ color }}>
                    {palace.quality}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
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
