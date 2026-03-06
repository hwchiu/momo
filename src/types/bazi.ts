/** Heavenly Stem + Earthly Branch pair (a Chinese calendar "pillar") */
export interface Pillar {
  stem: number; // 0-9 天干
  branch: number; // 0-11 地支
}

/** One of the 8 luck cycles (大運) */
export interface LuckCycle {
  index: number;
  pillar: Pillar;
  startAge: number;
  startYear: number;
}

/** User input for bazi calculation */
export interface BaziInput {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hour: number; // 0-23
  minute: number; // 0-59
  gender: 'male' | 'female';
}

/** Complete bazi chart result */
export interface BaziChart {
  input: BaziInput;
  yearPillar: Pillar;
  monthPillar: Pillar;
  dayPillar: Pillar;
  hourPillar: Pillar;
  isForward: boolean;
  luckStartYears: number;
  luckStartMonths: number;
  luckCycles: LuckCycle[];
}

// ---- Display constants ----

export const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
export const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

/** Wu-xing element for each Heavenly Stem (index 0-9) */
export const STEM_ELEMENTS = ['木', '木', '火', '火', '土', '土', '金', '金', '水', '水'];

/** Wu-xing element for each Earthly Branch (index 0-11) */
export const BRANCH_ELEMENTS = ['水', '土', '木', '木', '土', '火', '火', '土', '金', '金', '土', '水'];

/** Yin/Yang polarity for each Heavenly Stem */
export const STEM_YIN_YANG = ['陽', '陰', '陽', '陰', '陽', '陰', '陽', '陰', '陽', '陰'];

/** Display color for each Wu-xing element */
export const ELEMENT_COLORS: Record<string, string> = {
  木: '#1a7a1a',
  火: '#C0392B',
  土: '#8B6914',
  金: '#7B6F00',
  水: '#1A5CA8',
};
