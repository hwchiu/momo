import { useState } from 'react';

import type { NumerologyResult } from '../types/numerology';
import { calculateNumerology, NUMEROLOGY_MEANINGS } from '../lib/numerology';

interface NumerologyPanelProps {
  /** Pre-fill from natal chart if available */
  initialBirthData?: { year: number; month: number; day: number };
}

interface NumberRowProps {
  label: string;
  value: number;
  showIfZero?: boolean;
}

function NumberRow({ label, value, showIfZero = true }: NumberRowProps) {
  const [expanded, setExpanded] = useState(false);
  if (!showIfZero && value === 0) return null;
  const meaning = NUMEROLOGY_MEANINGS[value];
  return (
    <>
      <tr
        className="numerology-row"
        onClick={() => meaning && setExpanded((p) => !p)}
        style={{ cursor: meaning ? 'pointer' : 'default' }}
      >
        <td className="numerology-label">{label}</td>
        <td className="numerology-value">{value === 0 ? '—' : value}</td>
        <td className="numerology-title">{meaning?.title ?? '—'}</td>
        <td className="numerology-keywords">{meaning?.keywords.slice(0, 3).join('、') ?? '—'}</td>
      </tr>
      {expanded && meaning && (
        <tr className="numerology-desc-row">
          <td colSpan={4} className="numerology-desc">
            {meaning.description}
          </td>
        </tr>
      )}
    </>
  );
}

export function NumerologyPanel({ initialBirthData }: NumerologyPanelProps) {
  const today = new Date();
  const init = initialBirthData ?? { year: today.getFullYear() - 30, month: 1, day: 1 };

  const [year, setYear] = useState(init.year);
  const [month, setMonth] = useState(init.month);
  const [day, setDay] = useState(init.day);
  const [name, setName] = useState('');
  const [calculated, setCalculated] = useState(!!initialBirthData);
  const [result, setResult] = useState<NumerologyResult | null>(
    initialBirthData ? calculateNumerology(initialBirthData, undefined, today.getFullYear()) : null,
  );

  function handleCalculate() {
    setResult(calculateNumerology({ year, month, day }, name || undefined, today.getFullYear()));
    setCalculated(true);
  }

  return (
    <div className="numerology-panel">
      {/* Birth date + name inputs */}
      <div className="numerology-inputs">
        <div className="numerology-input-row">
          <label className="form-label">出生日期：</label>
          <input
            type="number"
            className="numerology-year-input"
            value={year}
            min={1900}
            max={2100}
            onChange={(e) => {
              setYear(parseInt(e.target.value, 10) || year);
              setCalculated(false);
            }}
            placeholder="年"
          />
          <span className="numerology-sep">年</span>
          <input
            type="number"
            className="numerology-month-input"
            value={month}
            min={1}
            max={12}
            onChange={(e) => {
              setMonth(parseInt(e.target.value, 10) || month);
              setCalculated(false);
            }}
            placeholder="月"
          />
          <span className="numerology-sep">月</span>
          <input
            type="number"
            className="numerology-day-input"
            value={day}
            min={1}
            max={31}
            onChange={(e) => {
              setDay(parseInt(e.target.value, 10) || day);
              setCalculated(false);
            }}
            placeholder="日"
          />
          <span className="numerology-sep">日</span>
        </div>
        <div className="numerology-input-row">
          <label className="form-label" htmlFor="numerology-name">
            英文姓名（選填）：
          </label>
          <input
            id="numerology-name"
            type="text"
            className="numerology-name-input"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setCalculated(false);
            }}
            placeholder="輸入英文全名以計算表達數等"
          />
        </div>
        <button className="submit-btn" onClick={handleCalculate}>
          計算數字學
        </button>
        {initialBirthData && !calculated && (
          <span className="numerology-hint">⬆ 已從星盤帶入出生日期，可直接點計算</span>
        )}
      </div>

      {result && (
        <>
          <div className="numerology-personal-year">
            <span className="personal-year-label">今年個人年：</span>
            <span className="personal-year-value">{result.personalYear}</span>
            <span className="personal-year-meaning">
              {NUMEROLOGY_MEANINGS[result.personalYear]?.title ?? ''}
            </span>
            <span className="personal-month-label">本月個人月：</span>
            <span className="personal-month-value">{result.personalMonth}</span>
          </div>

          <div className="table-scroll">
            <table className="data-table numerology-table" cellPadding={3} cellSpacing={0}>
              <thead>
                <tr className="table-header">
                  <th>數字類型</th>
                  <th>數值</th>
                  <th>標題</th>
                  <th>關鍵詞（點擊展開說明）</th>
                </tr>
              </thead>
              <tbody>
                <NumberRow label="生命路徑數" value={result.lifePathNumber} />
                <NumberRow label="生日數" value={result.birthDayNumber} />
                <NumberRow label="表達數" value={result.expressionNumber} showIfZero={false} />
                <NumberRow label="靈魂慾望數" value={result.soulUrgeNumber} showIfZero={false} />
                <NumberRow label="個性數" value={result.personalityNumber} showIfZero={false} />
              </tbody>
            </table>
          </div>
          {!name && (
            <p className="numerology-hint">輸入英文姓名後可顯示表達數、靈魂慾望數及個性數。</p>
          )}
        </>
      )}
    </div>
  );
}
