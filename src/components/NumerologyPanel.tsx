import { useState } from 'react';

import type { NumerologyResult } from '../types/numerology';
import { calculateNumerology, NUMEROLOGY_MEANINGS } from '../lib/numerology';

interface NumerologyPanelProps {
  birthData: { year: number; month: number; day: number };
  fullName?: string;
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

export function NumerologyPanel({ birthData, fullName: initialName }: NumerologyPanelProps) {
  const [name, setName] = useState(initialName ?? '');
  const result: NumerologyResult = calculateNumerology(
    birthData,
    name || undefined,
    new Date().getFullYear(),
  );

  return (
    <div className="numerology-panel">
      <div className="numerology-name-row">
        <label htmlFor="numerology-name" className="numerology-name-label">
          姓名（英文，選填）：
        </label>
        <input
          id="numerology-name"
          type="text"
          className="numerology-name-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="輸入英文全名以計算表達數等"
        />
      </div>

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
              <th>關鍵詞</th>
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
      {!name && <p className="numerology-hint">輸入英文姓名後可顯示表達數、靈魂慾望數及個性數。</p>}
    </div>
  );
}
