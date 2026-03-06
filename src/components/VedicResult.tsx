import { useState } from 'react';
import type { VedicChart } from '../types/vedic';
import { SouthIndianChart } from './SouthIndianChart';
import { VedicPlanetTable } from './VedicPlanetTable';
import { VedicDasha } from './VedicDasha';

interface VedicResultProps {
  chart: VedicChart;
}

type ResultTab = 'chart' | 'planets' | 'dasha';

export function VedicResult({ chart }: VedicResultProps) {
  const [tab, setTab] = useState<ResultTab>('chart');
  const { input, lagnaRashi } = chart;

  const RASHI_NAMES = [
    'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
  ];
  const RASHI_ZH = [
    '牡羊', '金牛', '雙子', '巨蟹', '獅子', '處女',
    '天秤', '天蠍', '射手', '摩羯', '水瓶', '雙魚',
  ];

  return (
    <div className="vedic-result">
      {/* Result header */}
      <div className="vedic-result-header">
        <span className="vedic-result-title">
          {input.locationName} &mdash;{' '}
          {input.year}/{String(input.month).padStart(2, '0')}/{String(input.day).padStart(2, '0')}
        </span>
        <span className="vedic-lagna-badge">
          Lagna: {RASHI_ZH[lagnaRashi]} ({RASHI_NAMES[lagnaRashi]})
        </span>
      </div>

      {/* Sub-tabs */}
      <div className="vedic-subtab-nav">
        <button
          className={`vedic-subtab-btn${tab === 'chart' ? ' active' : ''}`}
          onClick={() => setTab('chart')}
        >
          星盤圖
        </button>
        <button
          className={`vedic-subtab-btn${tab === 'planets' ? ' active' : ''}`}
          onClick={() => setTab('planets')}
        >
          行星位置
        </button>
        <button
          className={`vedic-subtab-btn${tab === 'dasha' ? ' active' : ''}`}
          onClick={() => setTab('dasha')}
        >
          大運（Dasha）
        </button>
      </div>

      {/* Tab content */}
      <div className="vedic-subtab-content">
        {tab === 'chart' && <SouthIndianChart chart={chart} />}
        {tab === 'planets' && <VedicPlanetTable chart={chart} />}
        {tab === 'dasha' && <VedicDasha chart={chart} />}
      </div>
    </div>
  );
}
