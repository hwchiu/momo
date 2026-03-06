import type { VedicChart, VedicPlanet } from '../types/vedic';
import { RASHI_SHORT, PLANET_COLORS, BENEFIC_PLANETS, MALEFIC_PLANETS } from '../types/vedic';

interface SouthIndianChartProps {
  chart: VedicChart;
}

/**
 * South Indian (fixed-sign) Rashi chart.
 * Rashis occupy fixed positions in a 4×4 grid;
 * the planets (and Lagna mark) shift based on the birth data.
 *
 *   Pi(11) | Ar(0) | Ta(1) | Ge(2)
 *   Aq(10) |     CENTER    | Ca(3)
 *   Cp(9)  |     CENTER    | Le(4)
 *   Sg(8)  | Sc(7) | Li(6) | Vi(5)
 */

function PlanetToken({ planet }: { planet: VedicPlanet }) {
  const color = PLANET_COLORS[planet.name] ?? '#444';
  const isBenefic = BENEFIC_PLANETS.has(planet.name);
  const isMalefic = MALEFIC_PLANETS.has(planet.name);
  const bg = isBenefic
    ? 'rgba(218,165,32,0.14)'
    : isMalefic
      ? 'rgba(220,20,60,0.12)'
      : 'transparent';
  return (
    <span
      className="si-planet-token"
      style={{ color, backgroundColor: bg }}
      title={`${planet.nameZh} ${planet.degreeInRashi.toFixed(1)}° ${planet.retrograde ? '逆行' : ''}`}
    >
      {planet.abbr}
      {planet.retrograde ? '℞' : ''}
    </span>
  );
}

function RashiCell({
  rashi,
  lagnaRashi,
  planets,
}: {
  rashi: number;
  lagnaRashi: number;
  planets: VedicPlanet[];
}) {
  const isLagna = rashi === lagnaRashi;
  const house = ((rashi - lagnaRashi + 12) % 12) + 1;
  const planetsHere = planets.filter((p) => p.rashi === rashi);

  return (
    <td className={`si-cell${isLagna ? ' si-lagna' : ''}`}>
      <div className="si-cell-inner">
        <div className="si-cell-header">
          <span className="si-rashi-name">{RASHI_SHORT[rashi]}</span>
          <span className="si-house-num">{house}</span>
          {isLagna && <span className="si-lagna-mark">Lg</span>}
        </div>
        <div className="si-planets">
          {planetsHere.map((p) => (
            <PlanetToken key={p.name} planet={p} />
          ))}
        </div>
      </div>
    </td>
  );
}

export function SouthIndianChart({ chart }: SouthIndianChartProps) {
  const { planets, lagnaRashi, lagna, ayanamshaValue, input } = chart;
  const lagnaArcMin = Math.round((lagna % 1) * 60);

  return (
    <div className="si-chart-wrap">
      <table className="si-chart-table" cellSpacing={0} cellPadding={0}>
        <tbody>
          {/* Row 1: Pi Ar Ta Ge */}
          <tr>
            {([11, 0, 1, 2] as const).map((r) => (
              <RashiCell key={r} rashi={r} lagnaRashi={lagnaRashi} planets={planets} />
            ))}
          </tr>
          {/* Row 2: Aq | CENTER(rowspan 2 colspan 2) | Ca */}
          <tr>
            <RashiCell rashi={10} lagnaRashi={lagnaRashi} planets={planets} />
            <td colSpan={2} rowSpan={2} className="si-center">
              <div className="si-center-content">
                <div className="si-center-title">印度命盤</div>
                <div className="si-center-info">
                  Lagna {Math.floor(lagna)}°{lagnaArcMin}'
                </div>
                <div className="si-center-info">{input.locationName}</div>
              </div>
            </td>
            <RashiCell rashi={3} lagnaRashi={lagnaRashi} planets={planets} />
          </tr>
          {/* Row 3: Cp | CENTER(continued) | Le */}
          <tr>
            <RashiCell rashi={9} lagnaRashi={lagnaRashi} planets={planets} />
            <RashiCell rashi={4} lagnaRashi={lagnaRashi} planets={planets} />
          </tr>
          {/* Row 4: Sg Sc Li Vi */}
          <tr>
            {([8, 7, 6, 5] as const).map((r) => (
              <RashiCell key={r} rashi={r} lagnaRashi={lagnaRashi} planets={planets} />
            ))}
          </tr>
        </tbody>
      </table>
      <div className="si-footer">
        Ayanamsha: {ayanamshaValue.toFixed(4)}° &nbsp;|&nbsp;
        {input.year}-{String(input.month).padStart(2, '0')}-{String(input.day).padStart(2, '0')}{' '}
        {String(input.hour).padStart(2, '0')}:{String(input.minute).padStart(2, '0')} UTC
        &nbsp;|&nbsp; Whole Sign Houses
      </div>
      <div className="si-legend">
        <span style={{ color: '#DAA520' }}>■</span> 吉星&nbsp;&nbsp;
        <span style={{ color: '#DC143C' }}>■</span> 凶星&nbsp;&nbsp;
        ℞ 逆行
      </div>
    </div>
  );
}
