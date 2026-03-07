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

/** Ten God relationship between a stem and the day master */
export type TenGod =
  | '比肩'
  | '劫財'
  | '食神'
  | '傷官'
  | '偏財'
  | '正財'
  | '七殺'
  | '正官'
  | '偏印'
  | '正印';

/** Interaction between earthly branches */
export type InteractionType = '六合' | '三合' | '六沖' | '三刑' | '六破' | '六害';

export interface BranchInteraction {
  type: InteractionType;
  branches: number[]; // branch indices involved
  pillars: string[]; // pillar names e.g. ['年', '月']
  result?: string; // for 合: resulting element
}

/** Day master strength analysis result */
export interface DayMasterAnalysis {
  score: number;
  strength: '旺' | '中和' | '弱';
  favorableElement: string;
  avoidElement: string;
  description: string;
}

/** Feng shui Kua (命卦) info */
export interface KuaDirection {
  type: '生氣' | '天醫' | '延年' | '伏位' | '禍害' | '六煞' | '五鬼' | '絕命';
  direction: string;
  auspicious: boolean;
}

export interface KuaInfo {
  kua: number;
  name: string;
  group: '東四命' | '西四命';
  directions: KuaDirection[];
}

/** Annual flying star grid */
export interface FlyingStarPalace {
  direction: string;
  dirShort: string;
  star: number;
  starName: string;
  quality: '大吉' | '吉' | '凶' | '大凶';
}

export interface FlyingStarGrid {
  year: number;
  centerStar: number;
  palaces: FlyingStarPalace[]; // 9 palaces in display order (SE,S,SW,E,C,W,NE,N,NW)
}

/** One day's ganzhi info for date selection */
export interface DayInfo {
  dateStr: string; // YYYY-MM-DD
  day: number;
  dayPillar: Pillar;
  clash: boolean;
  clashWith?: string; // branch name that this day clashes with
  officer: string; // 十二建星
  note: string; // brief recommendation
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

/**
 * Hidden heavenly stems for each earthly branch (藏干).
 * Each sub-array: [main stem (本氣), middle stem (中氣)?, residual stem (餘氣)?]
 */
export const BRANCH_HIDDEN_STEMS: number[][] = [
  [9], // 子 → 癸
  [5, 9, 7], // 丑 → 己癸辛
  [0, 2, 4], // 寅 → 甲丙戊
  [1], // 卯 → 乙
  [4, 1, 9], // 辰 → 戊乙癸
  [2, 6, 4], // 巳 → 丙庚戊
  [3, 5], // 午 → 丁己
  [5, 3, 1], // 未 → 己丁乙
  [6, 8, 4], // 申 → 庚壬戊
  [7], // 酉 → 辛
  [4, 3, 7], // 戌 → 戊丁辛
  [8, 0], // 亥 → 壬甲
];

/** Flying star names 1-9 */
export const STAR_NAMES = [
  '', // placeholder for index 0
  '一白水星',
  '二黑土星',
  '三碧木星',
  '四綠木星',
  '五黃土星',
  '六白金星',
  '七赤金星',
  '八白土星',
  '九紫火星',
];

/** Flying star quality 1-9 */
export const STAR_QUALITY: ('大吉' | '吉' | '凶' | '大凶')[] = [
  '大吉', // placeholder
  '吉', // 1
  '凶', // 2
  '凶', // 3
  '吉', // 4
  '大凶', // 5
  '吉', // 6
  '凶', // 7
  '大吉', // 8
  '吉', // 9
];

/**
 * Eight Mansion directions for each Kua number.
 * Keys: 1,2,3,4,6,7,8,9 (Kua 5 maps to 2 for male, 8 for female).
 * Order: [生氣, 天醫, 延年, 伏位, 禍害, 六煞, 五鬼, 絕命]
 */
export const KUA_DIRECTIONS: Record<number, string[]> = {
  1: ['東南', '東', '南', '北', '西', '東北', '西北', '西南'],
  2: ['東北', '西', '西北', '西南', '東', '東南', '北', '南'],
  3: ['南', '北', '東南', '東', '西南', '西北', '東北', '西'],
  4: ['北', '南', '東', '東南', '西北', '西南', '西', '東北'],
  6: ['西', '東北', '西南', '西北', '東南', '東', '南', '北'],
  7: ['西北', '西南', '東北', '西', '北', '南', '東南', '東'],
  8: ['西南', '西北', '西', '東北', '南', '北', '東', '東南'],
  9: ['東', '東南', '北', '南', '東北', '西', '西南', '西北'],
};

export const KUA_NAMES: Record<number, string> = {
  1: '坎',
  2: '坤',
  3: '震',
  4: '巽',
  6: '乾',
  7: '兌',
  8: '艮',
  9: '離',
};

/** 十二建星 (Twelve Officers) names */
export const TWELVE_OFFICERS = [
  '建', '除', '滿', '平', '定', '執', '破', '危', '成', '收', '開', '閉',
];
