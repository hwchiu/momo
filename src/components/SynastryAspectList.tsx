/**
 * SynastryAspectList — filterable, sortable cross-chart aspect table.
 * Shows planet, sign, house, aspect type, orb, nature, and interpretation in one unified table.
 */

import { useState } from 'react';
import { PLANET_INFO, ASPECT_INFO, ZODIAC_SIGNS } from '../types/astro';
import { Planet, AspectType } from '../types/astro';
import type { NatalChart } from '../types/astro';
import type { SynastryAspect } from '../types/synastry';

interface Props {
  aspects: SynastryAspect[];
  nameA: string;
  nameB: string;
  chartA: NatalChart;
  chartB: NatalChart;
}

const PLANET_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'all', label: '全部行星' },
  ...Object.values(Planet).map((p) => ({ value: p, label: `${PLANET_INFO[p].glyph} ${PLANET_INFO[p].name}` })),
];

const NATURE_OPTIONS = [
  { value: 'all', label: '全部性質' },
  { value: 'harmonious', label: '✦ 和諧' },
  { value: 'challenging', label: '✧ 挑戰' },
  { value: 'neutral', label: '◆ 中性' },
];

const ASPECT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'all', label: '全部相位' },
  { value: String(AspectType.Conjunction), label: `${ASPECT_INFO[AspectType.Conjunction].symbol} 合相` },
  { value: String(AspectType.Trine), label: `${ASPECT_INFO[AspectType.Trine].symbol} 三分相` },
  { value: String(AspectType.Sextile), label: `${ASPECT_INFO[AspectType.Sextile].symbol} 六分相` },
  { value: String(AspectType.Square), label: `${ASPECT_INFO[AspectType.Square].symbol} 四分相` },
  { value: String(AspectType.Opposition), label: `${ASPECT_INFO[AspectType.Opposition].symbol} 對分相` },
];

type SortKey = 'orb' | 'planet' | 'aspect';

const NATURE_LABELS: Record<string, string> = {
  harmonious: '✦ 和諧',
  challenging: '✧ 挑戰',
  neutral: '◆ 中性',
};

const NATURE_COLORS: Record<string, string> = {
  harmonious: '#1a7a1a',
  challenging: '#c0392b',
  neutral: '#8B6914',
};

export function SynastryAspectList({ aspects, nameA, nameB, chartA, chartB }: Props) {
  const [filterPlanet, setFilterPlanet] = useState('all');
  const [filterNature, setFilterNature] = useState('all');
  const [filterAspect, setFilterAspect] = useState('all');
  const [sortBy, setSortBy] = useState<SortKey>('orb');
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const toggleExpand = (i: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });

  const filtered = aspects.filter((asp) => {
    if (filterPlanet !== 'all' && asp.planetA !== filterPlanet && asp.planetB !== filterPlanet) return false;
    if (filterNature !== 'all' && asp.nature !== filterNature) return false;
    if (filterAspect !== 'all' && String(asp.type) !== filterAspect) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'orb') return a.orb - b.orb;
    if (sortBy === 'aspect') return a.type - b.type;
    return a.planetA.localeCompare(b.planetA);
  });

  return (
    <div className="synastry-aspect-list">
      {/* Filter bar */}
      <div className="aspect-filters">
        <select className="form-select" value={filterPlanet} onChange={(e) => setFilterPlanet(e.target.value)}>
          {PLANET_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select className="form-select" value={filterNature} onChange={(e) => setFilterNature(e.target.value)}>
          {NATURE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select className="form-select" value={filterAspect} onChange={(e) => setFilterAspect(e.target.value)}>
          {ASPECT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <span className="aspect-sort-label">排序：</span>
        {(['orb', 'aspect', 'planet'] as SortKey[]).map((k) => (
          <button
            key={k}
            className={`aspect-sort-btn ${sortBy === k ? 'active' : ''}`}
            onClick={() => setSortBy(k)}
          >
            {k === 'orb' ? '容許度' : k === 'aspect' ? '相位類型' : '行星'}
          </button>
        ))}
        <span className="aspect-count">共 {sorted.length} 個相位</span>
      </div>

      {/* Unified planet + sign + house + aspect table */}
      {sorted.length === 0 ? (
        <p className="no-data">沒有符合篩選條件的相位</p>
      ) : (
        <div className="table-scroll">
          <table className="data-table" cellPadding={4} cellSpacing={0}>
            <thead>
              <tr className="table-header">
                <th colSpan={3} className="col-divider">{nameA}（A）</th>
                <th colSpan={2} className="col-divider">相位</th>
                <th colSpan={3} className="col-divider">{nameB}（B）</th>
                <th>性質 / 詮釋</th>
              </tr>
              <tr className="table-header table-sub-header">
                <th>行星</th>
                <th>星座 · 度數</th>
                <th className="col-divider">宮位</th>
                <th>相位</th>
                <th className="col-divider">容許度</th>
                <th>行星</th>
                <th>星座 · 度數</th>
                <th className="col-divider">宮位</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((asp, i) => {
                const pAInfo = PLANET_INFO[asp.planetA];
                const pBInfo = PLANET_INFO[asp.planetB];
                const aspInfo = ASPECT_INFO[asp.type];
                const isOpen = expanded.has(i);

                const posA = chartA.planets.find((p) => p.planet === asp.planetA);
                const posB = chartB.planets.find((p) => p.planet === asp.planetB);

                const fmtPos = (pos: typeof posA) => {
                  if (!pos) return { sign: '-', deg: '-', house: '-' };
                  const si = ZODIAC_SIGNS[pos.sign];
                  return {
                    sign: `${si.glyph} ${si.name}`,
                    deg: `${pos.degree}° ${String(pos.minute).padStart(2, '0')}'${pos.retrograde ? ' ℞' : ''}`,
                    house: `第 ${pos.house} 宮`,
                  };
                };

                const fA = fmtPos(posA);
                const fB = fmtPos(posB);

                return (
                  <tr
                    key={i}
                    className={`${i % 2 === 0 ? 'row-even' : 'row-odd'} aspect-row row-clickable`}
                    onClick={() => toggleExpand(i)}
                  >
                    {/* A: planet */}
                    <td className="planet-cell person-a-cell">
                      <span className="planet-glyph">{pAInfo.glyph}</span> {pAInfo.name}
                    </td>
                    {/* A: sign + degree */}
                    <td className="center-cell person-a-cell" style={{ whiteSpace: 'nowrap' }}>
                      <div>{fA.sign}</div>
                      <div className="cell-deg">{fA.deg}</div>
                    </td>
                    {/* A: house */}
                    <td className="center-cell person-a-cell col-divider-light" style={{ fontWeight: 'bold' }}>
                      {fA.house}
                    </td>
                    {/* aspect — color is dynamic, must stay inline */}
                    <td className="aspect-cell" style={{ color: aspInfo.color, textAlign: 'center', whiteSpace: 'nowrap' }}>
                      {aspInfo.symbol} {aspInfo.name}
                    </td>
                    {/* orb */}
                    <td className="center-cell col-divider-light cell-deg">
                      {asp.orb.toFixed(2)}°
                    </td>
                    {/* B: planet */}
                    <td className="planet-cell person-b-cell">
                      <span className="planet-glyph">{pBInfo.glyph}</span> {pBInfo.name}
                    </td>
                    {/* B: sign + degree */}
                    <td className="center-cell person-b-cell" style={{ whiteSpace: 'nowrap' }}>
                      <div>{fB.sign}</div>
                      <div className="cell-deg">{fB.deg}</div>
                    </td>
                    {/* B: house */}
                    <td className="center-cell person-b-cell col-divider-light" style={{ fontWeight: 'bold' }}>
                      {fB.house}
                    </td>
                    {/* nature + interpretation — NATURE_COLORS is dynamic */}
                    <td className="interpretation-cell">
                      <span className="cell-deg" style={{ color: NATURE_COLORS[asp.nature], fontWeight: 'bold', marginRight: '4px' }}>
                        {NATURE_LABELS[asp.nature]}
                      </span>
                      {isOpen ? (
                        <span className="interp-text">{asp.interpretation}</span>
                      ) : (
                        <span className="interp-preview">{asp.interpretation.slice(0, 24)}… ▼</span>
                      )}
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
