/**
 * ArabicPartsPanel — displays the 12 Hellenistic lots (Arabic parts) derived
 * from a natal chart in a compact table.
 */

import { useState } from 'react';
import type { NatalChart } from '../types/astro';
import { ZODIAC_SIGNS } from '../types/astro';
import { calculateArabicParts } from '../lib/arabicParts';

interface ArabicPartsPanelProps {
  chart: NatalChart;
}

export function ArabicPartsPanel({ chart }: ArabicPartsPanelProps) {
  const [open, setOpen] = useState(false);

  const lots = open ? calculateArabicParts(chart) : null;

  return (
    <section className="classical-panel">
      <button
        type="button"
        className="panel-toggle-btn"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {open ? '▲' : '▼'} 阿拉伯點／希臘命點
        <span className="panel-toggle-hint">（12 個命點）</span>
      </button>

      {open && lots && (
        <div className="panel-body">
          <p className="panel-note">
            ✦ 基於 Paulus Alexandrinus 與 Vettius Valens 的計算系統。
            福運點（Lot of Fortune）是最重要的命點，代表身體、物質與命運。
          </p>
          <div className="table-scroll">
            <table className="data-table arabic-parts-table" cellPadding={4} cellSpacing={0}>
              <thead>
                <tr className="table-header">
                  <th>命點名稱</th>
                  <th>公式</th>
                  <th>星座・度數</th>
                  <th>宮位</th>
                </tr>
              </thead>
              <tbody>
                {lots.map((lot, i) => {
                  const si = ZODIAC_SIGNS[lot.sign];
                  return (
                    <tr key={i} className={i % 2 === 0 ? 'row-even' : 'row-odd'}>
                      <td className="lot-name-cell">
                        <span className="lot-idx">{i + 1}.</span> {lot.nameZh}
                        <span className="lot-en"> {lot.nameEn}</span>
                      </td>
                      <td className="lot-formula-cell">{lot.formula}</td>
                      <td className="center-cell" style={{ whiteSpace: 'nowrap' }}>
                        {si.glyph} {si.name} {lot.degree}°{String(lot.minute).padStart(2, '0')}'
                      </td>
                      <td className="center-cell">第 {lot.house} 宮</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
