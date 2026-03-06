import type { BaziChart } from '../types/bazi';
import {
  STEMS,
  BRANCHES,
  STEM_ELEMENTS,
  BRANCH_ELEMENTS,
  STEM_YIN_YANG,
  ELEMENT_COLORS,
} from '../types/bazi';
import { getTodayGanzhi, countElements } from '../lib/bazi';

interface BaziResultProps {
  chart: BaziChart;
}

function pillarLabel(stem: number, branch: number) {
  return STEMS[stem] + BRANCHES[branch];
}

const PILLAR_HEADERS = ['年柱', '月柱', '日柱', '時柱'];

export function BaziResult({ chart }: BaziResultProps) {
  const { yearPillar, monthPillar, dayPillar, hourPillar, input, isForward, luckCycles } = chart;
  const pillars = [yearPillar, monthPillar, dayPillar, hourPillar];

  // Today's ganzhi banner
  const today = getTodayGanzhi();

  // Direction label for 大運
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

  // Element counts
  const elemCounts = countElements(chart);
  const ELEMENTS = ['木', '火', '土', '金', '水'];
  const maxCount = Math.max(...Object.values(elemCounts), 1);

  return (
    <div className="bazi-result">
      {/* 今日干支 */}
      <div className="bazi-today-banner">
        今日：{pillarLabel(today.yearPillar.stem, today.yearPillar.branch)}年&nbsp;
        {pillarLabel(today.monthPillar.stem, today.monthPillar.branch)}月&nbsp;
        {pillarLabel(today.dayPillar.stem, today.dayPillar.branch)}日
      </div>

      {/* 命盤 */}
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
            {/* 天干 row */}
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
            {/* 地支 row */}
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
            {/* 五行 row */}
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
