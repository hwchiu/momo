import { calculateReceptionMatrix, calculateAspectEnhancement } from '../lib/reception';
import type { ReceptionMatrix, MutualReception } from '../types/reception';
import { ReceptionLevel } from '../types/reception';
import type { NatalChart } from '../types/astro';
import { PLANET_INFO, ZODIAC_SIGNS, ASPECT_INFO, Planet } from '../types/astro';
import { CLASSICAL_PLANETS } from '../lib/classical';

interface ReceptionAnalysisProps {
  chart: NatalChart;
}

const LEVEL_LABELS: Record<ReceptionLevel, string> = {
  [ReceptionLevel.Domicile]: '守護',
  [ReceptionLevel.Exaltation]: '貴客',
  [ReceptionLevel.Triplicity]: '三分',
  [ReceptionLevel.Terms]: '界',
  [ReceptionLevel.Face]: '面',
  [ReceptionLevel.None]: '—',
};

function PlanetCell({ planet }: { planet: Planet }) {
  const info = PLANET_INFO[planet];
  return (
    <span>
      <span className="planet-glyph">{info.glyph}</span> {info.name}
    </span>
  );
}

function StrengthBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className="strength-bar">
      <div className="strength-fill" style={{ width: `${pct}%` }} />
      <span className="strength-label">{Math.round(pct)}%</span>
    </div>
  );
}

function MutualReceptionRow({ mr, index }: { mr: MutualReception; index: number }) {
  return (
    <tr className={index % 2 === 0 ? 'row-even' : 'row-odd'}>
      <td className="planet-cell">
        <PlanetCell planet={mr.planetA} />
      </td>
      <td className="center-cell">↔</td>
      <td className="planet-cell">
        <PlanetCell planet={mr.planetB} />
      </td>
      <td className="center-cell">
        <span className="mutual-reception-badge">{LEVEL_LABELS[mr.levelAtoB]}</span>
      </td>
      <td className="center-cell">
        <span className="mutual-reception-badge">{LEVEL_LABELS[mr.levelBtoA]}</span>
      </td>
      <td style={{ minWidth: 120 }}>
        <StrengthBar value={mr.combinedStrength} />
      </td>
      <td className="center-cell">{mr.isSymmetrical ? '✓ 對稱' : '不對稱'}</td>
    </tr>
  );
}

function ReceptionTableSection({ matrix }: { matrix: ReceptionMatrix }) {
  return (
    <>
      <h3 className="section-title">接納關係</h3>
      <div className="table-scroll">
        <table className="data-table" cellPadding={3} cellSpacing={0}>
          <thead>
            <tr className="table-header">
              <th>行星</th>
              <th>被接納等級</th>
              <th>接納者</th>
              <th>星座</th>
            </tr>
          </thead>
          <tbody>
            {CLASSICAL_PLANETS.flatMap((planet) => {
              const receptions = matrix.receivedByMap.get(planet) ?? [];
              if (receptions.length === 0) return [];
              return receptions.map((rec, ri) => (
                <tr key={`${planet}-${ri}`} className={ri % 2 === 0 ? 'row-even' : 'row-odd'}>
                  <td className="planet-cell">
                    <PlanetCell planet={rec.planet} />
                  </td>
                  <td className="center-cell">
                    <span className="mutual-reception-badge">{LEVEL_LABELS[rec.level]}</span>
                  </td>
                  <td className="planet-cell">
                    <PlanetCell planet={rec.dispositor} />
                  </td>
                  <td className="center-cell">
                    <span className="sign-glyph">{ZODIAC_SIGNS[rec.zodiacSign].glyph}</span>{' '}
                    {ZODIAC_SIGNS[rec.zodiacSign].name}
                  </td>
                </tr>
              ));
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function ReceptionAnalysis({ chart }: ReceptionAnalysisProps) {
  const matrix = calculateReceptionMatrix(chart);

  return (
    <div className="reception-section">
      {/* Section 1: Mutual Receptions */}
      <h3 className="section-title">相互互融（Mutual Reception）</h3>
      {matrix.mutualReceptions.length === 0 ? (
        <p className="no-data">目前無相互互融</p>
      ) : (
        <div className="table-scroll">
          <table className="data-table" cellPadding={3} cellSpacing={0}>
            <thead>
              <tr className="table-header">
                <th>行星甲</th>
                <th>↔</th>
                <th>行星乙</th>
                <th>甲接納乙</th>
                <th>乙接納甲</th>
                <th>合力強度</th>
                <th>對稱</th>
              </tr>
            </thead>
            <tbody>
              {matrix.mutualReceptions.map((mr, i) => (
                <MutualReceptionRow key={i} mr={mr} index={i} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Section 2: Reception Table */}
      <ReceptionTableSection matrix={matrix} />

      {/* Section 3: Aspect Enhancement */}
      <h3 className="section-title">相位互融增強（Aspect Enhancement）</h3>
      {chart.aspects.length === 0 ? (
        <p className="no-data">沒有相位資料</p>
      ) : (
        <div className="table-scroll">
          <table className="data-table" cellPadding={3} cellSpacing={0}>
            <thead>
              <tr className="table-header">
                <th>行星 1</th>
                <th>相位</th>
                <th>行星 2</th>
                <th>基礎強度</th>
                <th>互融加成</th>
                <th>最終強度</th>
                <th>可執行性</th>
              </tr>
            </thead>
            <tbody>
              {chart.aspects.map((a, i) => {
                const posA = chart.planets.find((p) => p.planet === a.planet1);
                const posB = chart.planets.find((p) => p.planet === a.planet2);
                const enhancement = calculateAspectEnhancement(
                  a.planet1,
                  posA?.longitude ?? 0,
                  posA?.retrograde ?? false,
                  a.planet2,
                  posB?.longitude ?? 0,
                  posB?.retrograde ?? false,
                  a,
                  matrix,
                );
                const aspectInfo = ASPECT_INFO[a.type];
                const execClass = `executability-${enhancement.executability}`;
                const execLabel: Record<string, string> = {
                  high: '高',
                  medium: '中',
                  low: '低',
                  blocked: '阻礙',
                };
                return (
                  <tr key={i} className={i % 2 === 0 ? 'row-even' : 'row-odd'}>
                    <td className="planet-cell">
                      <PlanetCell planet={a.planet1} />
                    </td>
                    <td className="aspect-cell center-cell" style={{ color: aspectInfo.color }}>
                      {aspectInfo.symbol} {aspectInfo.name}
                    </td>
                    <td className="planet-cell">
                      <PlanetCell planet={a.planet2} />
                    </td>
                    <td className="center-cell">{Math.round(enhancement.baseStrength)}%</td>
                    <td className="center-cell">
                      {enhancement.receptionEnhancement > 0
                        ? `+${Math.round(enhancement.receptionEnhancement)}%`
                        : '—'}
                    </td>
                    <td style={{ minWidth: 100 }}>
                      <StrengthBar value={enhancement.finalStrength} />
                    </td>
                    <td className={`center-cell ${execClass}`}>
                      {execLabel[enhancement.executability] ?? enhancement.executability}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
