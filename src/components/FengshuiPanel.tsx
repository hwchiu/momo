import { useState, useRef, useCallback } from 'react';

import type { Period, TwentyFourMountain, XuanKongInput } from '../types/fengshui';
import {
  calculateFlyingStars,
  STAR_INFO,
  LOSHU_DIRECTION,
  GRID_LAYOUT,
  MOUNTAIN_TO_LOSHU,
} from '../lib/fengshui';
import { FengshuiMapView } from './FengshuiMapView';

const ALL_MOUNTAINS = Object.keys(MOUNTAIN_TO_LOSHU) as TwentyFourMountain[];

const PERIOD_LABELS: Record<Period, string> = {
  1: '一運 (1864–1883)',
  2: '二運 (1884–1903)',
  3: '三運 (1904–1923)',
  4: '四運 (1924–1943)',
  5: '五運 (1944–1963)',
  6: '六運 (1964–1983)',
  7: '七運 (1984–2003)',
  8: '八運 (2004–2023)',
  9: '九運 (2024–2043)',
};

// Quality → semi-transparent background color (rgba string)
function qualityFill(quality: 'auspicious' | 'inauspicious' | 'neutral'): string {
  if (quality === 'auspicious') return 'rgba(74,144,217,0.10)';
  if (quality === 'inauspicious') return 'rgba(205,92,92,0.12)';
  return 'rgba(200,200,200,0.08)';
}

// Hex color → rgba with alpha
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function FengshuiPanel() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [period, setPeriod] = useState<Period>(9);
  const [facing, setFacing] = useState<TwentyFourMountain>('午');
  const [showXuanKong, setShowXuanKong] = useState(false);
  const [showCompass, setShowCompass] = useState(false);
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [opacity, setOpacity] = useState(0.75);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const xuanKongInput: XuanKongInput | undefined = showXuanKong ? { period, facing } : undefined;
  const chart = calculateFlyingStars(year, month, xuanKongInput);

  // Build a quick lookup from loShuPosition → Palace
  const palaceMap = new Map(chart.palaces.map((p) => [p.loShuPosition, p]));

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setBgImage(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  // SVG dimensions — we use a fixed viewBox and let CSS scale it
  const svgW = 600;
  const svgH = 600;
  const cellW = svgW / 3;
  const cellH = svgH / 3;

  return (
    <div className="fengshui-panel">
      {/* ---- Left Controls ---- */}
      <div className="fengshui-controls">
        <h4 className="fengshui-section-title">飛星設定</h4>

        <label className="fengshui-label">
          年份
          <input
            type="number"
            className="fengshui-input"
            value={year}
            min={1900}
            max={2100}
            onChange={(e) => setYear(Number(e.target.value))}
          />
        </label>

        <label className="fengshui-label">
          月份
          <select
            className="fengshui-input"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {m} 月
              </option>
            ))}
          </select>
        </label>

        <div className="fengshui-divider" />

        <h4 className="fengshui-section-title">玄空飛星盤</h4>

        <label className="fengshui-checkbox-label">
          <input
            type="checkbox"
            checked={showXuanKong}
            onChange={(e) => setShowXuanKong(e.target.checked)}
          />
          顯示玄空山向星
        </label>

        {showXuanKong && (
          <>
            <label className="fengshui-label">
              元運（Period）
              <select
                className="fengshui-input"
                value={period}
                onChange={(e) => setPeriod(Number(e.target.value) as Period)}
              >
                {(Object.keys(PERIOD_LABELS) as unknown as Period[]).map((p) => (
                  <option key={p} value={p}>
                    {PERIOD_LABELS[p]}
                  </option>
                ))}
              </select>
            </label>

            <label className="fengshui-label">
              向首（Facing Mountain）
              <select
                className="fengshui-input"
                value={facing}
                onChange={(e) => setFacing(e.target.value as TwentyFourMountain)}
              >
                {ALL_MOUNTAINS.map((m) => (
                  <option key={m} value={m}>
                    {m}（{LOSHU_DIRECTION[MOUNTAIN_TO_LOSHU[m]]}）
                  </option>
                ))}
              </select>
            </label>
          </>
        )}

        <div className="fengshui-divider" />

        <h4 className="fengshui-section-title">格局覆蓋</h4>

        <label className="fengshui-checkbox-label">
          <input
            type="checkbox"
            checked={showCompass}
            onChange={(e) => setShowCompass(e.target.checked)}
          />
          顯示形家方位（四獸）
        </label>

        <label className="fengshui-label">
          底圖透明度（{Math.round(opacity * 100)}%）
          <input
            type="range"
            min={0.3}
            max={0.9}
            step={0.05}
            value={opacity}
            onChange={(e) => setOpacity(Number(e.target.value))}
            className="fengshui-range"
          />
        </label>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleImageUpload}
        />
        <button
          type="button"
          className="fengshui-upload-btn"
          onClick={() => fileInputRef.current?.click()}
        >
          📐 上傳平面圖
        </button>

        {bgImage && (
          <button
            type="button"
            className="fengshui-upload-btn fengshui-clear-btn"
            onClick={() => setBgImage(null)}
          >
            ✕ 清除底圖
          </button>
        )}

        <div className="fengshui-divider" />

        <div className="fengshui-year-info">
          <span>
            {year} 年流年中宮：
            <strong style={{ color: STAR_INFO[chart.yearCenter].color }}>
              {STAR_INFO[chart.yearCenter].name}
            </strong>
          </span>
          <span>
            {year} 年 {month} 月中宮：
            <strong style={{ color: STAR_INFO[chart.monthCenter].color }}>
              {STAR_INFO[chart.monthCenter].name}
            </strong>
          </span>
        </div>
      </div>

      {/* ---- Right Display ---- */}
      <div className="fengshui-display">
        <div className="fengshui-container">
          {/* Background image or placeholder */}
          {bgImage ? (
            <img src={bgImage} alt="平面圖底圖" className="fengshui-bg-image" />
          ) : (
            <div className="fengshui-bg-placeholder" />
          )}

          {/* SVG overlay */}
          <svg
            className="fengshui-svg-overlay"
            viewBox={`0 0 ${svgW} ${svgH}`}
            preserveAspectRatio="none"
            style={{ opacity }}
          >
            {GRID_LAYOUT.map((row, rowIdx) =>
              row.map((loShuPos, colIdx) => {
                const palace = palaceMap.get(loShuPos)!;
                const annualInfo = STAR_INFO[palace.annualStar];
                const monthlyInfo = STAR_INFO[palace.monthlyStar];
                const x = colIdx * cellW;
                const y = rowIdx * cellH;
                const bgFill = hexToRgba(annualInfo.color, 0.18);
                const cellQuality = qualityFill(annualInfo.quality);

                return (
                  <g key={loShuPos}>
                    {/* Cell background */}
                    <rect
                      x={x}
                      y={y}
                      width={cellW}
                      height={cellH}
                      fill={bgFill}
                      stroke="rgba(200,180,120,0.6)"
                      strokeWidth={1.5}
                    />
                    <rect
                      x={x + 1}
                      y={y + 1}
                      width={cellW - 2}
                      height={cellH - 2}
                      fill={cellQuality}
                    />

                    {/* Lo Shu native number — top-left */}
                    <text
                      x={x + 8}
                      y={y + 20}
                      fontSize={13}
                      fill="rgba(180,160,100,0.9)"
                      fontFamily="serif"
                    >
                      {loShuPos}
                    </text>

                    {/* Direction label — top-center */}
                    <text
                      x={x + cellW / 2}
                      y={y + 22}
                      fontSize={14}
                      fill="rgba(220,200,150,0.95)"
                      fontFamily="serif"
                      textAnchor="middle"
                    >
                      {LOSHU_DIRECTION[loShuPos]}
                    </text>

                    {/* Annual star — large, center */}
                    <text
                      x={x + cellW / 2}
                      y={y + cellH / 2 + 14}
                      fontSize={52}
                      fontWeight="bold"
                      fill={annualInfo.color}
                      textAnchor="middle"
                      opacity={0.9}
                      fontFamily="serif"
                    >
                      {palace.annualStar}
                    </text>

                    {/* Annual star name label */}
                    <text
                      x={x + cellW / 2}
                      y={y + cellH / 2 - 22}
                      fontSize={11}
                      fill={annualInfo.color}
                      textAnchor="middle"
                      opacity={0.85}
                      fontFamily="serif"
                    >
                      年 {annualInfo.name}
                    </text>

                    {/* Monthly star — medium, below annual */}
                    <text
                      x={x + cellW / 2}
                      y={y + cellH - 30}
                      fontSize={22}
                      fontWeight="600"
                      fill={monthlyInfo.color}
                      textAnchor="middle"
                      opacity={0.85}
                      fontFamily="serif"
                    >
                      月 {palace.monthlyStar}
                    </text>

                    {/* Monthly star name */}
                    <text
                      x={x + cellW / 2}
                      y={y + cellH - 12}
                      fontSize={10}
                      fill={monthlyInfo.color}
                      textAnchor="middle"
                      opacity={0.75}
                      fontFamily="serif"
                    >
                      {monthlyInfo.name}
                    </text>

                    {/* Xuan Kong stars — top-right corners */}
                    {palace.mountainStar !== undefined && (
                      <text
                        x={x + cellW - 8}
                        y={y + 20}
                        fontSize={12}
                        fill="rgba(255,200,100,0.9)"
                        textAnchor="end"
                        fontFamily="serif"
                      >
                        山{palace.mountainStar}
                      </text>
                    )}
                    {palace.facingStar !== undefined && (
                      <text
                        x={x + cellW - 8}
                        y={y + 36}
                        fontSize={12}
                        fill="rgba(100,220,255,0.9)"
                        textAnchor="end"
                        fontFamily="serif"
                      >
                        向{palace.facingStar}
                      </text>
                    )}
                  </g>
                );
              }),
            )}

            {/* Grid border */}
            <rect
              x={0}
              y={0}
              width={svgW}
              height={svgH}
              fill="none"
              stroke="rgba(200,180,100,0.7)"
              strokeWidth={2}
            />

            {/* Four Divine Animals compass rose (形家方位) */}
            {showCompass && (
              <g opacity={0.8}>
                {/* Compass circle */}
                <circle
                  cx={svgW / 2}
                  cy={svgH / 2}
                  r={70}
                  fill="rgba(20,15,5,0.5)"
                  stroke="rgba(200,180,100,0.6)"
                  strokeWidth={1}
                />
                {/* Cardinal labels */}
                {/* 朱雀 South (top of grid) */}
                <text
                  x={svgW / 2}
                  y={svgH / 2 - 52}
                  fontSize={14}
                  fill="#e75480"
                  textAnchor="middle"
                  fontFamily="serif"
                >
                  朱雀
                </text>
                <text
                  x={svgW / 2}
                  y={svgH / 2 - 36}
                  fontSize={10}
                  fill="rgba(220,150,180,0.8)"
                  textAnchor="middle"
                  fontFamily="serif"
                >
                  前・南
                </text>
                {/* 玄武 North (bottom of grid) */}
                <text
                  x={svgW / 2}
                  y={svgH / 2 + 46}
                  fontSize={14}
                  fill="#4a90d9"
                  textAnchor="middle"
                  fontFamily="serif"
                >
                  玄武
                </text>
                <text
                  x={svgW / 2}
                  y={svgH / 2 + 62}
                  fontSize={10}
                  fill="rgba(150,180,220,0.8)"
                  textAnchor="middle"
                  fontFamily="serif"
                >
                  後・北
                </text>
                {/* 青龍 East (left in standard view) */}
                <text
                  x={svgW / 2 - 58}
                  y={svgH / 2 + 5}
                  fontSize={14}
                  fill="#5cb85c"
                  textAnchor="middle"
                  fontFamily="serif"
                >
                  青龍
                </text>
                <text
                  x={svgW / 2 - 56}
                  y={svgH / 2 + 20}
                  fontSize={10}
                  fill="rgba(150,220,150,0.8)"
                  textAnchor="middle"
                  fontFamily="serif"
                >
                  左・東
                </text>
                {/* 白虎 West (right in standard view) */}
                <text
                  x={svgW / 2 + 58}
                  y={svgH / 2 + 5}
                  fontSize={14}
                  fill="#c0c0c0"
                  textAnchor="middle"
                  fontFamily="serif"
                >
                  白虎
                </text>
                <text
                  x={svgW / 2 + 56}
                  y={svgH / 2 + 20}
                  fontSize={10}
                  fill="rgba(200,200,200,0.8)"
                  textAnchor="middle"
                  fontFamily="serif"
                >
                  右・西
                </text>
                {/* Cross lines */}
                <line
                  x1={svgW / 2}
                  y1={svgH / 2 - 68}
                  x2={svgW / 2}
                  y2={svgH / 2 + 68}
                  stroke="rgba(200,180,100,0.4)"
                  strokeWidth={1}
                />
                <line
                  x1={svgW / 2 - 68}
                  y1={svgH / 2}
                  x2={svgW / 2 + 68}
                  y2={svgH / 2}
                  stroke="rgba(200,180,100,0.4)"
                  strokeWidth={1}
                />
              </g>
            )}
          </svg>
        </div>

        {/* ---- Map + Luopan ---- */}
        <FengshuiMapView chart={chart} />

        {/* ---- Star Legend ---- */}
        <div className="fengshui-legend">
          <h4 className="fengshui-section-title">紫白九星說明</h4>
          <div className="fengshui-legend-grid">
            {Object.values(STAR_INFO).map((star) => (
              <div key={star.number} className="fengshui-legend-item">
                <span className="fengshui-legend-dot" style={{ backgroundColor: star.color }} />
                <span className="fengshui-legend-name">{star.name}</span>
                <span className={`fengshui-legend-badge fengshui-legend-badge--${star.quality}`}>
                  {star.quality === 'auspicious'
                    ? '吉'
                    : star.quality === 'inauspicious'
                      ? '凶'
                      : '中'}
                </span>
                <span className="fengshui-legend-element">
                  {star.trigram}卦・{star.element}
                </span>
                <span className="fengshui-legend-desc">{star.description}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
