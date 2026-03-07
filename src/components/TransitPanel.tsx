/**
 * TransitPanel — 推運分析面板
 *
 * Four predictive techniques shown in sub-tabs:
 *   過境 (Transits) | 二次推運 (Secondary Progressions) |
 *   太陽弧 (Solar Arc) | 流年法 (Annual Profections)
 */

import { useState, useEffect, useCallback } from 'react';
import type { NatalChart } from '../types/astro';
import { Planet, ZodiacSign, ASPECT_INFO, PLANET_INFO, ZODIAC_SIGNS } from '../types/astro';
import type {
  TransitChart,
  ProgressedChart,
  SolarArcChart,
  ProfectionResult,
  FirdariaResult,
  FirdariaLord,
  TransitAspect,
  TransitPlanetRow,
} from '../lib/transits';
import {
  getTransitChart,
  getProgressedChart,
  getSolarArcChart,
  getProfection,
  getFirdaria,
  formatLon,
} from '../lib/transits';

interface TransitPanelProps {
  natalChart: NatalChart;
}

type Mode = 'transits' | 'progressions' | 'solar_arc' | 'profection' | 'firdaria';

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCMonth(d.getUTCMonth() + months);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function addYears(dateStr: string, years: number): string {
  return addMonths(dateStr, years * 12);
}

// ---- Planet row display ----

function PlanetPositionTable({
  planets,
  label,
}: {
  planets: TransitPlanetRow[];
  label: string;
}) {
  return (
    <div className="transit-pos-section">
      <div className="transit-pos-label">{label}</div>
      <div className="table-scroll">
        <table className="data-table transit-small-table">
          <thead>
            <tr className="table-header">
              <th>星體</th>
              <th>位置</th>
              <th>逆行</th>
            </tr>
          </thead>
          <tbody>
            {planets.map((p, i) => (
              <tr key={p.planet} className={i % 2 === 0 ? 'row-even' : 'row-odd'}>
                <td className="planet-cell" style={{ whiteSpace: 'nowrap' }}>
                  <span className="planet-glyph">{PLANET_INFO[p.planet].glyph}</span>
                  {PLANET_INFO[p.planet].name}
                </td>
                <td className="longitude-cell">{formatLon(p.longitude)}</td>
                <td className="center-cell">
                  {p.retrograde ? <span className="retrograde-symbol">℞</span> : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---- Aspect table ----

function AspectTable({
  aspects,
  transitLabel,
  highlight,
}: {
  aspects: TransitAspect[];
  transitLabel: string;
  highlight?: number; // highlight aspects with orb <= this value
}) {
  if (aspects.length === 0) {
    return <p className="no-data">2° 範圍內無顯著相位</p>;
  }

  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr className="table-header">
            <th>{transitLabel}</th>
            <th>相位</th>
            <th>本命星體</th>
            <th>容許度</th>
            <th>狀態</th>
          </tr>
        </thead>
        <tbody>
          {aspects.map((a, i) => {
            const aspectInfo = ASPECT_INFO[a.type];
            const isExact = highlight !== undefined && a.orb <= highlight;
            return (
              <tr
                key={i}
                className={`${i % 2 === 0 ? 'row-even' : 'row-odd'}${isExact ? ' transit-exact-row' : ''}`}
              >
                <td className="planet-cell" style={{ whiteSpace: 'nowrap' }}>
                  <span className="planet-glyph">{PLANET_INFO[a.transitPlanet].glyph}</span>
                  {PLANET_INFO[a.transitPlanet].name}
                </td>
                <td
                  className="aspect-cell"
                  style={{ color: aspectInfo.color }}
                >
                  {aspectInfo.symbol} {aspectInfo.name}
                </td>
                <td className="planet-cell" style={{ whiteSpace: 'nowrap' }}>
                  <span className="planet-glyph">{PLANET_INFO[a.natalPlanet].glyph}</span>
                  {PLANET_INFO[a.natalPlanet].name}
                </td>
                <td className="center-cell">
                  <span className={a.orb <= 0.5 ? 'transit-tight-orb' : ''}>{a.orb}°</span>
                </td>
                <td className="center-cell">
                  {a.applying ? (
                    <span className="transit-applying">▶ 應用中</span>
                  ) : (
                    <span className="transit-separating">◀ 分離中</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---- Tight aspects highlight banner ----

function TightAspectsBanner({ aspects }: { aspects: TransitAspect[] }) {
  const tight = aspects.filter((a) => a.orb <= 0.5);
  if (tight.length === 0) return null;
  return (
    <div className="transit-tight-banner">
      <strong>★ 精確相位（0.5° 以內）：</strong>{' '}
      {tight.map((a, i) => (
        <span key={i} className="transit-tight-item">
          {PLANET_INFO[a.transitPlanet].name}{' '}
          <span style={{ color: ASPECT_INFO[a.type].color }}>{ASPECT_INFO[a.type].symbol}</span>{' '}
          本命{PLANET_INFO[a.natalPlanet].name} [{a.orb}°]
          {i < tight.length - 1 ? '，' : ''}
        </span>
      ))}
    </div>
  );
}

// ---- Age calculation helper ----

function calcAge(natalChart: NatalChart, date: Date): string {
  const birth = new Date(
    Date.UTC(
      natalChart.birthData.year,
      natalChart.birthData.month - 1,
      natalChart.birthData.day,
    ),
  );
  const ms = date.getTime() - birth.getTime();
  if (ms < 0) return '出生前';
  const years = Math.floor(ms / (365.25 * 86400000));
  const remainMs = ms - years * 365.25 * 86400000;
  const months = Math.floor(remainMs / (30.44 * 86400000));
  return `${years} 歲 ${months} 個月`;
}

// ---- Main component ----

export function TransitPanel({ natalChart }: TransitPanelProps) {
  const [mode, setMode] = useState<Mode>('transits');
  const [dateStr, setDateStr] = useState(todayStr);
  const [transitResult, setTransitResult] = useState<TransitChart | null>(null);
  const [progressedResult, setProgressedResult] = useState<ProgressedChart | null>(null);
  const [solarArcResult, setSolarArcResult] = useState<SolarArcChart | null>(null);
  const [profectionResult, setProfectionResult] = useState<ProfectionResult | null>(null);
  const [firdariaResult, setFirdariaResult] = useState<FirdariaResult | null>(null);

  const targetDate = new Date(dateStr + 'T12:00:00Z');

  const recalculate = useCallback(() => {
    const d = new Date(dateStr + 'T12:00:00Z');
    setTimeout(() => {
      setTransitResult(getTransitChart(natalChart, d));
      setProgressedResult(getProgressedChart(natalChart, d));
      setSolarArcResult(getSolarArcChart(natalChart, d));
      setProfectionResult(getProfection(natalChart, d));
      setFirdariaResult(getFirdaria(natalChart, d));
    }, 10);
  }, [natalChart, dateStr]);

  useEffect(() => {
    recalculate();
  }, [recalculate]);

  const age = calcAge(natalChart, targetDate);

  const TAB_LABELS: Record<Mode, string> = {
    transits: '過境',
    progressions: '二次推運',
    solar_arc: '太陽弧',
    profection: '流年法',
    firdaria: '法達',
  };

  return (
    <div className="transit-panel">
      <h3 className="section-heading">推運分析</h3>

      {/* Date picker + quick navigation */}
      <div className="transit-date-bar">
        <label className="transit-date-label">推運日期：</label>
        <input
          type="date"
          value={dateStr}
          onChange={(e) => setDateStr(e.target.value)}
          className="form-input"
          style={{ marginRight: '8px' }}
        />
        <span className="transit-age-badge">{age}</span>
        <div className="transit-quick-btns">
          <button className="transit-quick-btn" onClick={() => setDateStr(todayStr())}>今日</button>
          <button className="transit-quick-btn" onClick={() => setDateStr(addMonths(dateStr, -1))}>−1月</button>
          <button className="transit-quick-btn" onClick={() => setDateStr(addMonths(dateStr, 1))}>+1月</button>
          <button className="transit-quick-btn" onClick={() => setDateStr(addMonths(dateStr, 3))}>+3月</button>
          <button className="transit-quick-btn" onClick={() => setDateStr(addMonths(dateStr, 6))}>+6月</button>
          <button className="transit-quick-btn" onClick={() => setDateStr(addYears(dateStr, 1))}>+1年</button>
          <button className="transit-quick-btn" onClick={() => setDateStr(addYears(dateStr, -1))}>−1年</button>
        </div>
      </div>

      {/* Mode tabs */}
      <div className="transit-mode-nav">
        {(Object.keys(TAB_LABELS) as Mode[]).map((m) => (
          <button
            key={m}
            className={`transit-mode-btn${mode === m ? ' active' : ''}`}
            onClick={() => setMode(m)}
          >
            {TAB_LABELS[m]}
          </button>
        ))}
      </div>

      {/* ---- Transits tab ---- */}
      {mode === 'transits' && transitResult && (
        <div className="transit-content">
          <TightAspectsBanner aspects={transitResult.aspects} />
          <div className="transit-two-col">
            <PlanetPositionTable planets={transitResult.planets} label="過境行星位置" />
            <div className="transit-aspects-col">
              <div className="transit-pos-label">過境→本命 相位（容許 2°）</div>
              <AspectTable aspects={transitResult.aspects} transitLabel="過境星體" highlight={0.5} />
            </div>
          </div>
        </div>
      )}

      {/* ---- Secondary Progressions tab ---- */}
      {mode === 'progressions' && progressedResult && (
        <div className="transit-content">
          <div className="transit-info-bar">
            推運年齡 {progressedResult.progressedAge.toFixed(2)} 年 &nbsp;|&nbsp;
            推運 ASC：{formatLon(progressedResult.progressedAsc)} &nbsp;|&nbsp;
            推運 MC：{formatLon(progressedResult.progressedMC)}
          </div>
          <TightAspectsBanner aspects={progressedResult.aspects} />
          <div className="transit-two-col">
            <PlanetPositionTable planets={progressedResult.planets} label="推運行星位置" />
            <div className="transit-aspects-col">
              <div className="transit-pos-label">推運→本命 相位（容許 2°）</div>
              <AspectTable aspects={progressedResult.aspects} transitLabel="推運星體" highlight={0.5} />
            </div>
          </div>
        </div>
      )}

      {/* ---- Solar Arc tab ---- */}
      {mode === 'solar_arc' && solarArcResult && (
        <div className="transit-content">
          <div className="transit-info-bar">
            太陽弧：{solarArcResult.solarArc.toFixed(3)}°（約 {solarArcResult.solarArc.toFixed(0)} 年）
          </div>
          <TightAspectsBanner aspects={solarArcResult.aspects} />
          <div className="transit-two-col">
            <PlanetPositionTable planets={solarArcResult.planets} label="太陽弧指向位置" />
            <div className="transit-aspects-col">
              <div className="transit-pos-label">太陽弧→本命 相位（容許 1°）</div>
              <AspectTable aspects={solarArcResult.aspects} transitLabel="SA 星體" highlight={0.3} />
            </div>
          </div>
        </div>
      )}

      {/* ---- Annual Profections tab ---- */}
      {mode === 'profection' && profectionResult && (
        <div className="transit-content">
          <ProfectionDisplay result={profectionResult} natalChart={natalChart} dateStr={dateStr} />
        </div>
      )}

      {/* ---- Firdaria tab ---- */}
      {mode === 'firdaria' && firdariaResult && (
        <div className="transit-content">
          <FirdariaDisplay result={firdariaResult} targetDate={targetDate} />
        </div>
      )}
    </div>
  );
}

// ---- Firdaria Display ----

function fmtDate(d: Date): string {
  return `${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${String(d.getUTCDate()).padStart(2, '0')}`;
}

function fmtFirdariaLord(lord: FirdariaLord): { glyph: string; name: string } {
  if (lord === 'NorthNode') return { glyph: '☊', name: '北交點' };
  if (lord === 'SouthNode') return { glyph: '☋', name: '南交點' };
  return { glyph: PLANET_INFO[lord].glyph, name: PLANET_INFO[lord].name };
}

function FirdariaDisplay({
  result,
  targetDate,
}: {
  result: FirdariaResult;
  targetDate: Date;
}) {
  const { isDay, allPeriods, currentPeriod, currentSubPeriod } = result;
  const mainInfo = fmtFirdariaLord(currentPeriod.lord);
  const subInfo = fmtFirdariaLord(currentSubPeriod.lord);

  // Sub-period progress within the main period
  const subProgress = Math.min(100, Math.round(
    ((targetDate.getTime() - currentSubPeriod.startDate.getTime()) /
     (currentSubPeriod.endDate.getTime() - currentSubPeriod.startDate.getTime())) * 100,
  ));

  return (
    <div>
      {/* Summary card */}
      <div className="profection-card">
        <div className="profection-card-row">
          <span className="profection-label">盤型</span>
          <span className="profection-value">{isDay ? '日間盤（太陽在地平線上）' : '夜間盤（太陽在地平線下）'}</span>
        </div>
        <div className="profection-card-row">
          <span className="profection-label">當前大限主星</span>
          <span className="profection-value" style={{ fontSize: '18px', fontWeight: 'bold' }}>
            <span className="planet-glyph">{mainInfo.glyph}</span> {mainInfo.name}
            <span style={{ fontSize: '12px', color: '#666', marginLeft: '10px' }}>
              {fmtDate(currentPeriod.startDate)} — {fmtDate(currentPeriod.endDate)}
            </span>
          </span>
        </div>
        <div className="profection-card-row">
          <span className="profection-label">當前小限主星</span>
          <span className="profection-value" style={{ fontSize: '16px' }}>
            <span className="planet-glyph">{subInfo.glyph}</span> {subInfo.name}
            <span style={{ fontSize: '12px', color: '#666', marginLeft: '10px' }}>
              {fmtDate(currentSubPeriod.startDate)} — {fmtDate(currentSubPeriod.endDate)}
            </span>
          </span>
        </div>
        {/* Sub-period progress bar */}
        <div style={{ margin: '8px 0 4px' }}>
          <div style={{ fontSize: '11px', color: '#666', marginBottom: '3px' }}>小限進度 {subProgress}%</div>
          <div style={{ background: '#e0e0e0', borderRadius: '4px', height: '8px', width: '100%' }}>
            <div style={{ background: '#2c6fad', borderRadius: '4px', height: '8px', width: `${subProgress}%` }} />
          </div>
        </div>
        <div className="profection-card-note">
          法達（Firdāriyyāt）是古典阿拉伯行星時主術。日間盤自太陽始，夜間盤自月亮始，
          75 年一大循環；每大限再分 7 小限，小限主星依序輪轉。
        </div>
      </div>

      {/* Sub-periods of current main period */}
      <h4 className="section-title">
        {mainInfo.glyph} {mainInfo.name} 大限的七小限（{fmtDate(currentPeriod.startDate)} — {fmtDate(currentPeriod.endDate)}）
      </h4>
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr className="table-header">
              <th>小限主星</th>
              <th>起始日期</th>
              <th>結束日期</th>
              <th>狀態</th>
            </tr>
          </thead>
          <tbody>
            {currentPeriod.subPeriods.map((sp, i) => {
              const isCurrent = targetDate >= sp.startDate && targetDate < sp.endDate;
              const isPast = targetDate >= sp.endDate;
              const spInfo = fmtFirdariaLord(sp.lord);
              return (
                <tr key={i} className={isCurrent ? 'profection-current-row' : i % 2 === 0 ? 'row-even' : 'row-odd'}>
                  <td className="planet-cell">
                    <span className="planet-glyph">{spInfo.glyph}</span> {spInfo.name}
                  </td>
                  <td className="center-cell">{fmtDate(sp.startDate)}</td>
                  <td className="center-cell">{fmtDate(sp.endDate)}</td>
                  <td className="center-cell">
                    {isCurrent ? <span style={{ color: '#1a7a1a', fontWeight: 'bold' }}>▶ 當前</span>
                     : isPast ? <span style={{ color: '#999' }}>已過</span>
                     : <span style={{ color: '#666' }}>未至</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Full 75-year cycle table */}
      <h4 className="section-title">75 年大限循環表</h4>
      <div className="table-scroll" style={{ maxHeight: '340px', overflowY: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr className="table-header">
              <th>大限主星</th>
              <th>年數</th>
              <th>起始日期</th>
              <th>結束日期</th>
              <th>當前小限</th>
            </tr>
          </thead>
          <tbody>
            {allPeriods.map((p, i) => {
              const isCurrentMain = targetDate >= p.startDate && targetDate < p.endDate;
              const isPastMain = targetDate >= p.endDate;
              const pInfo = fmtFirdariaLord(p.lord);
              const activeSub = isCurrentMain
                ? p.subPeriods.find((sp) => targetDate >= sp.startDate && targetDate < sp.endDate)
                : undefined;
              const activeSubInfo = activeSub ? fmtFirdariaLord(activeSub.lord) : null;
              return (
                <tr
                  key={i}
                  className={isCurrentMain ? 'profection-current-row' : i % 2 === 0 ? 'row-even' : 'row-odd'}
                  style={isPastMain && !isCurrentMain ? { opacity: 0.55 } : undefined}
                >
                  <td className="planet-cell">
                    <span className="planet-glyph">{pInfo.glyph}</span> {pInfo.name}
                  </td>
                  <td className="center-cell">{p.years} 年</td>
                  <td className="center-cell">{fmtDate(p.startDate)}</td>
                  <td className="center-cell">{fmtDate(p.endDate)}</td>
                  <td className="center-cell">
                    {activeSubInfo
                      ? <><span className="planet-glyph">{activeSubInfo.glyph}</span> {activeSubInfo.name}</>
                      : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: '11px', color: '#888', marginTop: '6px' }}>
        法達循環 75 年後重新開始。{isDay ? '日間盤序列：太陽→金星→水星→月亮→土星→木星→火星→北交→南交' : '夜間盤序列：月亮→土星→木星→火星→太陽→金星→水星→北交→南交'}
      </div>
    </div>
  );
}

// ---- Profection Display ----

function ProfectionDisplay({
  result,
  natalChart,
  dateStr,
}: {
  result: ProfectionResult;
  natalChart: NatalChart;
  dateStr: string;
}) {
  const lord = result.lordPosition;

  // Build the full 120-year (10 cycles) profection table for reference
  const cycles = 10;
  const rows: Array<{ age: number; house: number; sign: ZodiacSign; lord: Planet }> = [];
  for (let i = 0; i < cycles * 12; i++) {
    const h = i % 12;
    const houseCusp = natalChart.houses[h];
    const sign = houseCusp.sign;
    const lordPl =
      ({ [ZodiacSign.Aries]: Planet.Mars, [ZodiacSign.Taurus]: Planet.Venus, [ZodiacSign.Gemini]: Planet.Mercury, [ZodiacSign.Cancer]: Planet.Moon, [ZodiacSign.Leo]: Planet.Sun, [ZodiacSign.Virgo]: Planet.Mercury, [ZodiacSign.Libra]: Planet.Venus, [ZodiacSign.Scorpio]: Planet.Mars, [ZodiacSign.Sagittarius]: Planet.Jupiter, [ZodiacSign.Capricorn]: Planet.Saturn, [ZodiacSign.Aquarius]: Planet.Saturn, [ZodiacSign.Pisces]: Planet.Jupiter } as Record<ZodiacSign, Planet>)[sign] ?? Planet.Sun;
    rows.push({ age: i, house: h + 1, sign, lord: lordPl });
  }

  return (
    <div>
      {/* Summary card */}
      <div className="profection-card">
        <div className="profection-card-row">
          <span className="profection-label">當前年齡</span>
          <span className="profection-value">{result.age} 歲</span>
        </div>
        <div className="profection-card-row">
          <span className="profection-label">流年啟動宮位</span>
          <span className="profection-value">
            第 {result.activatedHouse} 宮（{ZODIAC_SIGNS[result.activatedSign].name}）
          </span>
        </div>
        <div className="profection-card-row">
          <span className="profection-label">本年主星（Lord of Year）</span>
          <span className="profection-value">
            <span className="planet-glyph">{PLANET_INFO[result.lordOfYear].glyph}</span>
            {PLANET_INFO[result.lordOfYear].name}
          </span>
        </div>
        <div className="profection-card-row">
          <span className="profection-label">宮位主題</span>
          <span className="profection-value">{result.houseTopicZh}</span>
        </div>
        {lord && (
          <div className="profection-card-row">
            <span className="profection-label">主星本命位置</span>
            <span className="profection-value">
              {formatLon(lord.longitude)}，第 {lord.house} 宮
              {lord.retrograde ? <span className="retrograde-symbol"> ℞</span> : ''}
            </span>
          </div>
        )}
        <div className="profection-card-note">
          本年過境到達本年主星的時間點特別重要，
          與本命盤中主星相關的行星過境也值得特別關注。
        </div>
      </div>

      {/* Profection timeline table — highlight current age */}
      <h4 className="section-title">流年宮位循環表（120年）</h4>
      <div className="table-scroll" style={{ maxHeight: '340px', overflowY: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr className="table-header">
              <th>年齡</th>
              <th>啟動宮位</th>
              <th>宮位星座</th>
              <th>本年主星</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.age}
                className={r.age === result.age ? 'profection-current-row' : r.age % 2 === 0 ? 'row-even' : 'row-odd'}
              >
                <td className="center-cell">{r.age}</td>
                <td className="center-cell">第 {r.house} 宮</td>
                <td>
                  <span className="sign-glyph">{ZODIAC_SIGNS[r.sign].glyph}</span>
                  {ZODIAC_SIGNS[r.sign].name}
                </td>
                <td className="planet-cell">
                  <span className="planet-glyph">{PLANET_INFO[r.lord].glyph}</span>
                  {PLANET_INFO[r.lord].name}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: '11px', color: '#888', marginTop: '6px' }}>
        每年生日當天宮位進位一格；宮位循環 12 年一周期。本命宮位制度：
        {natalChart.houseSystem}。
      </div>
      {/* suppress unused var warning */}
      {dateStr && null}
    </div>
  );
}
