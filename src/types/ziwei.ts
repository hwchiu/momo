/**
 * 紫微斗數 (Zi Wei Dou Shu) — Purple Star Astrology types and constants.
 */

// ---- Five Element Patterns (五行局) ----

/** 五行局 number (determines pace of Purple Star placement) */
export type ZiWeiJu = 2 | 3 | 4 | 5 | 6;

export const JU_NAMES: Record<ZiWeiJu, string> = {
  2: '水二局',
  3: '木三局',
  4: '金四局',
  5: '土五局',
  6: '火六局',
};

// ---- Stars ----

/** Main stars (主星) of 紫微斗數 */
export const ZIWEI_MAIN_STARS = [
  '紫微',
  '天機',
  '太陽',
  '武曲',
  '天同',
  '廉貞',
  '天府',
  '太陰',
  '貪狼',
  '巨門',
  '天相',
  '天梁',
  '七殺',
  '破軍',
] as const;

export type ZiWeiMainStar = (typeof ZIWEI_MAIN_STARS)[number];

/** Brightness of main stars in each palace (0=陷, 1=平, 2=得, 3=旺, 4=廟) */
export type StarBrightness = '廟' | '旺' | '得' | '平' | '陷' | '';

/** Auxiliary stars (輔星) in the fixed sky positions */
export const ZIWEI_AUX_STARS = [
  // 六吉星
  '文昌',
  '文曲',
  '左輔',
  '右弼',
  '天魁',
  '天鉞',
  // 六煞星
  '擎羊',
  '陀羅',
  '火星',
  '鈴星',
  '地空',
  '地劫',
  // Other common stars
  '祿存',
  '天馬',
] as const;

export type ZiWeiAuxStar = (typeof ZIWEI_AUX_STARS)[number];

// ---- Palaces ----

/** The 12 palaces of 紫微斗數 */
export const ZIWEI_PALACE_NAMES = [
  '命宮',
  '兄弟',
  '夫妻',
  '子女',
  '財帛',
  '疾厄',
  '遷移',
  '奴僕',
  '官祿',
  '田宅',
  '福德',
  '父母',
] as const;

export type ZiWeiPalaceName = (typeof ZIWEI_PALACE_NAMES)[number];

/** One palace in the 紫微斗數 chart */
export interface ZiWeiPalace {
  /** Palace index 0–11, starting from 命宮 */
  idx: number;
  /** Branch of this palace (子=0, 丑=1, 寅=2, ..., 亥=11) */
  branch: number;
  branchName: string;
  /** Stem of this palace (from the 宮干 formula) */
  stem: string;
  /** Palace name (命宮, 兄弟, ...) — may differ from the fixed by the ascendant */
  palaceName: ZiWeiPalaceName;
  /** Main stars in this palace */
  mainStars: { name: ZiWeiMainStar; brightness: StarBrightness }[];
  /** Auxiliary stars in this palace */
  auxStars: ZiWeiAuxStar[];
}

/** Complete 紫微斗數 chart */
export interface ZiWeiChart {
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  birthHour: number;
  gender: 'male' | 'female';
  /** 農曆 month (1–12) */
  lunarMonth: number;
  lunarDay: number;
  isLeapMonth: boolean;
  ju: ZiWeiJu;
  juName: string;
  /** Branch of 命宮 (子=0 … 亥=11) */
  mingGongBranch: number;
  /** Branch of 紫微星 (子=0 … 亥=11) */
  ziWeiBranch: number;
  /** Branch of 天府星 */
  tianFuBranch: number;
  /** Year stem for palace stems */
  yearStem: string;
  /** Year branch */
  yearBranch: string;
  /** Hour branch */
  hourBranch: string;
  /** 12 palaces, index 0 = 命宮 palace, going counter-clockwise (寅→卯→辰→...) */
  palaces: ZiWeiPalace[];
}

// ---- Display constants ----

export const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
export const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];

/** Star quality color categories */
export const STAR_CATEGORY: Partial<Record<ZiWeiMainStar, 'ji' | 'xiong' | 'neutral'>> = {
  紫微: 'ji',
  天機: 'neutral',
  太陽: 'ji',
  武曲: 'ji',
  天同: 'ji',
  廉貞: 'neutral',
  天府: 'ji',
  太陰: 'ji',
  貪狼: 'neutral',
  巨門: 'xiong',
  天相: 'ji',
  天梁: 'ji',
  七殺: 'neutral',
  破軍: 'xiong',
};

/** Nayin (納音) five-element lookup for 60 ganzhi → element */
export const NAYIN_ELEMENT: string[] = [
  '金',
  '金',
  '火',
  '火',
  '木',
  '木',
  '水',
  '水',
  '土',
  '土', // 甲子–癸酉
  '土',
  '土',
  '金',
  '金',
  '火',
  '火',
  '木',
  '木',
  '水',
  '水', // 甲戌–癸未
  '土',
  '土',
  '金',
  '金',
  '火',
  '火',
  '木',
  '木',
  '水',
  '水', // 甲申–癸巳
  '土',
  '土',
  '金',
  '金',
  '火',
  '火',
  '木',
  '木',
  '水',
  '水', // 甲午–癸卯
  '土',
  '土',
  '金',
  '金',
  '火',
  '火',
  '木',
  '木',
  '水',
  '水', // 甲辰–癸丑
  '土',
  '土',
  '金',
  '金',
  '火',
  '火',
  '木',
  '木',
  '水',
  '水', // 甲寅–癸亥
];

/** Five-element → 五行局 number */
export const ELEMENT_TO_JU: Record<string, ZiWeiJu> = {
  水: 2,
  木: 3,
  金: 4,
  土: 5,
  火: 6,
};

// ---- Palace grid layout for UI ----
// Traditional 紫微斗數 chart layout (clockwise, starting from 寅位 at bottom-left):
// Outer ring goes: 寅 卯 辰 巳 午 未 申 酉 戌 亥 子 丑 (clockwise)
// Display as 4×4 grid with corners empty:
//   [丑] [子] [亥] [戌]
//   [寅]  --   --  [酉]
//   [卯]  --   --  [申]
//   [辰] [巳] [午] [未]

export const GRID_POSITIONS: Record<number, [number, number]> = {
  // branch → [row, col] in 4×4 grid (0-indexed)
  2: [3, 0], // 寅
  3: [2, 0], // 卯
  4: [1, 0], // 辰
  5: [3, 1], // 巳
  6: [3, 2], // 午
  7: [3, 3], // 未
  8: [2, 3], // 申
  9: [1, 3], // 酉
  10: [0, 3], // 戌
  11: [0, 2], // 亥
  0: [0, 1], // 子
  1: [0, 0], // 丑
};
