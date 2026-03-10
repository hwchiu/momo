import { useState, useMemo } from 'react';
import { STEMS, BRANCHES, STEM_ELEMENTS, BRANCH_ELEMENTS, ELEMENT_COLORS } from '../types/bazi';
import { getMonthDays } from '../lib/bazi';

interface DateSelectToolProps {
  defaultYearBranch?: number;
}

const OFFICER_NOTES: Record<string, string> = {
  建: '宜出行、祭祀，忌動土、嫁娶',
  除: '吉日，宜移徙、求醫、嫁娶',
  滿: '宜置產、嫁娶，忌出行、訴訟',
  平: '普通，宜一般事務',
  定: '吉日，宜簽約、開業、嫁娶',
  執: '宜捕捉、治病，忌嫁娶、出行',
  破: '凶日，萬事忌，宜破屋壞垣',
  危: '凶日，忌登高、出行',
  成: '大吉，宜開業、嫁娶、入宅',
  收: '宜收藏財物，忌出行、嫁娶',
  開: '吉日，宜開業、動土、嫁娶',
  閉: '忌開業、嫁娶，宜埋葬',
};

const GOOD_OFFICERS = new Set(['除', '定', '成', '開']);
const BAD_OFFICERS = new Set(['破', '危', '閉']);

export function DateSelectTool({ defaultYearBranch }: DateSelectToolProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [clientBranch, setClientBranch] = useState<number>(defaultYearBranch ?? -1);

  const days = useMemo(
    () => getMonthDays(year, month, clientBranch === -1 ? undefined : clientBranch),
    [year, month, clientBranch],
  );

  // Count auspicious / inauspicious
  const goodCount = days.filter((d) => !d.clash && GOOD_OFFICERS.has(d.officer)).length;
  const badCount = days.filter((d) => d.clash || BAD_OFFICERS.has(d.officer)).length;

  return (
    <div className="date-select-tool">
      <div className="date-select-controls">
        <div className="date-select-control-group">
          <label className="form-label">年份</label>
          <input
            type="number"
            className="form-input date-select-input"
            value={year}
            min={1900}
            max={2100}
            onChange={(e) => setYear(parseInt(e.target.value, 10) || today.getFullYear())}
          />
        </div>
        <div className="date-select-control-group">
          <label className="form-label">月份</label>
          <select
            className="form-select date-select-input"
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value, 10))}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {m} 月
              </option>
            ))}
          </select>
        </div>
        <div className="date-select-control-group">
          <label className="form-label">客戶年支</label>
          <select
            className="form-select date-select-input"
            value={clientBranch}
            onChange={(e) => setClientBranch(parseInt(e.target.value, 10))}
          >
            <option value={-1}>不設定</option>
            {BRANCHES.map((b, i) => (
              <option key={i} value={i}>
                {b}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="date-select-summary">
        <span className="ds-summary-good">吉日 {goodCount} 天</span>
        <span className="ds-summary-bad">需注意 {badCount} 天</span>
        {clientBranch !== -1 && (
          <span className="ds-summary-note">（已標示與「{BRANCHES[clientBranch]}」年沖之日）</span>
        )}
      </div>

      <div className="table-scroll">
        <table className="data-table date-select-table">
          <thead>
            <tr className="table-header">
              <th>日期</th>
              <th>星期</th>
              <th>日干支</th>
              <th>五行</th>
              <th>十二建星</th>
              <th>參考</th>
            </tr>
          </thead>
          <tbody>
            {days.map((d) => {
              const dateObj = new Date(d.dateStr);
              const weekday = ['日', '一', '二', '三', '四', '五', '六'][dateObj.getDay()];
              const isGood = !d.clash && GOOD_OFFICERS.has(d.officer);
              const isBad = d.clash || BAD_OFFICERS.has(d.officer);
              const rowClass = isGood
                ? 'date-row-good'
                : isBad
                  ? 'date-row-bad'
                  : d.day % 2 === 0
                    ? 'row-even'
                    : 'row-odd';

              return (
                <tr key={d.dateStr} className={rowClass}>
                  <td className="center-cell">{d.dateStr.slice(5)}</td>
                  <td className="center-cell">（{weekday}）</td>
                  <td className="center-cell">
                    <span
                      style={{
                        color: ELEMENT_COLORS[STEM_ELEMENTS[d.dayPillar.stem]],
                        fontWeight: 'bold',
                      }}
                    >
                      {STEMS[d.dayPillar.stem]}
                    </span>
                    <span
                      style={{
                        color: ELEMENT_COLORS[BRANCH_ELEMENTS[d.dayPillar.branch]],
                        fontWeight: 'bold',
                      }}
                    >
                      {BRANCHES[d.dayPillar.branch]}
                    </span>
                  </td>
                  <td className="center-cell" style={{ fontSize: '12px' }}>
                    <span style={{ color: ELEMENT_COLORS[STEM_ELEMENTS[d.dayPillar.stem]] }}>
                      {STEM_ELEMENTS[d.dayPillar.stem]}
                    </span>
                    /
                    <span style={{ color: ELEMENT_COLORS[BRANCH_ELEMENTS[d.dayPillar.branch]] }}>
                      {BRANCH_ELEMENTS[d.dayPillar.branch]}
                    </span>
                  </td>
                  <td className="center-cell">
                    <span
                      className={`officer-tag officer-${GOOD_OFFICERS.has(d.officer) ? 'good' : BAD_OFFICERS.has(d.officer) ? 'bad' : 'neutral'}`}
                    >
                      {d.officer}
                    </span>
                  </td>
                  <td className="date-select-note" title={OFFICER_NOTES[d.officer]}>
                    {d.note}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
