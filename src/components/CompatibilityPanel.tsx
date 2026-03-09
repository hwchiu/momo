/**
 * CompatibilityPanel — displays overall and per-category compatibility scores.
 */

import type { CompatibilityScore } from '../types/synastry';

interface Props {
  score: CompatibilityScore;
  nameA: string;
  nameB: string;
}

interface ScoreMeterProps {
  value: number; // 0-100
  label: string;
  emoji: string;
  desc: string;
  color: string;
}

function ScoreMeter({ value, label, emoji, desc, color }: ScoreMeterProps) {
  return (
    <div className="compat-category">
      <div className="compat-cat-header">
        <span className="compat-cat-emoji">{emoji}</span>
        <span className="compat-cat-label">{label}</span>
        <span className="compat-cat-score" style={{ color }}>
          {value} 分
        </span>
      </div>
      <div className="compat-bar-bg">
        <div
          className="compat-bar-fill"
          style={{ transform: `scaleX(${value / 100})`, backgroundColor: color }}
        />
      </div>
      <div className="compat-cat-desc">{desc}</div>
    </div>
  );
}

function scoreColor(score: number): string {
  if (score >= 80) return '#1a7a1a';
  if (score >= 60) return '#2196F3';
  if (score >= 40) return '#FF9800';
  return '#c0392b';
}

// Stars display: 0-5 stars based on score
function scoreStars(score: number): string {
  const full = Math.floor(score / 20);
  const half = score % 20 >= 10 ? 1 : 0;
  return '★'.repeat(full) + (half ? '☆' : '') + '☆'.repeat(5 - full - half);
}

export function CompatibilityPanel({ score, nameA, nameB }: Props) {
  const overallColor = scoreColor(score.overall);

  return (
    <div className="compat-panel">
      {/* Overall score */}
      <div className="compat-overall">
        <div className="compat-overall-title">
          {nameA} ✦ {nameB} 相容性分析
        </div>
        <div className="compat-overall-stars" style={{ color: overallColor }}>
          {scoreStars(score.overall)}
        </div>
        <div className="compat-overall-score" style={{ color: overallColor }}>
          {score.overall} <span className="compat-overall-max">/ 100</span>
        </div>
        <div className="compat-overall-label" style={{ color: overallColor }}>
          {score.overallLabel}
        </div>
        <div className="compat-overall-desc">{score.overallDesc}</div>
      </div>

      {/* Category meters */}
      <div className="compat-categories">
        <ScoreMeter
          value={score.emotional}
          label="情感連結"
          emoji="💕"
          desc={score.emotionalDesc}
          color={scoreColor(score.emotional)}
        />
        <ScoreMeter
          value={score.communication}
          label="溝通默契"
          emoji="🗣️"
          desc={score.communicationDesc}
          color={scoreColor(score.communication)}
        />
        <ScoreMeter
          value={score.attraction}
          label="吸引力"
          emoji="🔥"
          desc={score.attractionDesc}
          color={scoreColor(score.attraction)}
        />
        <ScoreMeter
          value={score.stability}
          label="長期穩定性"
          emoji="🏗️"
          desc={score.stabilityDesc}
          color={scoreColor(score.stability)}
        />
      </div>

      <div className="compat-note">
        ※
        評分基於兩人之間的主要跨盤相位，僅供參考。占星是理解自我與關係的工具，不應作為關係決策的唯一依據。
      </div>
    </div>
  );
}
