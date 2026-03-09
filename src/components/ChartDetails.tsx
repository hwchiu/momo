import { useState } from 'react';
import type { NatalChart } from '../types/astro';
import {
  ZODIAC_SIGNS,
  PLANET_INFO,
  ASPECT_INFO,
  HOUSE_SYSTEM_INFO,
  Planet,
  ZodiacSign,
  AspectType,
} from '../types/astro';
import type { PlanetPosition } from '../types/astro';
import {
  CLASSICAL_PLANETS,
  OUTER_PLANETS,
  DOMICILE,
  EXALTATION,
  DETRIMENT,
  FALL,
  EGYPTIAN_TERMS,
  getTriplicityRulers,
  getDecanRuler,
  getInnateState,
  getAffiliatedStates,
  getDomicileRulerHouse,
  getExaltationRulerHouse,
  calculateDignityScore,
  isDayChart,
  isPeregrine,
} from '../lib/classical';
import { calculateReceptionMatrix, calculateAspectEnhancement } from '../lib/reception';
import { ReceptionAnalysis } from './ReceptionAnalysis';

interface ChartDetailsProps {
  chart: NatalChart;
}

// Render a zodiac glyph+degree string like "♑ 13° 24'"
function formatLongitude(pos: PlanetPosition): string {
  const sign = ZODIAC_SIGNS[pos.sign];
  return `${sign.glyph} ${pos.degree}° ${pos.minute}'`;
}

function PlanetGlyph({ planet }: { planet: Planet }) {
  const info = PLANET_INFO[planet];
  return <span className="planet-glyph">{info.glyph}</span>;
}

function SignGlyph({ sign }: { sign: ZodiacSign }) {
  const info = ZODIAC_SIGNS[sign];
  return <span className="sign-glyph">{info.glyph}</span>;
}

export function ChartDetails({ chart }: ChartDetailsProps) {
  const [activeTab, setActiveTab] = useState<'planets' | 'dignity' | 'aspects' | 'reception'>(
    'planets',
  );
  const [filterAspectTypes, setFilterAspectTypes] = useState<Set<AspectType>>(
    new Set([
      AspectType.Conjunction,
      AspectType.Sextile,
      AspectType.Square,
      AspectType.Trine,
      AspectType.Opposition,
    ]),
  );
  const [filterPlanetGroup, setFilterPlanetGroup] = useState<'all' | 'classical' | 'modern'>('all');
  const [filterMaxOrb, setFilterMaxOrb] = useState<number>(12);

  const sunPos = chart.planets.find((p) => p.planet === Planet.Sun);
  if (!sunPos) return null;

  const dayChart = isDayChart(sunPos.house);

  const CLASSICAL_PLANET_SET = new Set<Planet>([
    Planet.Sun,
    Planet.Moon,
    Planet.Mercury,
    Planet.Venus,
    Planet.Mars,
    Planet.Jupiter,
    Planet.Saturn,
  ]);
  const MODERN_PLANET_SET = new Set<Planet>([Planet.Uranus, Planet.Neptune, Planet.Pluto]);

  const filteredAspects = chart.aspects.filter((a) => {
    if (!filterAspectTypes.has(a.type)) return false;
    if (a.orb > filterMaxOrb) return false;
    if (filterPlanetGroup === 'classical') {
      if (!CLASSICAL_PLANET_SET.has(a.planet1) || !CLASSICAL_PLANET_SET.has(a.planet2))
        return false;
    } else if (filterPlanetGroup === 'modern') {
      if (!MODERN_PLANET_SET.has(a.planet1) && !MODERN_PLANET_SET.has(a.planet2)) return false;
    }
    return true;
  });

  const classicalPlanetPositions = CLASSICAL_PLANETS.map(
    (pl) => chart.planets.find((p) => p.planet === pl)!,
  ).filter(Boolean);

  const outerPlanetPositions = OUTER_PLANETS.map(
    (pl) => chart.planets.find((p) => p.planet === pl)!,
  ).filter(Boolean);

  // Render affiliated states for a planet position
  function renderAffiliatedStates(pos: PlanetPosition) {
    const states = getAffiliatedStates(pos, sunPos!, chart.planets);
    const parts: string[] = [];
    if (states.sect) parts.push('得時');
    parts.push(states.oriental);
    if (states.retrograde) parts.push('逆行℞');
    if (states.combust) parts.push(states.combust);
    if (states.besieged) parts.push('被夾擊');
    if (isPeregrine(pos.planet, pos.sign, pos.degree, dayChart)) parts.push('無主');
    return parts.join(' ');
  }

  // Render innate state for a planet
  function renderInnateState(pos: PlanetPosition): string {
    const state = getInnateState(pos.planet, pos.sign);
    if (state) return state;
    // Show score as fallback
    const score = calculateDignityScore(pos.planet, pos.sign, pos.degree, dayChart);
    if (score.total !== 0) return `${score.total > 0 ? '+' : ''}${score.total}`;
    return '-';
  }

  // Render dignity score breakdown for score table
  function renderScoreRow(pos: PlanetPosition) {
    const score = calculateDignityScore(pos.planet, pos.sign, pos.degree, dayChart);
    return (
      <tr key={pos.planet}>
        <td>
          <PlanetGlyph planet={pos.planet} /> {PLANET_INFO[pos.planet].name}
        </td>
        <td className="score-cell score-positive">
          {score.domicile > 0 ? `+${score.domicile}` : ''}
        </td>
        <td className="score-cell score-positive">
          {score.exaltation > 0 ? `+${score.exaltation}` : ''}
        </td>
        <td className="score-cell score-positive">
          {score.triplicity > 0 ? `+${score.triplicity}` : ''}
        </td>
        <td className="score-cell score-positive">{score.term > 0 ? `+${score.term}` : ''}</td>
        <td className="score-cell score-positive">{score.face > 0 ? `+${score.face}` : ''}</td>
        <td className="score-cell score-negative">{score.detriment < 0 ? score.detriment : ''}</td>
        <td className="score-cell score-negative">{score.fall < 0 ? score.fall : ''}</td>
        <td
          className={`score-cell score-total ${score.total > 0 ? 'score-positive' : score.total < 0 ? 'score-negative' : ''}`}
        >
          {score.total > 0 ? `+${score.total}` : score.total}
        </td>
      </tr>
    );
  }

  const matrix = calculateReceptionMatrix(chart);

  const execLabel: Record<string, string> = {
    high: '高',
    medium: '中',
    low: '低',
    blocked: '阻礙',
  };

  const SUB_TABS = [
    { id: 'planets' as const, label: '行星位置' },
    { id: 'dignity' as const, label: '古典力量' },
    { id: 'aspects' as const, label: '相位' },
    { id: 'reception' as const, label: '互融分析' },
  ];

  return (
    <div className="chart-details">
      {/* ---- Chart summary ---- */}
      <div className="chart-summary">
        <table className="summary-table" cellPadding={3} cellSpacing={0}>
          <tbody>
            <tr>
              <td className="summary-label">出生地點</td>
              <td>{chart.birthData.locationName}</td>
              <td className="summary-label">宮位制度</td>
              <td>{HOUSE_SYSTEM_INFO[chart.houseSystem].name}</td>
            </tr>
            <tr>
              <td className="summary-label">上升點 ASC</td>
              <td>
                <SignGlyph sign={Math.floor(chart.ascendant / 30) as ZodiacSign} />{' '}
                {ZODIAC_SIGNS[Math.floor(chart.ascendant / 30) as ZodiacSign].name}{' '}
                {Math.floor(chart.ascendant % 30)}° {Math.floor(((chart.ascendant % 30) % 1) * 60)}'
              </td>
              <td className="summary-label">中天 MC</td>
              <td>
                <SignGlyph sign={Math.floor(chart.midheaven / 30) as ZodiacSign} />{' '}
                {ZODIAC_SIGNS[Math.floor(chart.midheaven / 30) as ZodiacSign].name}{' '}
                {Math.floor(chart.midheaven % 30)}° {Math.floor(((chart.midheaven % 30) % 1) * 60)}'
              </td>
            </tr>
            <tr>
              <td className="summary-label">日夜盤</td>
              <td colSpan={3}>
                {dayChart
                  ? '日間盤（太陽在地平線上，第7-12宮）'
                  : '夜間盤（太陽在地平線下，第1-6宮）'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ---- Sub-tab navigation ---- */}
      <nav className="chart-subtab-bar">
        {SUB_TABS.map((tab) => (
          <button
            key={tab.id}
            className={`chart-subtab-btn${activeTab === tab.id ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* ---- Tab: 行星位置 ---- */}
      {activeTab === 'planets' && (
        <div className="chart-subtab-content">
          {/* Main planet table (classical 7 planets) */}
          <h3 className="section-title">行星位置與尊貴狀態（古典七星）</h3>
          <div className="table-scroll">
            <table className="data-table" cellPadding={3} cellSpacing={0}>
              <thead>
                <tr className="table-header">
                  <th>星體</th>
                  <th>黃經度數</th>
                  <th>落宮</th>
                  <th>守護宮</th>
                  <th>曜升宮</th>
                  <th>先天黃道狀態</th>
                  <th>附屬狀態</th>
                </tr>
              </thead>
              <tbody>
                {classicalPlanetPositions.map((pos, i) => {
                  const domicileRulerHouse = getDomicileRulerHouse(pos.sign, chart.planets);
                  const exaltationRulerHouse = getExaltationRulerHouse(pos.sign, chart.planets);
                  const innate = renderInnateState(pos);
                  return (
                    <tr key={pos.planet} className={i % 2 === 0 ? 'row-even' : 'row-odd'}>
                      <td className="planet-cell">
                        <PlanetGlyph planet={pos.planet} /> {PLANET_INFO[pos.planet].name}
                        {pos.retrograde ? <span className="retrograde-symbol"> ℞</span> : ''}
                      </td>
                      <td className="longitude-cell">{formatLongitude(pos)}</td>
                      <td className="center-cell">{pos.house}</td>
                      <td className="center-cell">{domicileRulerHouse ?? '-'}</td>
                      <td className="center-cell">{exaltationRulerHouse ?? '-'}</td>
                      <td className={`dignity-cell dignity-${innate}`}>{innate}</td>
                      <td className="affiliated-cell">{renderAffiliatedStates(pos)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Outer planets */}
          <h3 className="section-title">現代行星（天王、海王、冥王）</h3>
          <div className="table-scroll">
            <table className="data-table" cellPadding={3} cellSpacing={0}>
              <thead>
                <tr className="table-header">
                  <th>星體</th>
                  <th>黃經度數</th>
                  <th>落宮</th>
                  <th>附屬狀態</th>
                </tr>
              </thead>
              <tbody>
                {outerPlanetPositions.map((pos, i) => (
                  <tr key={pos.planet} className={i % 2 === 0 ? 'row-even' : 'row-odd'}>
                    <td className="planet-cell">
                      <PlanetGlyph planet={pos.planet} /> {PLANET_INFO[pos.planet].name}
                      {pos.retrograde ? <span className="retrograde-symbol"> ℞</span> : ''}
                    </td>
                    <td className="longitude-cell">{formatLongitude(pos)}</td>
                    <td className="center-cell">{pos.house}</td>
                    <td className="affiliated-cell">
                      {pos.retrograde ? '逆行℞' : ''}
                      {getCombustDisplay(pos, sunPos)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* House cusps */}
          <h3 className="section-title">宮位起點（{HOUSE_SYSTEM_INFO[chart.houseSystem].name}）</h3>
          <div className="table-scroll">
            <table className="data-table" cellPadding={3} cellSpacing={0}>
              <thead>
                <tr className="table-header">
                  {chart.houses.map((h) => (
                    <th key={h.house} className="center-cell">
                      {h.house === 1 ? 'ASC' : h.house === 10 ? 'MC' : `第${h.house}宮`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {chart.houses.map((h, i) => (
                    <td
                      key={h.house}
                      className={`center-cell ${i % 2 === 0 ? 'row-even' : 'row-odd'}`}
                    >
                      <SignGlyph sign={h.sign} />
                      <br />
                      {ZODIAC_SIGNS[h.sign].name}
                      <br />
                      {h.degree}°
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---- Tab: 古典力量 ---- */}
      {activeTab === 'dignity' && (
        <div className="chart-subtab-content">
          <h3 className="section-title">尊貴狀態參考表</h3>
          <div className="dignity-tables-grid">
            {/* Domicile */}
            <div className="dignity-table-block">
              <h4 className="dignity-table-title">本垣（廟）</h4>
              <table className="data-table" cellPadding={3} cellSpacing={0}>
                <thead>
                  <tr className="table-header">
                    <th>星體</th>
                    <th>星座</th>
                  </tr>
                </thead>
                <tbody>
                  {CLASSICAL_PLANETS.map((pl, i) => {
                    const signs = DOMICILE[pl] ?? [];
                    return (
                      <tr key={pl} className={i % 2 === 0 ? 'row-even' : 'row-odd'}>
                        <td className="planet-cell">
                          <PlanetGlyph planet={pl} /> {PLANET_INFO[pl].name}
                        </td>
                        <td>
                          {signs.map((s) => (
                            <span key={s}>
                              <SignGlyph sign={s} /> {ZODIAC_SIGNS[s].name}{' '}
                            </span>
                          ))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Exaltation */}
            <div className="dignity-table-block">
              <h4 className="dignity-table-title">曜升（旺）</h4>
              <table className="data-table" cellPadding={3} cellSpacing={0}>
                <thead>
                  <tr className="table-header">
                    <th>星體</th>
                    <th>星座與度數</th>
                  </tr>
                </thead>
                <tbody>
                  {CLASSICAL_PLANETS.map((pl, i) => {
                    const exalt = EXALTATION[pl];
                    return (
                      <tr key={pl} className={i % 2 === 0 ? 'row-even' : 'row-odd'}>
                        <td className="planet-cell">
                          <PlanetGlyph planet={pl} /> {PLANET_INFO[pl].name}
                        </td>
                        <td>
                          {exalt ? (
                            <>
                              <SignGlyph sign={exalt.sign} /> {ZODIAC_SIGNS[exalt.sign].name}{' '}
                              {exalt.degree}°
                            </>
                          ) : (
                            '-'
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Detriment/Fall */}
            <div className="dignity-table-block">
              <h4 className="dignity-table-title">落/陷</h4>
              <table className="data-table" cellPadding={3} cellSpacing={0}>
                <thead>
                  <tr className="table-header">
                    <th>星體</th>
                    <th>落（反廟）</th>
                    <th>陷（反旺）</th>
                  </tr>
                </thead>
                <tbody>
                  {CLASSICAL_PLANETS.map((pl, i) => {
                    const detSigns = DETRIMENT[pl] ?? [];
                    const fallSign = FALL[pl];
                    return (
                      <tr key={pl} className={i % 2 === 0 ? 'row-even' : 'row-odd'}>
                        <td className="planet-cell">
                          <PlanetGlyph planet={pl} /> {PLANET_INFO[pl].name}
                        </td>
                        <td>
                          {detSigns.map((s) => (
                            <span key={s}>
                              <SignGlyph sign={s} /> {ZODIAC_SIGNS[s].name}{' '}
                            </span>
                          ))}
                        </td>
                        <td>
                          {fallSign !== undefined ? (
                            <>
                              <SignGlyph sign={fallSign} /> {ZODIAC_SIGNS[fallSign].name}
                            </>
                          ) : (
                            '-'
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Triplicity */}
            <div className="dignity-table-block">
              <h4 className="dignity-table-title">三分（{dayChart ? '日間盤' : '夜間盤'}）</h4>
              <table className="data-table" cellPadding={3} cellSpacing={0}>
                <thead>
                  <tr className="table-header">
                    <th>元素</th>
                    <th>星座</th>
                    <th>主星</th>
                  </tr>
                </thead>
                <tbody>
                  {(
                    [
                      ['火', [ZodiacSign.Aries, ZodiacSign.Leo, ZodiacSign.Sagittarius]],
                      ['土', [ZodiacSign.Taurus, ZodiacSign.Virgo, ZodiacSign.Capricorn]],
                      ['風', [ZodiacSign.Gemini, ZodiacSign.Libra, ZodiacSign.Aquarius]],
                      ['水', [ZodiacSign.Cancer, ZodiacSign.Scorpio, ZodiacSign.Pisces]],
                    ] as [string, ZodiacSign[]][]
                  ).map(([elem, signs], i) => {
                    const rulers = getTriplicityRulers(signs[0]);
                    const ruler = dayChart ? rulers.day : rulers.night;
                    return (
                      <tr key={elem} className={i % 2 === 0 ? 'row-even' : 'row-odd'}>
                        <td className="center-cell">{elem}</td>
                        <td>
                          {signs.map((s) => (
                            <span key={s}>
                              <SignGlyph sign={s} />{' '}
                            </span>
                          ))}
                        </td>
                        <td className="planet-cell">
                          <PlanetGlyph planet={ruler} /> {PLANET_INFO[ruler].name}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Terms table */}
          <h3 className="section-title">界主星（埃及制）</h3>
          <div className="table-scroll">
            <table className="data-table terms-table" cellPadding={3} cellSpacing={0}>
              <thead>
                <tr className="table-header">
                  <th>星座</th>
                  <th colSpan={5}>界（每宮分為5段）</th>
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    ZodiacSign.Aries,
                    ZodiacSign.Taurus,
                    ZodiacSign.Gemini,
                    ZodiacSign.Cancer,
                    ZodiacSign.Leo,
                    ZodiacSign.Virgo,
                    ZodiacSign.Libra,
                    ZodiacSign.Scorpio,
                    ZodiacSign.Sagittarius,
                    ZodiacSign.Capricorn,
                    ZodiacSign.Aquarius,
                    ZodiacSign.Pisces,
                  ] as ZodiacSign[]
                ).map((sign, si) => {
                  const terms = computeTermsForSign(sign);
                  return (
                    <tr key={sign} className={si % 2 === 0 ? 'row-even' : 'row-odd'}>
                      <td className="sign-label-cell">
                        <SignGlyph sign={sign} /> {ZODIAC_SIGNS[sign].name}
                      </td>
                      {terms.map((t, ti) => (
                        <td key={ti} className="term-cell center-cell">
                          <PlanetGlyph planet={t.planet} /> {t.startDeg}-{t.endDeg - 1}°
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Decans table */}
          <h3 className="section-title">十度主星（面）</h3>
          <div className="table-scroll">
            <table className="data-table" cellPadding={3} cellSpacing={0}>
              <thead>
                <tr className="table-header">
                  <th>星座</th>
                  <th>第一面 (0-9°)</th>
                  <th>第二面 (10-19°)</th>
                  <th>第三面 (20-29°)</th>
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    ZodiacSign.Aries,
                    ZodiacSign.Taurus,
                    ZodiacSign.Gemini,
                    ZodiacSign.Cancer,
                    ZodiacSign.Leo,
                    ZodiacSign.Virgo,
                    ZodiacSign.Libra,
                    ZodiacSign.Scorpio,
                    ZodiacSign.Sagittarius,
                    ZodiacSign.Capricorn,
                    ZodiacSign.Aquarius,
                    ZodiacSign.Pisces,
                  ] as ZodiacSign[]
                ).map((sign, si) => {
                  const d1 = getDecanRuler(sign, 0);
                  const d2 = getDecanRuler(sign, 10);
                  const d3 = getDecanRuler(sign, 20);
                  return (
                    <tr key={sign} className={si % 2 === 0 ? 'row-even' : 'row-odd'}>
                      <td className="sign-label-cell">
                        <SignGlyph sign={sign} /> {ZODIAC_SIGNS[sign].name}
                      </td>
                      <td className="center-cell">
                        <PlanetGlyph planet={d1} /> {PLANET_INFO[d1].name}
                      </td>
                      <td className="center-cell">
                        <PlanetGlyph planet={d2} /> {PLANET_INFO[d2].name}
                      </td>
                      <td className="center-cell">
                        <PlanetGlyph planet={d3} /> {PLANET_INFO[d3].name}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Dignity scores */}
          <h3 className="section-title">尊貴分數（古典七星）</h3>
          <div className="table-scroll">
            <table className="data-table" cellPadding={3} cellSpacing={0}>
              <thead>
                <tr className="table-header">
                  <th>星體</th>
                  <th title="廟 +5">廟</th>
                  <th title="旺 +4">旺</th>
                  <th title="三分 +3">三分</th>
                  <th title="界 +2">界</th>
                  <th title="面 +1">面</th>
                  <th title="落 -5">落</th>
                  <th title="陷 -4">陷</th>
                  <th>合計</th>
                </tr>
              </thead>
              <tbody>{classicalPlanetPositions.map(renderScoreRow)}</tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---- Tab: 相位 ---- */}
      {activeTab === 'aspects' && (
        <div className="chart-subtab-content">
          <h3 className="section-title">相位</h3>

          {/* Filter bar */}
          <div className="aspect-filter-bar">
            <div className="aspect-filter-group">
              <span className="aspect-filter-label">相位類型：</span>
              {(
                [
                  [AspectType.Conjunction, '☌合'],
                  [AspectType.Sextile, '✱六分'],
                  [AspectType.Square, '□四分'],
                  [AspectType.Trine, '△三分'],
                  [AspectType.Opposition, '☍對分'],
                ] as [AspectType, string][]
              ).map(([type, label]) => (
                <label key={type} className="aspect-filter-checkbox">
                  <input
                    type="checkbox"
                    checked={filterAspectTypes.has(type)}
                    onChange={(e) => {
                      const next = new Set(filterAspectTypes);
                      if (e.target.checked) next.add(type);
                      else next.delete(type);
                      setFilterAspectTypes(next);
                    }}
                  />
                  {label}
                </label>
              ))}
            </div>
            <div className="aspect-filter-group">
              <span className="aspect-filter-label">行星分類：</span>
              {(['all', 'classical', 'modern'] as const).map((g) => (
                <label key={g} className="aspect-filter-radio">
                  <input
                    type="radio"
                    name="planet-group"
                    value={g}
                    checked={filterPlanetGroup === g}
                    onChange={() => setFilterPlanetGroup(g)}
                  />
                  {g === 'all'
                    ? '全部'
                    : g === 'classical'
                      ? '七政（古典7星）'
                      : '現代行星（天王海王冥王）'}
                </label>
              ))}
            </div>
            <div className="aspect-filter-group">
              <span className="aspect-filter-label">容許度上限：{filterMaxOrb}°</span>
              <input
                type="range"
                min={0}
                max={12}
                step={0.5}
                value={filterMaxOrb}
                onChange={(e) => setFilterMaxOrb(Number(e.target.value))}
                className="aspect-filter-slider"
              />
            </div>
          </div>

          {filteredAspects.length === 0 ? (
            <p className="no-data">沒有符合條件的相位</p>
          ) : (
            <div className="table-scroll">
              <table className="data-table" cellPadding={3} cellSpacing={0}>
                <thead>
                  <tr className="table-header">
                    <th>星體 1</th>
                    <th>相位</th>
                    <th>星體 2</th>
                    <th>容許度</th>
                    <th>互融執行性</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAspects.map((a, i) => {
                    const p1 = PLANET_INFO[a.planet1];
                    const p2 = PLANET_INFO[a.planet2];
                    const aspectInfo = ASPECT_INFO[a.type];
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
                    return (
                      <tr key={i} className={i % 2 === 0 ? 'row-even' : 'row-odd'}>
                        <td className="planet-cell">
                          <span className="planet-glyph">{p1.glyph}</span> {p1.name}
                        </td>
                        <td className="aspect-cell" style={{ color: aspectInfo.color }}>
                          {aspectInfo.symbol} {aspectInfo.name}
                        </td>
                        <td className="planet-cell">
                          <span className="planet-glyph">{p2.glyph}</span> {p2.name}
                        </td>
                        <td className="center-cell">{a.orb}°</td>
                        <td className={`center-cell executability-${enhancement.executability}`}>
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
      )}

      {/* ---- Tab: 互融分析 ---- */}
      {activeTab === 'reception' && (
        <div className="chart-subtab-content">
          <ReceptionAnalysis chart={chart} />
        </div>
      )}
    </div>
  );
}

// Helper: compute term display data for a sign using actual EGYPTIAN_TERMS boundaries
function computeTermsForSign(sign: ZodiacSign) {
  const result: { planet: Planet; startDeg: number; endDeg: number }[] = [];
  const terms = EGYPTIAN_TERMS[sign];
  let prev = 0;
  for (const term of terms) {
    result.push({ planet: term.planet, startDeg: prev, endDeg: term.endDegree });
    prev = term.endDegree;
  }
  return result;
}

// Helper: get combust display string for outer planets
function getCombustDisplay(pos: PlanetPosition, sunPos: PlanetPosition): string {
  let diff = Math.abs(pos.longitude - sunPos.longitude) % 360;
  if (diff > 180) diff = 360 - diff;
  if (diff <= 8.5) return ' 灼傷';
  if (diff <= 17) return ' 在日光下';
  return '';
}
