/**
 * SynastryResult — top-level result container with 4 sub-tabs:
 *   疊圖 | 合成盤 | 相位分析 | 相容性
 */

import { useState } from 'react';
import { ZODIAC_SIGNS, PLANET_INFO } from '../types/astro';
import type { ZodiacSign } from '../types/astro';
import type { SynastryResult } from '../types/synastry';
import { SynastryChart } from './SynastryChart';
import { SynastryAspectList } from './SynastryAspectList';
import { CompatibilityPanel } from './CompatibilityPanel';

interface Props {
  result: SynastryResult;
}

type Tab = 'synastry' | 'composite' | 'aspects' | 'score';

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
    </div>
  );
}

export function SynastryResult({ result }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('synastry');

  const tabs: Array<{ key: Tab; label: string }> = [
    { key: 'synastry', label: '疊圖' },
    { key: 'composite', label: '合成盤' },
    { key: 'aspects', label: `相位分析（${result.aspects.length}）` },
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
