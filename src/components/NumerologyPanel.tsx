import { useState } from 'react';
import { calculateNumerology } from '../lib/numerology';
import type { NumerologyResult, PinnaclePeriod } from '../types/numerology';
import { NUMBER_MEANINGS, CHALLENGE_LABELS, CHALLENGE_MEANINGS } from '../types/numerology';

// ── helpers ──────────────────────────────────────────────────────────────────

function formatNum(n: number): string {
  return String(n);
}

function masterLabel(n: number): string {
  if (n === 11 || n === 22 || n === 33) return `${n} (主宰數)`;
  return String(n);
}

function todayYMD(): { year: number; month: number; day: number } {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}

// ── sub-components ────────────────────────────────────────────────────────────

interface NumberCardProps {
  label: string;
  value: number;
  sub?: string;
}

function NumberCard({ label, value, sub }: NumberCardProps) {
  const meaning = NUMBER_MEANINGS[value];
  const isMaster = value === 11 || value === 22 || value === 33;
  return (
    <div className={`num-card ${isMaster ? 'num-card--master' : ''}`}>
      <div className="num-card-header">
        <span className="num-card-label">{label}</span>
        <span className="num-card-value">{masterLabel(value)}</span>
      </div>
      {meaning && <div className="num-card-name">{meaning.name}</div>}
      {meaning && (
        <div className="num-card-keywords">
          {meaning.keywords.map((k) => (
            <span key={k} className="num-keyword">
              {k}
            </span>
          ))}
        </div>
      )}
      {meaning && <p className="num-card-desc">{meaning.description}</p>}
      {sub && <div className="num-card-sub">{sub}</div>}
    </div>
  );
}

interface ChallengesTableProps {
  challenges: [number, number, number, number];
}

function ChallengesTable({ challenges }: ChallengesTableProps) {
  return (
    <div className="num-section">
      <h3 className="num-section-title">挑戰數</h3>
      <div className="num-challenge-grid">
        {challenges.map((c, i) => (
          <div key={i} className="num-challenge-cell">
            <div className="num-challenge-label">{CHALLENGE_LABELS[i]}</div>
            <div className="num-challenge-value">{formatNum(c)}</div>
            <div className="num-challenge-desc">{CHALLENGE_MEANINGS[c] ?? ''}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface PinnaclesTableProps {
  pinnacles: PinnaclePeriod[];
  birthYear: number;
}

function PinnaclesTable({ pinnacles, birthYear }: PinnaclesTableProps) {
  return (
    <div className="num-section">
      <h3 className="num-section-title">頂峰期</h3>
      <div className="num-pinnacle-list">
        {pinnacles.map((p, i) => {
          const startYear = birthYear + p.startAge;
          const endYear = p.endAge !== null ? birthYear + p.endAge : null;
          const yearRange =
            endYear !== null ? `${startYear}–${endYear}年` : `${startYear}年起`;
          const meaning = NUMBER_MEANINGS[p.number];
          return (
            <div key={i} className="num-pinnacle-row">
              <div className="num-pinnacle-meta">
                <span className="num-pinnacle-label">{p.label}</span>
                <span className="num-pinnacle-ages">
                  {p.startAge}–{p.endAge ?? '∞'} 歲
                </span>
                <span className="num-pinnacle-years">{yearRange}</span>
              </div>
              <div className="num-pinnacle-number">{masterLabel(p.number)}</div>
              {meaning && <div className="num-pinnacle-name">{meaning.name}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────

interface NumerologyPanelProps {
  initialBirthData?: { year: number; month: number; day: number };
}

export function NumerologyPanel({ initialBirthData }: NumerologyPanelProps) {
  const today = todayYMD();

  const [birthYear, setBirthYear] = useState(initialBirthData?.year ?? 1990);
  const [birthMonth, setBirthMonth] = useState(initialBirthData?.month ?? 1);
  const [birthDay, setBirthDay] = useState(initialBirthData?.day ?? 1);
  const [refYear, setRefYear] = useState(today.year);
  const [refMonth, setRefMonth] = useState(today.month);
  const [refDay, setRefDay] = useState(today.day);
  const [result, setResult] = useState<NumerologyResult | null>(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(true);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const r = calculateNumerology(birthYear, birthMonth, birthDay, {
        year: refYear,
        month: refMonth,
        day: refDay,
      });
      setResult(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : '計算錯誤');
    }
  }

  return (
    <section className="panel-section">
      <button
        className="panel-toggle-btn"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        數字學 {open ? '▲' : '▼'}
      </button>

      {open && (
        <div className="panel-body">
          {/* ── Input form ── */}
          <form className="num-form" onSubmit={handleSubmit}>
            <fieldset className="num-fieldset">
              <legend>出生日期</legend>
              <div className="num-form-row">
                <label>
                  年
                  <input
                    type="number"
                    value={birthYear}
                    min={1900}
                    max={2100}
                    onChange={(e) => setBirthYear(parseInt(e.target.value))}
                  />
                </label>
                <label>
                  月
                  <input
                    type="number"
                    value={birthMonth}
                    min={1}
                    max={12}
                    onChange={(e) => setBirthMonth(parseInt(e.target.value))}
                  />
                </label>
                <label>
                  日
                  <input
                    type="number"
                    value={birthDay}
                    min={1}
                    max={31}
                    onChange={(e) => setBirthDay(parseInt(e.target.value))}
                  />
                </label>
              </div>
            </fieldset>

            <fieldset className="num-fieldset">
              <legend>參考日期（計算個人週期）</legend>
              <div className="num-form-row">
                <label>
                  年
                  <input
                    type="number"
                    value={refYear}
                    min={1900}
                    max={2100}
                    onChange={(e) => setRefYear(parseInt(e.target.value))}
                  />
                </label>
                <label>
                  月
                  <input
                    type="number"
                    value={refMonth}
                    min={1}
                    max={12}
                    onChange={(e) => setRefMonth(parseInt(e.target.value))}
                  />
                </label>
                <label>
                  日
                  <input
                    type="number"
                    value={refDay}
                    min={1}
                    max={31}
                    onChange={(e) => setRefDay(parseInt(e.target.value))}
                  />
                </label>
              </div>
            </fieldset>

            <button type="submit" className="btn-primary">
              計算
            </button>
          </form>

          {error && <div className="error-msg">{error}</div>}

          {result && (
            <div className="num-results">
              {/* ── Core numbers ── */}
              <div className="num-section">
                <h3 className="num-section-title">核心數字</h3>
                <div className="num-core-grid">
                  <NumberCard label="生命靈數" value={result.lifePath} />
                  <NumberCard label="生日數" value={result.birthdayNumber} />
                </div>
              </div>

              {/* ── Personal cycles ── */}
              <div className="num-section">
                <h3 className="num-section-title">
                  個人週期
                  <span className="num-section-sub">
                    （參考日期：{result.refYear}/{result.refMonth}/{result.refDay}）
                  </span>
                </h3>
                <div className="num-cycles-row">
                  <div className="num-cycle-box">
                    <div className="num-cycle-label">個人年數</div>
                    <div className="num-cycle-value">{result.personalYear}</div>
                    <div className="num-cycle-desc">
                      {NUMBER_MEANINGS[result.personalYear]?.name ?? ''}
                    </div>
                  </div>
                  <div className="num-cycle-box">
                    <div className="num-cycle-label">個人月數</div>
                    <div className="num-cycle-value">{result.personalMonth}</div>
                    <div className="num-cycle-desc">
                      {NUMBER_MEANINGS[result.personalMonth]?.name ?? ''}
                    </div>
                  </div>
                  <div className="num-cycle-box">
                    <div className="num-cycle-label">個人日數</div>
                    <div className="num-cycle-value">{result.personalDay}</div>
                    <div className="num-cycle-desc">
                      {NUMBER_MEANINGS[result.personalDay]?.name ?? ''}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Challenge numbers ── */}
              <ChallengesTable challenges={result.challenges} />

              {/* ── Pinnacle cycles ── */}
              <PinnaclesTable pinnacles={result.pinnacles} birthYear={result.birthYear} />
            </div>
          )}
        </div>
      )}
    </section>
  );
}
