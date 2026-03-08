import { useState } from 'react';
import type { BaziInput } from '../types/bazi';
import { BRANCHES } from '../types/bazi';

interface BaziFormProps {
  onSubmit: (input: BaziInput) => void;
  isLoading?: boolean;
}

function getToday() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getShichen(hour: number): string {
  return BRANCHES[Math.floor((hour + 1) / 2) % 12] + '時';
}

export function BaziForm({ onSubmit, isLoading = false }: BaziFormProps) {
  const [dateStr, setDateStr] = useState(getToday);
  const [timeStr, setTimeStr] = useState('12:00');
  const [gender, setGender] = useState<'male' | 'female'>('male');

  const currentHour = parseInt(timeStr.split(':')[0], 10) || 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const [yearStr, monthStr, dayStr] = dateStr.split('-');
    const [hourStr, minuteStr] = timeStr.split(':');
    onSubmit({
      year: parseInt(yearStr, 10),
      month: parseInt(monthStr, 10),
      day: parseInt(dayStr, 10),
      hour: parseInt(hourStr, 10),
      minute: parseInt(minuteStr, 10),
      gender,
    });
  };

  return (
    <form className="quick-chart-form" onSubmit={handleSubmit}>
      <table className="form-table" cellPadding={3} cellSpacing={0}>
        <tbody>
          <tr>
            <td className="form-label">日期</td>
            <td>
              <input
                type="date"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className="form-input"
              />
            </td>
          </tr>
          <tr>
            <td className="form-label">時間</td>
            <td>
              <input
                type="time"
                value={timeStr}
                onChange={(e) => setTimeStr(e.target.value)}
                className="form-input"
              />
              <span className="form-hint">（{getShichen(currentHour)}，地方時）</span>
            </td>
          </tr>
          <tr>
            <td className="form-label">性別</td>
            <td>
              <div className="radio-group">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="gender"
                    value="male"
                    checked={gender === 'male'}
                    onChange={() => setGender('male')}
                  />
                  男
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="gender"
                    value="female"
                    checked={gender === 'female'}
                    onChange={() => setGender('female')}
                  />
                  女
                </label>
              </div>
            </td>
          </tr>
          <tr>
            <td colSpan={2} className="form-submit-cell">
              <button type="submit" className="submit-btn" disabled={isLoading}>
                {isLoading ? '✦ 推算中⋯' : '✦ 排八字'}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </form>
  );
}
