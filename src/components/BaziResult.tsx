import type { BaziChart } from '../types/bazi';
import {
  STEMS,
  BRANCHES,
  STEM_ELEMENTS,
  BRANCH_ELEMENTS,
  STEM_YIN_YANG,
  ELEMENT_COLORS,
  BRANCH_HIDDEN_STEMS,
} from '../types/bazi';
import { getTodayGanzhi, countElements, getTenGod, findBranchInteractions, analyzeDayMaster } from '../lib/bazi';

interface BaziResultProps {
  chart: BaziChart;
}

const PILLAR_HEADERS = ['年柱', '月柱', '日柱', '時柱'];

const INTERACTION_COLORS: Record<string, string> = {
  六合: '#1a7a1a',
  三合: '#1a5ca8',
  六沖: '#c0392b',
  三刑: '#8b6914',
  六破: '#7b3f00',
  六害: '#6b21a8',
};

export function BaziResult({ chart }: BaziResultProps) {
  const { yearPillar, monthPillar, dayPillar, hourPillar, input, isForward, luckCycles } = chart;
  const pillars = [yearPillar, monthPillar, dayPillar, hourPillar];

  const today = getTodayGanzhi();

  const isYangYear = yearPillar.stem % 2 === 0;
  const isMale = input.gender === 'male';
  const dirLabel = isForward ? '順行大運' : '逆行大運';
  const reasonLabel = isMale
    ? isYangYear
      ? '（男命陽年）'
      : '（男命陰年）'
    : isYangYear
      ? '（女命陽年）'
      : '（女命陰年）';

  const elemCounts = countElements(chart);
  const ELEMENTS = ['木', '火', '土', '金', '水'];
  const maxCount = Math.max(...Object.values(elemCounts), 1);

  const interactions = findBranchInteractions(chart);
  const dayAnalysis = analyzeDayMaster(chart);

  return (
    <div className="bazi-result">
      {/* 今日干支 */}
      <div className="bazi-today-banner">
        今日：{STEMS[today.yearPillar.stem]}{BRANCHES[today.yearPillar.branch]}年&nbsp;
        {STEMS[today.monthPillar.stem]}{BRANCHES[today.monthPillar.branch]}月&nbsp;
        {STEMS[today.dayPillar.stem]}{BRANCHES[today.dayPillar.branch]}日
      </div>

      {/* 命盤四柱 */}
      <h3 className="section-heading">命盤四柱</h3>
      <div className="table-scroll">
        <table className="data-table bazi-mingpan-table">
          <thead>
            <tr className="table-header">
              {PILLAR_HEADERS.map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* 十神行 */}
            <tr>
              {pillars.map((p, i) => (
                <td key={i} className="bazi-glyph-cell center-cell">
                  {i === 2 ? (
                    <span className="bazi-ten-god bazi-ten-god-daymaster">日主</span>
                  ) : (
                    <span className="bazi-ten-god">
                      {getTenGod(dayPillar.stem, p.stem)}
                    </span>
                  )}
                </td>
              ))}
            </tr>
            {/* 天干行 */}
            <tr>
              {pillars.map((p, i) => (
                <td key={i} className="bazi-glyph-cell center-cell">
                  <span
                    className="bazi-large-glyph"
                    style={{ color: ELEMENT_COLORS[STEM_ELEMENTS[p.stem]] }}
                  >
                    {STEMS[p.stem]}
                  </span>
                  <div className="bazi-yinyang">{STEM_YIN_YANG[p.stem]}</div>
                </td>
              ))}
            </tr>
            {/* 地支行 */}
            <tr>
              {pillars.map((p, i) => (
                <td key={i} className="bazi-glyph-cell center-cell">
                  <span
                    className="bazi-large-glyph"
                    style={{ color: ELEMENT_COLORS[BRANCH_ELEMENTS[p.branch]] }}
                  >
                    {BRANCHES[p.branch]}
                  </span>
                </td>
              ))}
            </tr>
            {/* 藏干行 */}
            <tr>
              {pillars.map((p, i) => {
                const hidden = BRANCH_HIDDEN_STEMS[p.branch];
                return (
                  <td key={i} className="bazi-glyph-cell center-cell">
                    <div className="bazi-hidden-stems">
                      {hidden.map((s, hi) => (
                        <span
                          key={hi}
                          className={`bazi-hidden-stem ${hi === 0 ? 'bazi-hidden-main' : ''}`}
                          style={{ color: ELEMENT_COLORS[STEM_ELEMENTS[s]] }}
                          title={hi === 0 ? '本氣' : hi === 1 ? '中氣' : '餘氣'}
                        >
                          {STEMS[s]}
                        </span>
                      ))}
                    </div>
                  </td>
                );
              })}
            </tr>
            {/* 五行行 */}
            <tr>
              {pillars.map((p, i) => (
                <td key={i} className="center-cell" style={{ fontSize: '12px', color: '#555' }}>
                  <span style={{ color: ELEMENT_COLORS[STEM_ELEMENTS[p.stem]] }}>
                    {STEM_ELEMENTS[p.stem]}
                  </span>
                  &nbsp;/&nbsp;
                  <span style={{ color: ELEMENT_COLORS[BRANCH_ELEMENTS[p.branch]] }}>
                    {BRANCH_ELEMENTS[p.branch]}
                  </span>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* 日主強弱 */}
      <h3 className="section-heading">日主強弱分析</h3>
      <div className={`day-master-box day-master-${dayAnalysis.strength}`}>
        <div className="day-master-strength">
          <span className="day-master-label">日主</span>
          <span className="day-master-stem" style={{ color: ELEMENT_COLORS[STEM_ELEMENTS[dayPillar.stem]] }}>
            {STEMS[dayPillar.stem]}（{STEM_ELEMENTS[dayPillar.stem]}）
          </span>
          <span className="day-master-tag">{dayAnalysis.strength}</span>
          <span className="day-master-score">得分 {dayAnalysis.score}</span>
        </div>
        <p className="day-master-desc">{dayAnalysis.description}</p>
        <div className="day-master-gods">
          <span>
            用神：<strong style={{ color: ELEMENT_COLORS[dayAnalysis.favorableElement] }}>{dayAnalysis.favorableElement}</strong>
          </span>
          <span style={{ marginLeft: '16px' }}>
            忌神：<strong style={{ color: ELEMENT_COLORS[dayAnalysis.avoidElement] }}>{dayAnalysis.avoidElement}</strong>
          </span>
        </div>
      </div>

      {/* 刑沖合破害 */}
      <h3 className="section-heading">刑沖合破害</h3>
      {interactions.length === 0 ? (
        <p className="bazi-no-interaction">四柱地支間無明顯刑沖合破害。</p>
      ) : (
        <div className="bazi-interactions">
          {interactions.map((item, idx) => (
            <div
              key={idx}
              className="bazi-interaction-tag"
              style={{ borderColor: INTERACTION_COLORS[item.type], color: INTERACTION_COLORS[item.type] }}
            >
              <strong>{item.type}</strong>
              <span>：{item.pillars.join('＋')}支</span>
              {item.result && <span>（{item.result}）</span>}
            </div>
          ))}
        </div>
      )}

      {/* 大運 */}
      <h3 className="section-heading">
        {dirLabel}
        {reasonLabel}
        <span className="bazi-luck-start">
          &emsp;起運：{chart.luckStartYears} 歲 {chart.luckStartMonths} 個月
        </span>
      </h3>
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr className="table-header">
              <th>#</th>
              <th>天干</th>
              <th>十神</th>
              <th>地支</th>
              <th>五行</th>
              <th>起運年齡</th>
              <th>起運年份</th>
            </tr>
          </thead>
          <tbody>
            {luckCycles.map((cycle, idx) => (
              <tr key={cycle.index} className={idx % 2 === 0 ? 'row-even' : 'row-odd'}>
                <td className="center-cell">{cycle.index + 1}</td>
                <td
                  className="center-cell"
                  style={{ color: ELEMENT_COLORS[STEM_ELEMENTS[cycle.pillar.stem]], fontWeight: 'bold' }}
                >
                  {STEMS[cycle.pillar.stem]}
                </td>
                <td className="center-cell" style={{ fontSize: '12px', color: '#555' }}>
                  {getTenGod(dayPillar.stem, cycle.pillar.stem)}
                </td>
                <td
                  className="center-cell"
                  style={{ color: ELEMENT_COLORS[BRANCH_ELEMENTS[cycle.pillar.branch]], fontWeight: 'bold' }}
                >
                  {BRANCHES[cycle.pillar.branch]}
                </td>
                <td className="center-cell" style={{ fontSize: '12px', color: '#555' }}>
                  <span style={{ color: ELEMENT_COLORS[STEM_ELEMENTS[cycle.pillar.stem]] }}>
                    {STEM_ELEMENTS[cycle.pillar.stem]}
                  </span>
                  &nbsp;/&nbsp;
                  <span style={{ color: ELEMENT_COLORS[BRANCH_ELEMENTS[cycle.pillar.branch]] }}>
                    {BRANCH_ELEMENTS[cycle.pillar.branch]}
                  </span>
                </td>
                <td className="center-cell">{cycle.startAge} 歲</td>
                <td className="center-cell">{cycle.startYear} 年</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 五行統計 */}
      <h3 className="section-heading">五行統計</h3>
      <div className="bazi-elements-stats">
        {ELEMENTS.map((el) => (
          <div key={el} className="bazi-element-row">
            <span className="bazi-element-name" style={{ color: ELEMENT_COLORS[el] }}>
              {el}
            </span>
            <div className="bazi-element-bar-wrap">
              <div
                className="bazi-element-bar"
                style={{
                  width: `${(elemCounts[el] / maxCount) * 120}px`,
                  backgroundColor: ELEMENT_COLORS[el],
                }}
              />
            </div>
            <span className="bazi-element-count">{elemCounts[el]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
