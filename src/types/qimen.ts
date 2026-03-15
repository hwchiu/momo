/** Qi Men Dun Jia (奇門遁甲) types and display constants */

export type QiMenDun = '陽遁' | '陰遁';

/** One of the 9 palaces in the Lo Shu grid */
export interface QiMenPalace {
  palace: number; // 1–9 (Lo Shu number)
  gua: string; // 八卦 name (坎坤震巽中乾兌艮離)
  direction: string; // full direction label
  dirShort: string; // short direction
  earthStem: string; // 地盤天干
  heavenStem: string; // 天盤天干
  star: string; // 天盤九星 name
  door: string | null; // 八門 (null for center palace 5)
  deity: string | null; // 八神 (null for center palace 5)
  isDutyStar: boolean; // 值符星所在宮
  isDutyDoor: boolean; // 值使門所在宮
  isCenter: boolean;
}

/** Ganzhi pillar (干支 pair) */
export interface QiMenPillar {
  stem: string; // 天干
  branch: string; // 地支
  full: string; // e.g. '甲子'
}

/** Complete Qi Men Dun Jia time chart */
export interface QiMenChart {
  datetime: {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
  };
  dun: QiMenDun;
  ju: number; // 1–9
  yuan: '上元' | '中元' | '下元';
  solarTermName: string; // e.g. '驚蟄'
  pillarYear: QiMenPillar;
  pillarMonth: QiMenPillar;
  pillarDay: QiMenPillar;
  pillarHour: QiMenPillar;
  xunShou: string; // 旬首 e.g. '甲子'
  dutyStar: string; // 值符星名 e.g. '天蓬'
  dutyDoor: string; // 值使門名 e.g. '休門'
  dutyStarPalace: number; // palace (1–9) where 值符星 currently resides
  dutyDoorPalace: number; // palace (1–9) where 值使門 currently resides
  palaces: QiMenPalace[]; // 9 entries, palace index = palace - 1
}

// ---- Display constants ----

/** Nine stars in Lo Shu order (index = palace number) */
export const QIMEN_STARS: Record<number, string> = {
  1: '天蓬',
  2: '天芮',
  3: '天沖',
  4: '天輔',
  5: '天禽',
  6: '天心',
  7: '天柱',
  8: '天任',
  9: '天英',
};

/** Eight doors indexed by palace number (5 = null) */
export const QIMEN_DOORS: Record<number, string | null> = {
  1: '休門',
  2: '死門',
  3: '傷門',
  4: '杜門',
  5: null,
  6: '開門',
  7: '驚門',
  8: '生門',
  9: '景門',
};

/** Eight deities sequence for 陽遁 (starting from 值符宮) */
export const DEITIES_YANG = ['值符', '螣蛇', '太陰', '六合', '白虎', '玄武', '九地', '九天'];

/** Eight deities sequence for 陰遁 */
export const DEITIES_YIN = ['值符', '螣蛇', '太陰', '六合', '勾陳', '玄武', '九地', '九天'];

/** Star quality ratings */
export const STAR_QUALITY: Record<string, string> = {
  天蓬: '凶',
  天芮: '大凶',
  天沖: '吉',
  天輔: '大吉',
  天禽: '吉',
  天心: '大吉',
  天柱: '凶',
  天任: '吉',
  天英: '吉',
};

/** Door quality ratings */
export const DOOR_QUALITY: Record<string, string> = {
  休門: '吉',
  死門: '大凶',
  傷門: '凶',
  杜門: '凶',
  開門: '大吉',
  驚門: '凶',
  生門: '大吉',
  景門: '吉',
};

/** Palace metadata indexed by palace number (1–9) */
export const PALACE_META: Record<number, { gua: string; direction: string; dirShort: string }> = {
  1: { gua: '坎', direction: '正北', dirShort: '北' },
  2: { gua: '坤', direction: '西南', dirShort: '西南' },
  3: { gua: '震', direction: '正東', dirShort: '東' },
  4: { gua: '巽', direction: '東南', dirShort: '東南' },
  5: { gua: '中', direction: '中宮', dirShort: '中' },
  6: { gua: '乾', direction: '西北', dirShort: '西北' },
  7: { gua: '兌', direction: '正西', dirShort: '西' },
  8: { gua: '艮', direction: '東北', dirShort: '東北' },
  9: { gua: '離', direction: '正南', dirShort: '南' },
};

/** 24 solar terms in order starting from 冬至 (index 0) */
export const SOLAR_TERM_NAMES = [
  '冬至',
  '小寒',
  '大寒',
  '立春',
  '雨水',
  '驚蟄',
  '春分',
  '清明',
  '穀雨',
  '立夏',
  '小滿',
  '芒種',
  '夏至',
  '小暑',
  '大暑',
  '立秋',
  '處暑',
  '白露',
  '秋分',
  '寒露',
  '霜降',
  '立冬',
  '小雪',
  '大雪',
];

/** Ju table for 陽遁 solar terms 0–11 (冬至→芒種): [上元, 中元, 下元] */
export const YANG_JU_TABLE: [number, number, number][] = [
  [1, 7, 4], // 冬至
  [2, 8, 5], // 小寒
  [3, 9, 6], // 大寒
  [8, 5, 2], // 立春
  [9, 6, 3], // 雨水
  [7, 4, 1], // 驚蟄
  [4, 1, 7], // 春分
  [5, 2, 8], // 清明
  [6, 3, 9], // 穀雨
  [2, 8, 5], // 立夏
  [3, 9, 6], // 小滿
  [1, 7, 4], // 芒種
];

/** Ju table for 陰遁 solar terms 12–23 (夏至→大雪): [上元, 中元, 下元] */
export const YIN_JU_TABLE: [number, number, number][] = [
  [9, 3, 6], // 夏至
  [8, 2, 5], // 小暑
  [7, 1, 4], // 大暑
  [2, 5, 8], // 立秋
  [1, 4, 7], // 處暑
  [3, 6, 9], // 白露
  [6, 9, 3], // 秋分
  [5, 8, 2], // 寒露
  [4, 7, 1], // 霜降
  [8, 2, 5], // 立冬
  [9, 3, 6], // 小雪
  [7, 1, 4], // 大雪
];
