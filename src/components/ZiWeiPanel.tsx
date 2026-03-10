import { useState, useCallback } from 'react';
import { calculateZiWei } from '../lib/ziwei';
import type { ZiWeiChart, ZiWeiPalace } from '../types/ziwei';
import { GRID_POSITIONS, STAR_CATEGORY } from '../types/ziwei';

// ---- Palace cell ----

function PalaceCell({ palace, isLife }: { palace: ZiWeiPalace; isLife: boolean }) {
  return (
    <div className={`zw-palace ${isLife ? 'zw-life-palace' : ''}`}>
      <div className="zw-palace-header">
        <span className="zw-branch">{palace.branchName}</span>
        <span className="zw-stem">{palace.stem}宮</span>
      </div>
      <div className="zw-palace-name">{palace.palaceName}</div>
      <div className="zw-main-stars">
        {palace.mainStars.map(({ name }) => (
          <span
            key={name}
            className={`zw-star zw-main-star zw-star-${STAR_CATEGORY[name] ?? 'neutral'}`}
          >
            {name}
          </span>
        ))}
      </div>
      {palace.auxStars.length > 0 && (
        <div className="zw-aux-stars">
          {palace.auxStars.map((s) => (
            <span key={s} className="zw-star zw-aux-star">{s}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- Grid renderer ----
// Traditional 4×4 display (outer 12 cells, center 4 cells = info panel)
//   [丑] [子] [亥] [戌]
//   [寅]  [info...]   [酉]
//   [卯]  [info...]   [申]
//   [辰] [巳] [午] [未]

function PalaceGrid({ chart }: { chart: ZiWeiChart }) {
  // Map branch → palace
  const byBranch = new Map<number, ZiWeiPalace>(
    chart.palaces.map((p) => [p.branch, p])
  );

  // Build 4×4 grid
  const grid: (ZiWeiPalace | 'center' | null)[][] = Array.from({ length: 4 }, () =>
    Array(4).fill(null),
  );

  for (const [branch, [row, col]] of Object.entries(GRID_POSITIONS)) {
    const b = Number(branch);
    const p = byBranch.get(b);
    if (p) grid[row][col] = p;
  }
  // Mark center cells
  grid[1][1] = 'center';
  grid[1][2] = 'center';
  grid[2][1] = 'center';
  grid[2][2] = 'center';

  return (
    <div className="zw-grid" role="grid" aria-label="紫微斗數命盤">
      {grid.map((row, ri) =>
        row.map((cell, ci) => {
          if (cell === null) return <div key={`${ri}-${ci}`} className="zw-empty" />;
          if (cell === 'center') {
            if (ri === 1 && ci === 1) {
              // Render 2×2 center info block — spanned via CSS grid-area
              return (
                <div key="center-info" className="zw-center-info">
                  <div className="zw-center-row">
                    <span className="zw-center-label">五行局</span>
                    <span className="zw-center-val">{chart.juName}</span>
                  </div>
                  <div className="zw-center-row">
                    <span className="zw-center-label">農曆</span>
                    <span className="zw-center-val">
                      {chart.lunarMonth}月{chart.lunarDay}日
                      {chart.isLeapMonth ? '（閏）' : ''}
                    </span>
                  </div>
                  <div className="zw-center-row">
                    <span className="zw-center-label">紫微</span>
                    <span className="zw-center-val">{chart.palaces.find((p) => p.branch === chart.ziWeiBranch)?.branchName}宮</span>
                  </div>
                  <div className="zw-center-row">
                    <span className="zw-center-label">命宮</span>
                    <span className="zw-center-val">{chart.palaces[0].branchName}宮</span>
                  </div>
                  <div className="zw-center-row">
                    <span className="zw-center-label">年柱</span>
                    <span className="zw-center-val">{chart.yearStem}{chart.yearBranch}</span>
                  </div>
                  <div className="zw-center-row">
                    <span className="zw-center-label">時支</span>
                    <span className="zw-center-val">{chart.hourBranch}時</span>
                  </div>
                </div>
              );
            }
            return null; // other center cells consumed by grid-area span
          }
          const p = cell as ZiWeiPalace;
          return (
            <PalaceCell
              key={p.branch}
              palace={p}
              isLife={p.idx === 0}
            />
          );
        }),
      )}
    </div>
  );
}

// ---- Main panel ----

interface ZiWeiFormState {
  year: string;
  month: string;
  day: string;
  hour: string;
  gender: 'male' | 'female';
}

export function ZiWeiPanel() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ZiWeiFormState>({
    year: '1990',
    month: '1',
    day: '1',
    hour: '12',
    gender: 'male',
  });
  const [chart, setChart] = useState<ZiWeiChart | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const compute = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const result = calculateZiWei({
        year: Number(form.year),
        month: Number(form.month),
        day: Number(form.day),
        hour: Number(form.hour),
        gender: form.gender,
      });
      setChart(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : '排盤失敗，請確認輸入');
    } finally {
      setLoading(false);
    }
  }, [form]);

  return (
    <section className="classical-panel">
      <button
        className="panel-toggle-btn"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        ☰ 紫微斗數命盤 {open ? '▲' : '▼'}
      </button>

      {open && (
        <div className="panel-body">
          {/* Input form */}
          <div className="zw-form">
            <div className="zw-form-row">
              <div className="zw-form-field">
                <label className="form-label">出生年</label>
                <input
                  className="form-input zw-input-year"
                  type="number"
                  name="year"
                  value={form.year}
                  min={1900}
                  max={2100}
                  onChange={handleChange}
                />
              </div>
              <div className="zw-form-field">
                <label className="form-label">月</label>
                <input
                  className="form-input zw-input-sm"
                  type="number"
                  name="month"
                  value={form.month}
                  min={1}
                  max={12}
                  onChange={handleChange}
                />
              </div>
              <div className="zw-form-field">
                <label className="form-label">日</label>
                <input
                  className="form-input zw-input-sm"
                  type="number"
                  name="day"
                  value={form.day}
                  min={1}
                  max={31}
                  onChange={handleChange}
                />
              </div>
              <div className="zw-form-field">
                <label className="form-label">時辰（時）</label>
                <input
                  className="form-input zw-input-sm"
                  type="number"
                  name="hour"
                  value={form.hour}
                  min={0}
                  max={23}
                  onChange={handleChange}
                />
              </div>
              <div className="zw-form-field">
                <label className="form-label">性別</label>
                <select className="form-input" name="gender" value={form.gender} onChange={handleChange}>
                  <option value="male">男</option>
                  <option value="female">女</option>
                </select>
              </div>
            </div>
            <button className="zw-submit-btn" onClick={compute} disabled={loading}>
              {loading ? '排盤中⋯' : '排紫微斗數'}
            </button>
          </div>

          {error && <p className="panel-note" style={{ color: 'var(--clr-danger)' }}>{error}</p>}

          {chart && !loading && (
            <>
              {/* Summary strip */}
              <div className="zw-summary-strip">
                <span className="zw-summary-item">
                  農曆 <strong>{chart.lunarMonth}月{chart.lunarDay}日</strong>
                  {chart.isLeapMonth && ' (閏月)'}
                </span>
                <span className="zw-summary-item">
                  五行局 <strong className="zw-ju">{chart.juName}</strong>
                </span>
                <span className="zw-summary-item">
                  命宮 <strong>{chart.palaces[0].branchName}宮</strong>
                </span>
                <span className="zw-summary-item">
                  紫微在 <strong>{chart.palaces.find((p) => p.branch === chart.ziWeiBranch)?.branchName}宮</strong>
                </span>
              </div>

              {/* 12-palace grid */}
              <PalaceGrid chart={chart} />

              {/* Star legend */}
              <div className="zw-legend">
                <span className="zw-star zw-main-star zw-star-ji">吉星</span>
                <span className="zw-star zw-main-star zw-star-xiong">凶星</span>
                <span className="zw-star zw-main-star zw-star-neutral">中性</span>
                <span className="zw-star zw-aux-star">輔星</span>
                <span className="zw-palace zw-life-palace" style={{ display: 'inline-block', padding: '1px 6px', fontSize: 11 }}>命宮框</span>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
