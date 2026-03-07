/**
 * SynastryAspectList — filterable, sortable cross-chart aspect table.
 * Shows planet pair, aspect type, orb, nature tag, and Chinese interpretation.
 */

import { useState } from 'react';
import { PLANET_INFO, ASPECT_INFO } from '../types/astro';
import { Planet, AspectType } from '../types/astro';
import type { SynastryAspect } from '../types/synastry';

interface Props {
  aspects: SynastryAspect[];
  nameA: string;
  nameB: string;
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

export function SynastryAspectList({ aspects, nameA, nameB }: Props) {
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

      {/* Aspect table */}
      {sorted.length === 0 ? (
        <p className="no-data">沒有符合篩選條件的相位</p>
      ) : (
        <div className="table-scroll">
          <table className="data-table" cellPadding={4} cellSpacing={0}>
            <thead>
              <tr className="table-header">
                <th>{nameA}（A）</th>
                <th>相位</th>
                <th>{nameB}（B）</th>
                <th>容許度</th>
                <th>性質</th>
                <th>詮釋</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((asp, i) => {
                const pAInfo = PLANET_INFO[asp.planetA];
                const pBInfo = PLANET_INFO[asp.planetB];
                const aspInfo = ASPECT_INFO[asp.type];
                const isOpen = expanded.has(i);

                return (
                  <tr
                    key={i}
                    className={`${i % 2 === 0 ? 'row-even' : 'row-odd'} aspect-row`}
                    onClick={() => toggleExpand(i)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td className="planet-cell">
                      <span className="planet-glyph">{pAInfo.glyph}</span> {pAInfo.name}
                    </td>
                    <td className="aspect-cell" style={{ color: aspInfo.color }}>
                      {aspInfo.symbol} {aspInfo.name}
                    </td>
                    <td className="planet-cell">
                      <span className="planet-glyph">{pBInfo.glyph}</span> {pBInfo.name}
                    </td>
                    <td className="center-cell">{asp.orb.toFixed(2)}°</td>
                    <td className="center-cell" style={{ color: NATURE_COLORS[asp.nature], fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                      {NATURE_LABELS[asp.nature]}
                    </td>
                    <td className="interpretation-cell">
                      {isOpen ? (
                        <span className="interp-text">{asp.interpretation}</span>
                      ) : (
                        <span className="interp-preview">{asp.interpretation.slice(0, 28)}… 展開</span>
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
