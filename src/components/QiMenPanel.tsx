import { useState, useCallback } from 'react';
import { calculateQiMen, calculateQiMenDay, calculateQiMenYear } from '../lib/qimen';
import type { QiMenChart, QiMenPalace } from '../types/qimen';
import { STAR_QUALITY, DOOR_QUALITY } from '../types/qimen';

// ---- Lo Shu grid display order ----
// Row-major, top-to-bottom (南→中→北), left-to-right (東→西):
// Row 0 (South):  巽(4) 離(9) 坤(2)
// Row 1 (Middle): 震(3) 中(5) 兌(7)
// Row 2 (North):  艮(8) 坎(1) 乾(6)
const GRID_LAYOUT = [4, 9, 2, 3, 5, 7, 8, 1, 6] as const;

type Mode = '時盤' | '日盤' | '年盤';

function qualityClass(q: string): string {
  if (q === '大吉') return 'qm-great-good';
  if (q === '吉') return 'qm-good';
  if (q === '凶') return 'qm-bad';
  if (q === '大凶') return 'qm-great-bad';
  return '';
}

function PalaceCell({ palace }: { palace: QiMenPalace; chart: QiMenChart }) {
  const starQ = STAR_QUALITY[palace.star] ?? '';
  const doorQ = palace.door ? (DOOR_QUALITY[palace.door] ?? '') : '';

  return (
    <div
      className={[
        'qm-palace',
        palace.isCenter ? 'qm-palace-center' : '',
        palace.isDutyStar ? 'qm-duty-star' : '',
        palace.isDutyDoor ? 'qm-duty-door' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="qm-palace-header">
        <span className="qm-palace-gua">{palace.gua}</span>
        <span className="qm-palace-dir">{palace.dirShort}</span>
      </div>

      {/* Stems row */}
      <div className="qm-stems-row">
        <span className="qm-heaven-stem">{palace.heavenStem}</span>
        <span className="qm-stem-divider">▲</span>
        <span className="qm-earth-stem">{palace.earthStem}</span>
      </div>

      {/* Star */}
      <div className={`qm-star ${qualityClass(starQ)}`}>{palace.star}</div>

      {/* Door */}
      {palace.door && (
        <div className={`qm-door ${qualityClass(doorQ)}`}>{palace.door}</div>
      )}

      {/* Deity */}
      {palace.deity && <div className="qm-deity">{palace.deity}</div>}

      {/* Badges */}
      <div className="qm-badges">
        {palace.isDutyStar && <span className="qm-badge qm-badge-star">值符</span>}
        {palace.isDutyDoor && <span className="qm-badge qm-badge-door">值使</span>}
      </div>
    </div>
  );
}

interface QiMenPanelProps {
  defaultDatetime?: { year: number; month: number; day: number; hour: number; minute: number };
}

function padTwo(n: number): string {
  return String(n).padStart(2, '0');
}

function toDatetimeLocal(dt: {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}): string {
  return `${dt.year}-${padTwo(dt.month)}-${padTwo(dt.day)}T${padTwo(dt.hour)}:${padTwo(dt.minute)}`;
}

function fromDatetimeLocal(s: string) {
  const [datePart, timePart] = s.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);
  return { year, month, day, hour, minute };
}

function toDateInput(dt: { year: number; month: number; day: number }): string {
  return `${dt.year}-${padTwo(dt.month)}-${padTwo(dt.day)}`;
}

function fromDateInput(s: string) {
  const [year, month, day] = s.split('-').map(Number);
  return { year, month, day };
}

export function QiMenPanel({ defaultDatetime }: QiMenPanelProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('時盤');

  const now = new Date();
  const initDt = defaultDatetime ?? {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
    hour: now.getHours(),
    minute: now.getMinutes(),
  };

  // 時盤 state
  const [dtStr, setDtStr] = useState(toDatetimeLocal(initDt));
  // 日盤 state
  const [dateStr, setDateStr] = useState(toDateInput(initDt));
  // 年盤 state
  const [yearInput, setYearInput] = useState(now.getFullYear());

  const [chart, setChart] = useState<QiMenChart | null>(null);
  const [error, setError] = useState<string | null>(null);

  const compute = useCallback(
    (currentMode: Mode, dtStrVal: string, dateStrVal: string, yearVal: number) => {
      try {
        let c: QiMenChart;
        if (currentMode === '時盤') {
          c = calculateQiMen(fromDatetimeLocal(dtStrVal));
        } else if (currentMode === '日盤') {
          c = calculateQiMenDay(fromDateInput(dateStrVal));
        } else {
          c = calculateQiMenYear(yearVal);
        }
        setChart(c);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : '計算失敗');
      }
    },
    [],
  );

  const handleNow = () => {
    const d = new Date();
    const dt = {
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      day: d.getDate(),
      hour: d.getHours(),
      minute: d.getMinutes(),
    };
    const s = toDatetimeLocal(dt);
    const ds = toDateInput(dt);
    setDtStr(s);
    setDateStr(ds);
    setYearInput(d.getFullYear());
    compute(mode, s, ds, d.getFullYear());
  };

  const handleModeChange = (newMode: Mode) => {
    setMode(newMode);
    setChart(null);
    setError(null);
  };

  return (
    <section className="classical-panel">
      <button
        className="panel-toggle-btn"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        ☰ 奇門遁甲 {open ? '▲' : '▼'}
      </button>

      {open && (
        <div className="panel-body">
          {/* Mode tabs */}
          <div className="qm-mode-tabs">
            {(['時盤', '日盤', '年盤'] as Mode[]).map((m) => (
              <button
                key={m}
                className={`qm-mode-btn ${mode === m ? 'qm-mode-btn--active' : ''}`}
                onClick={() => handleModeChange(m)}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Input row */}
          <div className="qm-input-row">
            {mode === '時盤' && (
              <input
                type="datetime-local"
                className="qm-datetime-input"
                value={dtStr}
                onChange={(e) => setDtStr(e.target.value)}
              />
            )}
            {mode === '日盤' && (
              <input
                type="date"
                className="qm-datetime-input"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
              />
            )}
            {mode === '年盤' && (
              <input
                type="number"
                className="qm-year-input"
                value={yearInput}
                min={1900}
                max={2100}
                onChange={(e) => setYearInput(parseInt(e.target.value))}
              />
            )}
            <button
              className="qm-btn"
              onClick={() => compute(mode, dtStr, dateStr, yearInput)}
            >
              排盤
            </button>
            <button className="qm-btn qm-btn-now" onClick={handleNow}>
              此刻
            </button>
          </div>

          {error && <p className="panel-note" style={{ color: 'var(--clr-danger)' }}>{error}</p>}

          {chart && (
            <>
              {/* Meta strip */}
              <div className="qm-meta-strip">
                <span className={`qm-mode-label qm-mode-label--${mode === '時盤' ? 'shi' : mode === '日盤' ? 'ri' : 'nian'}`}>
                  {mode}
                </span>
                <span className={`qm-dun-badge ${chart.dun === '陽遁' ? 'qm-yang' : 'qm-yin'}`}>
                  {chart.dun}
                </span>
                <span className="qm-ju-badge">{chart.ju}局</span>
                <span className="qm-yuan">{chart.yuan}</span>
                <span className="qm-term">{chart.solarTermName}</span>
                <span className="qm-xun">旬首：{chart.xunShou}</span>
              </div>

              {/* Ganzhi pillars */}
              <div className="qm-pillars-row">
                {(mode === '年盤'
                  ? [['年', chart.pillarYear.full], ['月', chart.pillarMonth.full], ['日', chart.pillarDay.full]]
                  : mode === '日盤'
                  ? [['年', chart.pillarYear.full], ['月', chart.pillarMonth.full], ['日', chart.pillarDay.full]]
                  : [
                      ['年', chart.pillarYear.full],
                      ['月', chart.pillarMonth.full],
                      ['日', chart.pillarDay.full],
                      ['時', chart.pillarHour.full],
                    ]
                ).map(([label, val]) => (
                  <div key={label} className="qm-pillar-cell">
                    <span className="qm-pillar-label">{label}</span>
                    <span className="qm-pillar-val">{val}</span>
                  </div>
                ))}
              </div>

              {/* Duty pair */}
              <div className="qm-duty-row">
                <span>
                  値符：<strong>{chart.dutyStar}</strong>（{chart.dutyStarPalace}宮）
                </span>
                <span>
                  値使：<strong>{chart.dutyDoor}</strong>（{chart.dutyDoorPalace}宮）
                </span>
              </div>

              {/* 9-palace grid */}
              <div className="qm-grid" role="grid" aria-label="奇門遁甲九宮格">
                {GRID_LAYOUT.map((palaceNum) => {
                  const p = chart.palaces[palaceNum - 1];
                  return <PalaceCell key={palaceNum} palace={p} chart={chart} />;
                })}
              </div>

              {/* Legend */}
              <div className="qm-legend">
                <span>
                  <span className="qm-heaven-stem">天幹</span>▲
                  <span className="qm-earth-stem">地幹</span>
                </span>
                <span className="qm-badge qm-badge-star">值符</span>＝值符星宮&ensp;
                <span className="qm-badge qm-badge-door">值使</span>＝值使門宮
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
