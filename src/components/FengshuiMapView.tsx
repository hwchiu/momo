/**
 * FengshuiMapView — interactive Leaflet map with a rotatable Luopan SVG overlay.
 *
 * Features:
 * - OpenStreetMap base layer (no API key required)
 * - Full Luopan: 24 mountains (二十四山) + 8 trigrams (八卦) + flying star numbers
 * - Manual rotation via slider / buttons
 * - Mobile auto-North via DeviceOrientation API (iOS & Android)
 * - Address geocoding using the existing Nominatim helper
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import L from 'leaflet';

import type { FlyingStarsChart } from '../types/fengshui';
import { STAR_INFO } from '../lib/fengshui';
import { geocode } from '../lib/geocode';
import type { GeocodingResult } from '../lib/geocode';

// ── Leaflet marker-icon fix for Vite ──────────────────────────────────────────
// Vite cannot resolve the require() calls inside L.Icon.Default, so we supply
// the icon URLs explicitly after removing the internal resolver method.
import markerIconPng from 'leaflet/dist/images/marker-icon.png';
import markerIconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadowPng from 'leaflet/dist/images/marker-shadow.png';

(L.Icon.Default.prototype as unknown as Record<string, unknown>)['_getIconUrl'] = undefined;
L.Icon.Default.mergeOptions({
  iconUrl: markerIconPng,
  iconRetinaUrl: markerIconRetina,
  shadowUrl: markerShadowPng,
});

// ── SVG helpers ───────────────────────────────────────────────────────────────

/** Convert compass degrees (0=N, clockwise) → [x, y] at radius r from center. */
function pt(cx: number, cy: number, r: number, compassDeg: number): [number, number] {
  const rad = ((compassDeg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

/**
 * SVG path for a clockwise ring arc from startDeg to endDeg (compass degrees).
 * endDeg must be numerically greater than startDeg (use startDeg + span).
 */
function arcPath(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  startDeg: number,
  endDeg: number,
): string {
  const [ox1, oy1] = pt(cx, cy, outerR, startDeg);
  const [ox2, oy2] = pt(cx, cy, outerR, endDeg);
  const [ix2, iy2] = pt(cx, cy, innerR, endDeg);
  const [ix1, iy1] = pt(cx, cy, innerR, startDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return [
    `M ${ox1} ${oy1}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${ox2} ${oy2}`,
    `L ${ix2} ${iy2}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${ix1} ${iy1}`,
    'Z',
  ].join(' ');
}

// ── Static Luopan data ────────────────────────────────────────────────────────

/** 8 trigrams in clockwise compass order, each spanning 45°. */
const TRIGRAMS = [
  {
    name: '乾',
    startDeg: 292.5,
    fill: 'rgba(218,165,32,0.22)',
    stroke: '#b8900a',
    label: '金·西北',
  },
  { name: '坎', startDeg: 337.5, fill: 'rgba(52,120,190,0.22)', stroke: '#1a6fa8', label: '水·北' },
  {
    name: '艮',
    startDeg: 22.5,
    fill: 'rgba(190,160,80,0.20)',
    stroke: '#8b6914',
    label: '山·東北',
  },
  { name: '震', startDeg: 67.5, fill: 'rgba(40,167,80,0.22)', stroke: '#1e7a42', label: '木·東' },
  {
    name: '巽',
    startDeg: 112.5,
    fill: 'rgba(20,160,150,0.20)',
    stroke: '#127a72',
    label: '風·東南',
  },
  { name: '離', startDeg: 157.5, fill: 'rgba(192,57,43,0.22)', stroke: '#8b2012', label: '火·南' },
  {
    name: '坤',
    startDeg: 202.5,
    fill: 'rgba(130,110,70,0.20)',
    stroke: '#7d6b4f',
    label: '土·西南',
  },
  { name: '兌', startDeg: 247.5, fill: 'rgba(160,160,160,0.22)', stroke: '#777', label: '金·西' },
] as const;

/** 24 mountains in clockwise order, first (壬) starting at 337.5° (NNW). */
const MOUNTAINS = [
  '壬',
  '子',
  '癸', // N sector (坎)  337.5–22.5°
  '丑',
  '艮',
  '寅', // NE sector (艮) 22.5–67.5°
  '甲',
  '卯',
  '乙', // E sector (震)  67.5–112.5°
  '辰',
  '巽',
  '巳', // SE sector (巽) 112.5–157.5°
  '丙',
  '午',
  '丁', // S sector (離)  157.5–202.5°
  '未',
  '坤',
  '申', // SW sector (坤) 202.5–247.5°
  '庚',
  '酉',
  '辛', // W sector (兌)  247.5–292.5°
  '戌',
  '乾',
  '亥', // NW sector (乾) 292.5–337.5°
];

/** LoShu position → compass angle for the 8 directional flying-star sectors. */
const LOSHU_COMPASS: Record<number, number> = {
  1: 0, // N
  2: 225, // SW
  3: 90, // E
  4: 135, // SE
  6: 315, // NW
  7: 270, // W
  8: 45, // NE
  9: 180, // S
};

// ── LuopanSvg component ───────────────────────────────────────────────────────

interface LuopanSvgProps {
  chart: FlyingStarsChart;
}

function LuopanSvg({ chart }: LuopanSvgProps) {
  const cx = 150,
    cy = 150;

  // Ring radii
  const CENTER_R = 36;
  const TRIG_INNER = 36,
    TRIG_OUTER = 61;
  const MTN_INNER = 61,
    MTN_OUTER = 96;
  const STAR_INNER = 96,
    STAR_OUTER = 130;
  const TICK_OUTER = 148;

  const palaceMap = new Map(chart.palaces.map((p) => [p.loShuPosition, p]));
  const centerPalace = palaceMap.get(5);

  return (
    <svg
      viewBox="0 0 300 300"
      width="300"
      height="300"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="風水羅盤"
    >
      <defs>
        <radialGradient id="luopan-bg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(255,252,240,0.96)" />
          <stop offset="100%" stopColor="rgba(238,228,198,0.94)" />
        </radialGradient>
        <filter id="luopan-shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="rgba(0,0,0,0.35)" />
        </filter>
      </defs>

      {/* ── Background ── */}
      <circle
        cx={cx}
        cy={cy}
        r={TICK_OUTER}
        fill="url(#luopan-bg)"
        stroke="rgba(180,140,60,0.8)"
        strokeWidth="2"
        filter="url(#luopan-shadow)"
      />

      {/* ── Degree tick ring ── */}
      {Array.from({ length: 36 }, (_, i) => {
        const deg = i * 10;
        const isMajor = deg % 30 === 0;
        const isCardinal = deg % 90 === 0;
        const tickLen = isCardinal ? 9 : isMajor ? 6 : 3;
        const [x1, y1] = pt(cx, cy, TICK_OUTER, deg);
        const [x2, y2] = pt(cx, cy, TICK_OUTER - tickLen, deg);
        return (
          <line
            key={deg}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={
              isCardinal
                ? 'rgba(180,140,60,0.9)'
                : isMajor
                  ? 'rgba(160,120,50,0.6)'
                  : 'rgba(160,120,50,0.3)'
            }
            strokeWidth={isCardinal ? 1.5 : 1}
          />
        );
      })}

      {/* ── Flying star ring (8 directions) ── */}
      {Object.entries(LOSHU_COMPASS).map(([pos, midDeg]) => {
        const loShuPos = Number(pos);
        const palace = palaceMap.get(loShuPos as 1 | 2 | 3 | 4 | 6 | 7 | 8 | 9);
        if (!palace) return null;
        const startDeg = midDeg - 22.5;
        const annualInfo = STAR_INFO[palace.annualStar];
        const monthlyInfo = STAR_INFO[palace.monthlyStar];
        const labelR = (STAR_INNER + STAR_OUTER) / 2;
        return (
          <g key={pos}>
            <path
              d={arcPath(cx, cy, STAR_INNER, STAR_OUTER, startDeg, startDeg + 45)}
              fill={`${annualInfo.color}28`}
              stroke="rgba(180,140,60,0.35)"
              strokeWidth="0.5"
            />
            {/* Annual star — large */}
            <text
              transform={`translate(${cx},${cy}) rotate(${midDeg}) translate(${labelR + 8},0)`}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="17"
              fontWeight="bold"
              fontFamily="serif"
              fill={annualInfo.color}
            >
              {palace.annualStar}
            </text>
            {/* Monthly star — small */}
            <text
              transform={`translate(${cx},${cy}) rotate(${midDeg}) translate(${labelR - 9},0)`}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="10"
              fontFamily="serif"
              fill={monthlyInfo.color}
              opacity={0.85}
            >
              月{palace.monthlyStar}
            </text>
          </g>
        );
      })}

      {/* Star ring dividers (45° each) */}
      {Array.from({ length: 8 }, (_, i) => {
        const deg = i * 45;
        const [x1, y1] = pt(cx, cy, STAR_INNER, deg);
        const [x2, y2] = pt(cx, cy, STAR_OUTER, deg);
        return (
          <line
            key={deg}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="rgba(180,140,60,0.5)"
            strokeWidth="0.8"
          />
        );
      })}

      {/* ── 24-mountain ring ── */}
      {MOUNTAINS.map((name, i) => {
        // Mountain 0 (壬) starts at 337.5°; each is 15°
        const startDeg = 337.5 + i * 15;
        const midDeg = startDeg + 7.5;
        // Trigram index: every 3 mountains belong to the same trigram
        // Mountain 0-2 = 坎 (TRIGRAMS[1]), 3-5 = 艮 (TRIGRAMS[2]), etc.
        const trigramIdx = (Math.floor(i / 3) + 1) % 8;
        const trig = TRIGRAMS[trigramIdx];
        const isMiddle = i % 3 === 1; // middle mountain of each trigram (the "principal" one)
        const mtnR = (MTN_INNER + MTN_OUTER) / 2;
        return (
          <g key={name + i}>
            <path
              d={arcPath(cx, cy, MTN_INNER, MTN_OUTER, startDeg, startDeg + 15)}
              fill={isMiddle ? `${trig.stroke}22` : `${trig.stroke}0d`}
              stroke="rgba(180,140,60,0.4)"
              strokeWidth="0.5"
            />
            <text
              transform={`translate(${cx},${cy}) rotate(${midDeg}) translate(${mtnR},0)`}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="10.5"
              fontFamily="serif"
              fontWeight={isMiddle ? 'bold' : 'normal'}
              fill={trig.stroke}
            >
              {name}
            </text>
          </g>
        );
      })}

      {/* ── Trigram ring ── */}
      {TRIGRAMS.map((trig) => {
        const midDeg = trig.startDeg + 22.5;
        const labelR = (TRIG_INNER + TRIG_OUTER) / 2;
        return (
          <g key={trig.name}>
            <path
              d={arcPath(cx, cy, TRIG_INNER, TRIG_OUTER, trig.startDeg, trig.startDeg + 45)}
              fill={trig.fill}
              stroke={`${trig.stroke}66`}
              strokeWidth="0.8"
            />
            <text
              transform={`translate(${cx},${cy}) rotate(${midDeg}) translate(${labelR},0)`}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="14"
              fontFamily="serif"
              fontWeight="bold"
              fill={trig.stroke}
            >
              {trig.name}
            </text>
          </g>
        );
      })}

      {/* ── Ring boundary circles ── */}
      {[TRIG_OUTER, MTN_OUTER, STAR_OUTER].map((r) => (
        <circle
          key={r}
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="rgba(180,140,60,0.55)"
          strokeWidth="0.8"
        />
      ))}

      {/* ── Center circle ── */}
      <circle
        cx={cx}
        cy={cy}
        r={CENTER_R}
        fill="rgba(255,252,240,0.95)"
        stroke="rgba(180,140,60,0.8)"
        strokeWidth="1.2"
      />

      {/* Center crosshair */}
      <line
        x1={cx}
        y1={cy - CENTER_R + 4}
        x2={cx}
        y2={cy + CENTER_R - 4}
        stroke="rgba(180,140,60,0.3)"
        strokeWidth="0.6"
      />
      <line
        x1={cx - CENTER_R + 4}
        y1={cy}
        x2={cx + CENTER_R - 4}
        y2={cy}
        stroke="rgba(180,140,60,0.3)"
        strokeWidth="0.6"
      />

      {/* Center: annual + monthly star numbers */}
      <text
        x={cx}
        y={cy - 12}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="8"
        fontFamily="serif"
        fill="#888"
      >
        中宮
      </text>
      {centerPalace && (
        <>
          <text
            x={cx}
            y={cy + 2}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="18"
            fontWeight="bold"
            fontFamily="serif"
            fill={STAR_INFO[centerPalace.annualStar].color}
          >
            {centerPalace.annualStar}
          </text>
          <text
            x={cx}
            y={cy + 16}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="9"
            fontFamily="serif"
            fill={STAR_INFO[centerPalace.monthlyStar].color}
            opacity={0.85}
          >
            月{centerPalace.monthlyStar}
          </text>
        </>
      )}

      {/* ── North indicator (red triangle + 北 label) ── */}
      <polygon
        points={`${cx},${cy - CENTER_R + 2} ${cx - 5},${cy - CENTER_R + 12} ${cx + 5},${cy - CENTER_R + 12}`}
        fill="#C0392B"
        opacity={0.85}
      />

      {/* ── Cardinal direction labels (outside tick ring) ── */}
      <text
        x={cx}
        y={7}
        textAnchor="middle"
        fontSize="11"
        fontWeight="bold"
        fontFamily="serif"
        fill="#C0392B"
      >
        北
      </text>
      <text
        x={cx}
        y={295}
        textAnchor="middle"
        fontSize="11"
        fontWeight="bold"
        fontFamily="serif"
        fill="#555"
      >
        南
      </text>
      <text
        x={293}
        y={cy + 4}
        textAnchor="end"
        fontSize="11"
        fontWeight="bold"
        fontFamily="serif"
        fill="#555"
      >
        東
      </text>
      <text
        x={7}
        y={cy + 4}
        textAnchor="start"
        fontSize="11"
        fontWeight="bold"
        fontFamily="serif"
        fill="#555"
      >
        西
      </text>
    </svg>
  );
}

// ── FengshuiMapView component ─────────────────────────────────────────────────

interface FengshuiMapViewProps {
  chart: FlyingStarsChart;
}

export function FengshuiMapView({ chart }: FengshuiMapViewProps) {
  const [rotation, setRotation] = useState(0);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [compassActive, setCompassActive] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<L.Map | null>(null);
  const compassCleanupRef = useRef<(() => void) | null>(null);

  // ── Initialise Leaflet map ──
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [25.046, 121.517], // Taipei default
      zoom: 16,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    leafletRef.current = map;

    return () => {
      map.remove();
      leafletRef.current = null;
    };
  }, []);

  // ── Cleanup compass listener on unmount ──
  useEffect(() => {
    return () => {
      compassCleanupRef.current?.();
    };
  }, []);

  // ── Address search ──
  const handleSearch = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!query.trim()) return;
      setIsSearching(true);
      setResults([]);
      try {
        const res = await geocode(query);
        setResults(res);
      } finally {
        setIsSearching(false);
      }
    },
    [query],
  );

  const handleSelectResult = useCallback((result: GeocodingResult) => {
    leafletRef.current?.setView([result.latitude, result.longitude], 17);
    setQuery(result.displayName.split(',')[0].trim());
    setResults([]);
  }, []);

  // ── Device compass (auto-North) ──
  const toggleCompass = useCallback(async () => {
    // Deactivate if already running
    if (compassActive) {
      compassCleanupRef.current?.();
      compassCleanupRef.current = null;
      setCompassActive(false);
      return;
    }

    // iOS 13+ requires explicit permission
    const DevOri = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<string>;
    };
    if (typeof DevOri.requestPermission === 'function') {
      const perm = await DevOri.requestPermission();
      if (perm !== 'granted') return;
    }

    const handler = (e: DeviceOrientationEvent) => {
      if (e.alpha !== null) {
        // Rotate luopan so that current device heading faces the screen top
        setRotation(Math.round((((360 - e.alpha) % 360) + 360) % 360));
      }
    };

    // Prefer absolute orientation (Android / Chrome); fall back to standard
    const eventName =
      'ondeviceorientationabsolute' in window ? 'deviceorientationabsolute' : 'deviceorientation';
    window.addEventListener(eventName, handler as EventListener);

    compassCleanupRef.current = () => {
      window.removeEventListener(eventName, handler as EventListener);
    };
    setCompassActive(true);
  }, [compassActive]);

  const adjustRotation = useCallback((delta: number) => {
    setRotation((r) => (((r + delta) % 360) + 360) % 360);
  }, []);

  return (
    <section className="fengshui-map-section">
      <h4 className="fengshui-section-title">地圖風水分析</h4>

      {/* ── Address search ── */}
      <form className="fengshui-map-search" onSubmit={handleSearch}>
        <input
          className="fengshui-input fengshui-map-query"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="輸入地址搜尋地點…"
          aria-label="地址搜尋"
        />
        <button type="submit" className="fengshui-upload-btn" disabled={isSearching}>
          {isSearching ? '搜尋中…' : '搜尋'}
        </button>
      </form>

      {/* Search results dropdown */}
      {results.length > 0 && (
        <ul className="fengshui-map-results" role="listbox">
          {results.map((r, i) => (
            <li
              key={i}
              className="fengshui-map-result-item"
              role="option"
              aria-selected={false}
              onClick={() => handleSelectResult(r)}
            >
              {r.displayName}
            </li>
          ))}
        </ul>
      )}

      {/* ── Map + Luopan overlay ── */}
      <div className="fengshui-map-container">
        {/* Leaflet map */}
        <div ref={mapContainerRef} className="fengshui-leaflet-map" aria-label="地圖" />

        {/* Luopan overlay — centred over the map, pointer-events:none so map stays interactive */}
        <div className="luopan-overlay">
          <div
            className="luopan-wrap"
            style={{ transform: `rotate(${rotation}deg)` }}
            aria-label={`風水羅盤，旋轉 ${rotation}°`}
          >
            <LuopanSvg chart={chart} />
          </div>
        </div>

        {/* Rotation controls — bottom-right of map */}
        <div className="luopan-controls" role="group" aria-label="羅盤旋轉控制">
          <button
            type="button"
            className="luopan-btn"
            onClick={() => adjustRotation(-15)}
            title="逆時針 15°"
          >
            ↺
          </button>
          <input
            type="range"
            className="luopan-slider"
            min={0}
            max={359}
            value={rotation}
            onChange={(e) => setRotation(Number(e.target.value))}
            aria-label="羅盤角度"
          />
          <button
            type="button"
            className="luopan-btn"
            onClick={() => adjustRotation(15)}
            title="順時針 15°"
          >
            ↻
          </button>
          <span className="luopan-degree">{rotation}°</span>
          <button
            type="button"
            className={`luopan-btn luopan-compass-btn${compassActive ? ' luopan-compass-btn--active' : ''}`}
            onClick={toggleCompass}
            title={compassActive ? '停止自動指北' : '啟動設備指北'}
          >
            🧭
          </button>
        </div>
      </div>

      <p className="fengshui-map-tip">
        拖移地圖使屋宅中心對齊羅盤中心，再旋轉羅盤使向首對齊建築面向。行動裝置可按 🧭 自動指北。
      </p>
    </section>
  );
}
