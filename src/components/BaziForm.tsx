import { useState } from 'react';
import type { BaziInput } from '../types/bazi';
import { BRANCHES } from '../types/bazi';

interface BaziFormProps {
  onSubmit: (input: BaziInput) => void;
  isLoading?: boolean;
}

function getToday() {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}

function getShichen(hour: number): string {
  return BRANCHES[Math.floor((hour + 1) / 2) % 12] + '時';
}

const YEARS = Array.from({ length: 181 }, (_, i) => 1920 + i); // 1920-2100
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

export function BaziForm({ onSubmit, isLoading = false }: BaziFormProps) {
  const today = getToday();
  const [year, setYear] = useState(today.year);
  const [month, setMonth] = useState(today.month);
  const [day, setDay] = useState(today.day);
  const [hour, setHour] = useState(12);
  const [minute, setMinute] = useState(0);
  const [gender, setGender] = useState<'male' | 'female'>('male');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ year, month, day, hour, minute, gender });
  };

  return (
    <form className="quick-chart-form" onSubmit={handleSubmit}>
      <table className="form-table" cellPadding={3} cellSpacing={0}>
        <tbody>
          <tr>
            <td className="form-label">年</td>
            <td>
              <select
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value, 10))}
                className="form-select"
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y} 年
                  </option>
                ))}
              </select>
            </td>
          </tr>
          <tr>
            <td className="form-label">月</td>
            <td>
              <select
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value, 10))}
                className="form-select"
              >
                {MONTHS.map((m) => (
                  <option key={m} value={m}>
                    {m} 月
                  </option>
                ))}
              </select>
            </td>
          </tr>
          <tr>
            <td className="form-label">日</td>
            <td>
              <select
                value={day}
                onChange={(e) => setDay(parseInt(e.target.value, 10))}
                className="form-select"
              >
                {DAYS.map((d) => (
                  <option key={d} value={d}>
                    {d} 日
                  </option>
                ))}
              </select>
            </td>
          </tr>
          <tr>
            <td className="form-label">時</td>
            <td>
              <select
                value={hour}
                onChange={(e) => setHour(parseInt(e.target.value, 10))}
                className="form-select"
              >
                {HOURS.map((h) => (
                  <option key={h} value={h}>
                    {h} 時（{getShichen(h)}）
                  </option>
                ))}
              </select>
            </td>
          </tr>
          <tr>
            <td className="form-label">分</td>
            <td>
              <select
                value={minute}
                onChange={(e) => setMinute(parseInt(e.target.value, 10))}
                className="form-select"
              >
                {MINUTES.map((m) => (
                  <option key={m} value={m}>
                    {m} 分
                  </option>
                ))}
              </select>
            </td>
          </tr>
          <tr>
            <td className="form-label">性別</td>
            <td>
              <label style={{ marginRight: '12px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="gender"
                  value="male"
                  checked={gender === 'male'}
                  onChange={() => setGender('male')}
                  style={{ marginRight: '4px' }}
                />
                男
              </label>
              <label style={{ cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="gender"
                  value="female"
                  checked={gender === 'female'}
                  onChange={() => setGender('female')}
                  style={{ marginRight: '4px' }}
                />
                女
              </label>
            </td>
          </tr>
          <tr>
            <td colSpan={2} className="form-submit-cell">
              <button type="submit" className="submit-btn" disabled={isLoading}>
                {isLoading ? '計算中...' : '排八字'}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </form>
  );
}
