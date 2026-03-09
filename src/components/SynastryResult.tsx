/**
 * SynastryResult — top-level result container with 4 sub-tabs:
 *   疊圖 | 合成盤 | 相位分析 | 相容性
 */

import { useState } from 'react';
import { ZODIAC_SIGNS, PLANET_INFO, ASPECT_INFO } from '../types/astro';
import type { ZodiacSign, Planet } from '../types/astro';
import type { SynastryResult, SynastryAspect } from '../types/synastry';
import { SynastryChart } from './SynastryChart';
import { SynastryAspectList } from './SynastryAspectList';
import { CompatibilityPanel } from './CompatibilityPanel';

interface Props {
  result: SynastryResult;
}

type Tab = 'synastry' | 'overview' | 'composite' | 'aspects' | 'score';

const NATURE_COLORS: Record<string, string> = {
  harmonious: '#1a7a1a',
  challenging: '#c0392b',
  neutral: '#8B6914',
};

/** Compact format for a planet position */
function fmtPlanetPos(planet: Planet, result: SynastryResult, side: 'A' | 'B') {
  const chart = side === 'A' ? result.chartA : result.chartB;
  const pos = chart.planets.find((p) => p.planet === planet);
  if (!pos) return { sign: '-', deg: '', house: '-' };
  const si = ZODIAC_SIGNS[pos.sign];
  return {
    sign: `${si.glyph} ${si.name}`,
    deg: `${pos.degree}°${String(pos.minute).padStart(2, '0')}'${pos.retrograde ? ' ℞' : ''}`,
    house: `第 ${pos.house} 宮`,
  };
}

/** Grouped overview: each A planet → its cross-aspects to B planets (with full sign/house) */
function OverviewTable({ result }: { result: SynastryResult }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (key: string) => {
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(key)) {
        n.delete(key);
      } else {
        n.add(key);
      }
      return n;
    });
  };

  // Group aspects by A planet
  const byPlanetA = new Map<Planet, SynastryAspect[]>();
  for (const asp of result.aspects) {
    if (!byPlanetA.has(asp.planetA)) byPlanetA.set(asp.planetA, []);
    byPlanetA.get(asp.planetA)!.push(asp);
  }

  // All A planets in order, include those with no aspects
  const allAPlanets = result.chartA.planets.map((p) => p.planet);

  return (
    <div className="synastry-overview">
      <p className="composite-note">
        以下表格整合兩人的行星位置（星座、宮位）與彼此間的跨盤相位，點擊相位列可展開詮釋。
      </p>
      <div className="table-scroll">
        <table className="data-table" cellPadding={4} cellSpacing={0}>
          <thead>
            <tr className="table-header">
              <th colSpan={3} style={{ borderRight: '2px solid #bbb', background: '#d0e4f7' }}>
                {result.nameA}（A）
              </th>
              <th colSpan={2} style={{ borderRight: '2px solid #bbb' }}>相位</th>
              <th colSpan={3} style={{ borderRight: '2px solid #bbb', background: '#fde8e8' }}>
                {result.nameB}（B）
              </th>
              <th>詮釋</th>
            </tr>
            <tr className="table-header" style={{ fontSize: '11px', fontWeight: 'normal' }}>
              <th style={{ background: '#d0e4f7' }}>行星</th>
              <th style={{ background: '#d0e4f7' }}>星座</th>
              <th style={{ background: '#d0e4f7', borderRight: '2px solid #bbb' }}>宮位</th>
              <th>相位</th>
              <th style={{ borderRight: '2px solid #bbb' }}>容許度</th>
              <th style={{ background: '#fde8e8' }}>行星</th>
              <th style={{ background: '#fde8e8' }}>星座</th>
              <th style={{ background: '#fde8e8', borderRight: '2px solid #bbb' }}>宮位</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {allAPlanets.map((planetA) => {
              const asps = byPlanetA.get(planetA) ?? [];
              const fA = fmtPlanetPos(planetA, result, 'A');
              const pAInfo = PLANET_INFO[planetA];

              if (asps.length === 0) {
                // Planet with no cross-aspects: show one row with dash
                return (
                  <tr key={planetA} className="row-even" style={{ opacity: 0.6 }}>
                    <td className="planet-cell" style={{ color: '#1a5ca8' }}>
                      <span className="planet-glyph">{pAInfo.glyph}</span> {pAInfo.name}
                    </td>
                    <td className="center-cell" style={{ color: '#1a5ca8' }}>{fA.sign}</td>
                    <td className="center-cell" style={{ color: '#1a5ca8', fontWeight: 'bold', borderRight: '2px solid #ddd' }}>
                      {fA.house}
                    </td>
                    <td className="center-cell" colSpan={6} style={{ color: '#999', fontStyle: 'italic' }}>
                      — 無顯著相位 —
                    </td>
                  </tr>
                );
              }

              return asps.map((asp, ai) => {
                const pBInfo = PLANET_INFO[asp.planetB];
                const fB = fmtPlanetPos(asp.planetB, result, 'B');
                const aspInfo = ASPECT_INFO[asp.type];
                const key = `${planetA}-${ai}`;
                const isOpen = expanded.has(key);

                return (
                  <tr
                    key={key}
                    className={ai % 2 === 0 ? 'row-even' : 'row-odd'}
                    onClick={() => toggle(key)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* A planet — only shown on first aspect row */}
                    {ai === 0 ? (
                      <>
                        <td className="planet-cell" style={{ color: '#1a5ca8' }} rowSpan={asps.length}>
                          <span className="planet-glyph">{pAInfo.glyph}</span> {pAInfo.name}
                        </td>
                        <td className="center-cell" style={{ color: '#1a5ca8', whiteSpace: 'nowrap' }} rowSpan={asps.length}>
                          <div>{fA.sign}</div>
                          <div style={{ fontSize: '11px' }}>{fA.deg}</div>
                        </td>
                        <td className="center-cell" style={{ color: '#1a5ca8', fontWeight: 'bold', borderRight: '2px solid #ddd' }} rowSpan={asps.length}>
                          {fA.house}
                        </td>
                      </>
                    ) : null}
                    {/* Aspect */}
                    <td className="aspect-cell" style={{ color: aspInfo.color, textAlign: 'center', whiteSpace: 'nowrap' }}>
                      {aspInfo.symbol} {aspInfo.name}
                    </td>
                    <td className="center-cell" style={{ borderRight: '2px solid #ddd', fontSize: '12px' }}>
                      {asp.orb.toFixed(2)}°
                    </td>
                    {/* B planet */}
                    <td className="planet-cell" style={{ color: '#c0392b' }}>
                      <span className="planet-glyph">{pBInfo.glyph}</span> {pBInfo.name}
                    </td>
                    <td className="center-cell" style={{ color: '#c0392b', whiteSpace: 'nowrap' }}>
                      <div>{fB.sign}</div>
                      <div style={{ fontSize: '11px' }}>{fB.deg}</div>
                    </td>
                    <td className="center-cell" style={{ color: '#c0392b', fontWeight: 'bold', borderRight: '2px solid #ddd' }}>
                      {fB.house}
                    </td>
                    {/* Nature + interpretation */}
                    <td className="interpretation-cell">
                      <span style={{ color: NATURE_COLORS[asp.nature], fontWeight: 'bold', fontSize: '11px', marginRight: '4px' }}>
                        {asp.nature === 'harmonious' ? '✦ 和諧' : asp.nature === 'challenging' ? '✧ 挑戰' : '◆ 中性'}
                      </span>
                      {isOpen ? (
                        <span className="interp-text">{asp.interpretation}</span>
                      ) : (
                        <span className="interp-preview">{asp.interpretation.slice(0, 22)}… ▼</span>
                      )}
                    </td>
                  </tr>
                );
              });
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CompositeTable({ result }: { result: SynastryResult }) {
  const ascSign = Math.floor(result.compositeAscendant / 30) as ZodiacSign;
  const ascDeg = Math.floor(result.compositeAscendant % 30);
  const ascMin = Math.floor(((result.compositeAscendant % 30) - ascDeg) * 60);
  const mcSign = Math.floor(result.compositeMidheaven / 30) as ZodiacSign;
  const mcDeg = Math.floor(result.compositeMidheaven % 30);
  const mcMin = Math.floor(((result.compositeMidheaven % 30) - mcDeg) * 60);

  return (
    <div className="composite-section">
      <div className="composite-header">
        <span className="composite-badge">合成星盤</span>
        {result.nameA} ✦ {result.nameB}
      </div>
      <p className="composite-note">
        合成星盤取兩人各行星黃道位置的中點，呈現兩人關係本身的能量特質。
      </p>

      <div className="composite-angles">
        <span>
          <strong>合成上升點（ASC）</strong>：{ZODIAC_SIGNS[ascSign].glyph} {ZODIAC_SIGNS[ascSign].name}{' '}
          {ascDeg}° {String(ascMin).padStart(2, '0')}'
        </span>
        <span>
          <strong>合成中天（MC）</strong>：{ZODIAC_SIGNS[mcSign].glyph} {ZODIAC_SIGNS[mcSign].name}{' '}
          {mcDeg}° {String(mcMin).padStart(2, '0')}'
        </span>
      </div>

      <div className="table-scroll">
        <table className="data-table" cellPadding={4} cellSpacing={0}>
          <thead>
            <tr className="table-header">
              <th>行星</th>
              <th>合成位置</th>
              <th>星座</th>
              <th>度數</th>
            </tr>
          </thead>
          <tbody>
            {result.compositePlanets.map((cp, i) => {
              const pInfo = PLANET_INFO[cp.planet];
              const sInfo = ZODIAC_SIGNS[cp.sign];
              return (
                <tr key={cp.planet} className={i % 2 === 0 ? 'row-even' : 'row-odd'}>
                  <td className="planet-cell">
                    <span className="planet-glyph">{pInfo.glyph}</span> {pInfo.name}
                  </td>
                  <td className="longitude-cell">
                    {sInfo.glyph} {cp.degree}° {String(cp.minute).padStart(2, '0')}'
                  </td>
                  <td>{sInfo.name}</td>
                  <td className="center-cell">{cp.longitude.toFixed(2)}°</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Composite planet pair comparison */}
      <h4 className="section-title" style={{ marginTop: '16px' }}>兩人行星位置對照</h4>
      <div className="table-scroll">
        <table className="data-table" cellPadding={4} cellSpacing={0}>
          <thead>
            <tr className="table-header">
              <th>行星</th>
              <th>{result.nameA}（A）</th>
              <th>合成中點</th>
              <th>{result.nameB}（B）</th>
            </tr>
          </thead>
          <tbody>
            {result.compositePlanets.map((cp, i) => {
              const pa = result.chartA.planets.find((p) => p.planet === cp.planet);
              const pb = result.chartB.planets.find((p) => p.planet === cp.planet);
              const pInfo = PLANET_INFO[cp.planet];
              const sInfo = ZODIAC_SIGNS[cp.sign];

              const fmtPos = (pos: typeof pa) => {
                if (!pos) return '-';
                const si = ZODIAC_SIGNS[pos.sign];
                return `${si.glyph} ${pos.degree}°${String(pos.minute).padStart(2,'0')}'`;
              };

              return (
                <tr key={cp.planet} className={i % 2 === 0 ? 'row-even' : 'row-odd'}>
                  <td className="planet-cell">
                    <span className="planet-glyph">{pInfo.glyph}</span> {pInfo.name}
                  </td>
                  <td className="center-cell" style={{ color: '#1a5ca8' }}>{fmtPos(pa)}</td>
                  <td className="center-cell" style={{ fontWeight: 'bold' }}>
                    {sInfo.glyph} {cp.degree}°{String(cp.minute).padStart(2,'0')}'
                  </td>
                  <td className="center-cell" style={{ color: '#c0392b' }}>{fmtPos(pb)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Composite house cusps */}
      <h4 className="section-title" style={{ marginTop: '16px' }}>合成宮位</h4>
      <div className="table-scroll">
        <table className="data-table" cellPadding={4} cellSpacing={0}>
          <thead>
            <tr className="table-header">
              <th>宮位</th>
              <th>{result.nameA}（A）</th>
              <th>合成中點</th>
              <th>{result.nameB}（B）</th>
            </tr>
          </thead>
          <tbody>
            {result.compositeHouses.map((ch, i) => {
              const ha = result.chartA.houses.find((h) => h.house === ch.house);
              const hb = result.chartB.houses.find((h) => h.house === ch.house);
              const csInfo = ZODIAC_SIGNS[ch.sign];

              const fmtHouse = (h: typeof ha) => {
                if (!h) return '-';
                const si = ZODIAC_SIGNS[h.sign];
                return `${si.glyph} ${h.degree}°${String(Math.floor(((h.longitude % 30) - h.degree) * 60)).padStart(2,'0')}'`;
              };

              return (
                <tr key={ch.house} className={i % 2 === 0 ? 'row-even' : 'row-odd'}>
                  <td className="center-cell"><strong>第 {ch.house} 宮</strong></td>
                  <td className="center-cell" style={{ color: '#1a5ca8' }}>{fmtHouse(ha)}</td>
                  <td className="center-cell" style={{ fontWeight: 'bold' }}>
                    {csInfo.glyph} {ch.degree}°{String(ch.minute).padStart(2,'0')}'
                  </td>
                  <td className="center-cell" style={{ color: '#c0392b' }}>{fmtHouse(hb)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function SynastryResult({ result }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const tabs: Array<{ key: Tab; label: string }> = [
    { key: 'overview', label: `星盤對照（${result.aspects.length}）` },
    { key: 'synastry', label: '疊圖' },
    { key: 'composite', label: '合成盤' },
    { key: 'aspects', label: '相位篩選' },
    { key: 'score', label: '相容性評分' },
  ];

  return (
    <div className="synastry-result">
      <div className="synastry-result-header">
        <h3 className="section-heading">
          合盤分析：
          <span className="name-a">{result.nameA}</span>
          {' '}✦{' '}
          <span className="name-b">{result.nameB}</span>
        </h3>
        <div className="synastry-overall-badge" style={{
          backgroundColor: result.score.overall >= 68 ? '#d4edda' : result.score.overall >= 50 ? '#fff3cd' : '#f8d7da',
          color: result.score.overall >= 68 ? '#1a7a1a' : result.score.overall >= 50 ? '#856404' : '#c0392b',
        }}>
          整體相容 {result.score.overall} 分 · {result.score.overallLabel}
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="transit-mode-nav">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`transit-mode-btn ${activeTab === t.key ? 'active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="synastry-tab-content">
        {activeTab === 'overview' && (
          <OverviewTable result={result} />
        )}

        {activeTab === 'synastry' && (
          <SynastryChart
            nameA={result.nameA}
            nameB={result.nameB}
            chartA={result.chartA}
            chartB={result.chartB}
            aspects={result.aspects}
            size={500}
          />
        )}

        {activeTab === 'composite' && (
          <CompositeTable result={result} />
        )}

        {activeTab === 'aspects' && (
          <SynastryAspectList
            aspects={result.aspects}
            nameA={result.nameA}
            nameB={result.nameB}
            chartA={result.chartA}
            chartB={result.chartB}
          />
        )}

        {activeTab === 'score' && (
          <CompatibilityPanel
            score={result.score}
            nameA={result.nameA}
            nameB={result.nameB}
          />
        )}
      </div>
    </div>
  );
}
