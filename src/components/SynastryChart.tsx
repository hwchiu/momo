/**
 * SynastryChart — Dual-ring SVG chart.
 *
 * Layout:
 *   - Outer zodiac belt (signs)
 *   - Person B's planets on outer ring (R=175, red)
 *   - Person A's planets on inner ring (R=140, blue)
 *   - Cross-aspect lines connecting A↔B planets
 *   - A's ascendant used to orient the wheel
 */

import type { NatalChart, PlanetPosition } from '../types/astro';
import { ZODIAC_SIGNS, PLANET_INFO, ASPECT_INFO, ZodiacSign } from '../types/astro';
import type { SynastryAspect } from '../types/synastry';

const CX = 250;
const CY = 250;
const R_OUTER = 230;        // zodiac outer boundary
const R_ZODIAC = 200;       // zodiac inner boundary / planet B outer edge
const R_B = 183;            // Person B planet ring
const R_A = 152;            // Person A planet ring
const R_INNER_CIRCLE = 120; // separator circle
const R_ASPECT_A = 148;     // aspect line endpoint (A side)
const R_ASPECT_B = 178;     // aspect line endpoint (B side)

/** Convert ecliptic longitude to SVG angle (radians). ASC at 9 o'clock (π). */
function lonToAngle(lon: number, asc: number): number {
  return Math.PI - ((lon - asc) * Math.PI) / 180;
}

function polarToXY(angle: number, r: number) {
  return { x: CX + r * Math.cos(angle), y: CY + r * Math.sin(angle) };
}

function lonToXY(lon: number, asc: number, r: number) {
  return polarToXY(lonToAngle(lon, asc), r);
}

// Zodiac sign display order (0=Aries ... 11=Pisces)
const SIGN_ORDER = Array.from({ length: 12 }, (_, i) => i as ZodiacSign);

// Alternating sector colors
const SECTOR_COLORS = ['#f8f4e8', '#ece6d8'];

interface ZodiacWheelProps {
  asc: number;
}

function ZodiacWheel({ asc }: ZodiacWheelProps) {
  return (
    <>
      {SIGN_ORDER.map((sign, i) => {
        const startLon = sign * 30;
        const endLon = startLon + 30;
        const a1 = lonToAngle(startLon, asc);
        const a2 = lonToAngle(endLon, asc);

        // Arc sector path (outer ring only)
        const x1o = CX + R_OUTER * Math.cos(a1);
        const y1o = CY + R_OUTER * Math.sin(a1);
        const x2o = CX + R_OUTER * Math.cos(a2);
        const y2o = CY + R_OUTER * Math.sin(a2);
        const x1i = CX + R_ZODIAC * Math.cos(a1);
        const y1i = CY + R_ZODIAC * Math.sin(a1);
        const x2i = CX + R_ZODIAC * Math.cos(a2);
        const y2i = CY + R_ZODIAC * Math.sin(a2);

        // SVG arcs go clockwise when sweep=1; zodiac goes counterclockwise in chart coords
        const sweepOuter = 0; // CCW arc
        const d = [
          `M ${x1o} ${y1o}`,
          `A ${R_OUTER} ${R_OUTER} 0 0 ${sweepOuter} ${x2o} ${y2o}`,
          `L ${x2i} ${y2i}`,
          `A ${R_ZODIAC} ${R_ZODIAC} 0 0 1 ${x1i} ${y1i}`,
          'Z',
        ].join(' ');

        // Sign glyph at midpoint of sector
        const midLon = startLon + 15;
        const gmid = lonToXY(midLon, asc, (R_OUTER + R_ZODIAC) / 2);

        return (
          <g key={sign}>
            <path d={d} fill={SECTOR_COLORS[i % 2]} stroke="#aaa" strokeWidth={0.5} />
            <text
              x={gmid.x} y={gmid.y}
              textAnchor="middle" dominantBaseline="middle"
              fontSize={11} fill="#555"
            >
              {ZODIAC_SIGNS[sign].glyph}
            </text>
          </g>
        );
      })}

      {/* Outer and inner boundary circles */}
      <circle cx={CX} cy={CY} r={R_OUTER} fill="none" stroke="#888" strokeWidth={1} />
      <circle cx={CX} cy={CY} r={R_ZODIAC} fill="none" stroke="#888" strokeWidth={0.8} />

      {/* Sign boundary tick lines (at 30° intervals) */}
      {SIGN_ORDER.map((sign) => {
        const a = lonToAngle(sign * 30, asc);
        const p1 = polarToXY(a, R_ZODIAC);
        const p2 = polarToXY(a, R_OUTER);
        return <line key={sign} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#888" strokeWidth={1} />;
      })}
    </>
  );
}

// ---- Planet ring helpers ----

interface PlanetMarkerProps {
  pos: PlanetPosition;
  asc: number;
  r: number;
  rLabel: number;
  color: string;
  bgColor: string;
  offsetDeg?: number;
}

function PlanetMarker({ pos, asc, r, rLabel, color, bgColor, offsetDeg = 0 }: PlanetMarkerProps) {
  const displayLon = pos.longitude + offsetDeg;
  const dot = lonToXY(displayLon, asc, r);
  const label = lonToXY(displayLon, asc, rLabel);
  const info = PLANET_INFO[pos.planet];

  return (
    <g>
      <circle cx={dot.x} cy={dot.y} r={5} fill={color} stroke={bgColor} strokeWidth={1.5} />
      <text
        x={label.x} y={label.y}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={10} fill={color} fontWeight="bold"
      >
        {info.glyph}
      </text>
      {pos.retrograde && (
        <text
          x={label.x + 7} y={label.y - 4}
          fontSize={7} fill={color}
        >
          ℞
        </text>
      )}
    </g>
  );
}

// ---- Offset crowded planets ----

function applyOffsets(planets: PlanetPosition[]): number[] {
  const sorted = [...planets].sort((a, b) => a.longitude - b.longitude);
  const offsets: number[] = new Array(planets.length).fill(0);

  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      let diff = sorted[j].longitude - sorted[i].longitude;
      if (diff > 180) diff -= 360;
      if (Math.abs(diff) < 8) {
        const originalIdx = planets.findIndex((p) => p.planet === sorted[j].planet);
        offsets[originalIdx] = 8 - Math.abs(diff);
      }
    }
  }
  return offsets;
}

// ---- Aspect lines ----

interface AspectLineProps {
  asp: SynastryAspect;
  asc: number;
  planetsA: PlanetPosition[];
  planetsB: PlanetPosition[];
}

function AspectLine({ asp, asc, planetsA, planetsB }: AspectLineProps) {
  const pa = planetsA.find((p) => p.planet === asp.planetA);
  const pb = planetsB.find((p) => p.planet === asp.planetB);
  if (!pa || !pb) return null;

  const info = ASPECT_INFO[asp.type];
  const xyA = lonToXY(pa.longitude, asc, R_ASPECT_A);
  const xyB = lonToXY(pb.longitude, asc, R_ASPECT_B);

  const opacity = Math.max(0.15, 1 - asp.orb / 10);
  const strokeWidth = asp.orb <= 1 ? 2 : asp.orb <= 3 ? 1.2 : 0.7;

  return (
    <line
      x1={xyA.x} y1={xyA.y}
      x2={xyB.x} y2={xyB.y}
      stroke={info.color}
      strokeWidth={strokeWidth}
      strokeOpacity={opacity}
      strokeDasharray={asp.type === 90 || asp.type === 180 ? '4 3' : undefined}
    />
  );
}

// ---- Main component ----

interface SynastryChartProps {
  nameA: string;
  nameB: string;
  chartA: NatalChart;
  chartB: NatalChart;
  aspects: SynastryAspect[];
  size?: number;
}

export function SynastryChart({ nameA, nameB, chartA, chartB, aspects, size = 500 }: SynastryChartProps) {
  const asc = chartA.ascendant;
  const offsetsA = applyOffsets(chartA.planets);
  const offsetsB = applyOffsets(chartB.planets);

  // ASC indicator line
  const ascPt1 = lonToXY(asc, asc, R_INNER_CIRCLE);
  const ascPt2 = lonToXY(asc, asc, R_ZODIAC);

  // DSC
  const dscLon = (asc + 180) % 360;
  const dscPt1 = lonToXY(dscLon, asc, R_INNER_CIRCLE);
  const dscPt2 = lonToXY(dscLon, asc, R_ZODIAC);

  return (
    <div className="synastry-chart-wrap">
      <div className="synastry-chart-legend">
        <span className="legend-a">●</span> {nameA}（A）內圈
        <span className="legend-sep"> / </span>
        <span className="legend-b">●</span> {nameB}（B）外圈
      </div>
      <svg
        width={size} height={size}
        viewBox={`0 0 ${CX * 2} ${CY * 2}`}
        style={{ display: 'block', margin: '0 auto' }}
      >
        {/* Background */}
        <circle cx={CX} cy={CY} r={R_OUTER} fill="#fafaf6" />

        {/* Zodiac wheel */}
        <ZodiacWheel asc={asc} />

        {/* Inner separator circle */}
        <circle cx={CX} cy={CY} r={R_INNER_CIRCLE} fill="#f0ede4" stroke="#bbb" strokeWidth={0.8} />

        {/* Center */}
        <circle cx={CX} cy={CY} r={2} fill="#888" />

        {/* ASC/DSC axis */}
        <line x1={ascPt1.x} y1={ascPt1.y} x2={ascPt2.x} y2={ascPt2.y} stroke="#666" strokeWidth={1.5} />
        <line x1={dscPt1.x} y1={dscPt1.y} x2={dscPt2.x} y2={dscPt2.y} stroke="#666" strokeWidth={1} strokeDasharray="4 3" />
        <text x={ascPt2.x - 3} y={ascPt2.y - 4} fontSize={9} fill="#444" textAnchor="middle">ASC</text>

        {/* Aspect lines (drawn before planets so planets are on top) */}
        {aspects.slice(0, 30).map((asp, i) => (
          <AspectLine key={i} asp={asp} asc={asc} planetsA={chartA.planets} planetsB={chartB.planets} />
        ))}

        {/* Person B planets (outer ring, red) */}
        {chartB.planets.map((pos, i) => (
          <PlanetMarker
            key={pos.planet}
            pos={pos}
            asc={asc}
            r={R_B}
            rLabel={R_B + 14}
            color="#c0392b"
            bgColor="#fff"
            offsetDeg={offsetsB[i]}
          />
        ))}

        {/* Person A planets (inner ring, blue) */}
        {chartA.planets.map((pos, i) => (
          <PlanetMarker
            key={pos.planet}
            pos={pos}
            asc={asc}
            r={R_A}
            rLabel={R_A - 14}
            color="#1a5ca8"
            bgColor="#fff"
            offsetDeg={offsetsA[i]}
          />
        ))}

        {/* Name labels */}
        <text x={CX} y={CY - 14} textAnchor="middle" fontSize={10} fill="#1a5ca8" fontWeight="bold">
          {nameA}
        </text>
        <text x={CX} y={CY + 4} textAnchor="middle" fontSize={9} fill="#888">A 內圈 / B 外圈</text>
        <text x={CX} y={CY + 18} textAnchor="middle" fontSize={10} fill="#c0392b" fontWeight="bold">
          {nameB}
        </text>
      </svg>
    </div>
  );
}
