import type {
  Palace,
  FlyingStarsChart,
  LoShuPosition,
  TwentyFourMountain,
  StarInfo,
  XuanKongInput,
} from '../types/fengshui';

// Lo Shu magic square: native star at each grid position [row][col]
// Row 0 = top (S side), Row 2 = bottom (N side)
// [row][col] position in 3x3 grid:
// [0][0]=SE=4, [0][1]=S=9,  [0][2]=SW=2
// [1][0]=E=3,  [1][1]=C=5,  [1][2]=W=7
// [2][0]=NE=8, [2][1]=N=1,  [2][2]=NW=6

// The flying sequence (順飛 forward): positions visited in Lo Shu order
// 5(C)→6(NW)→7(W)→8(NE)→9(S)→1(N)→2(SW)→3(E)→4(SE)
// Index in this sequence = 0..8

export const FLYING_SEQUENCE: LoShuPosition[] = [5, 6, 7, 8, 9, 1, 2, 3, 4];

// When center star = n, palace at FLYING_SEQUENCE[i] gets star:
// forward (順飛): ((n - 1 + i) % 9) + 1
// reverse (逆飛): ((n - 1 - i + 9 * 10) % 9) + 1

/**
 * Calculate annual center star for a given year.
 * Reference: 2024 (甲辰年) = 四綠 (star 4) entering center
 * Stars count DOWN each year: 2024→4, 2025→3, 2026→2, 2027→1, 2028→9...
 */
export function getYearCenterStar(year: number): number {
  const offset = (year - 2024) % 9;
  const result = ((4 - offset - 1 + 9 * 100) % 9) + 1;
  return result;
}

/**
 * Calculate monthly center star for a given year and month (1–12).
 *
 * The monthly star for the first month (寅月, ~Feb) of a year depends on the year center:
 *   Year center 1, 4, 7 → first month (寅) center = 8
 *   Year center 2, 5, 8 → first month center = 5
 *   Year center 3, 6, 9 → first month center = 2
 * Then each subsequent month counts DOWN by 1.
 * Note: Chinese months count from 寅月 (month 1 = Feb/Mar in solar calendar).
 * For simplicity, we use: 月1=寅(Feb), 月2=卯(Mar), ..., 月12=丑(Jan next year)
 * Map: January = month 11 of previous year's cycle, February = month 1, etc.
 */
export function getMonthCenterStar(year: number, month: number): number {
  const yearCenter = getYearCenterStar(year);
  // First month (寅月, Feb = solar month 2) center depends on year center mod 3:
  const yearMod3 = (yearCenter - 1) % 3;
  const firstMonthCenters = [8, 5, 2]; // for yearCenter mod 3 = 0, 1, 2
  const firstMonthCenter = firstMonthCenters[yearMod3];

  // Convert calendar month to 寅月-based index (0-indexed, 0=寅=Feb)
  // Feb=0, Mar=1, Apr=2, May=3, Jun=4, Jul=5, Aug=6, Sep=7, Oct=8, Nov=9, Dec=10, Jan=11
  const monthIndex = month === 1 ? 11 : month - 2;

  const result = ((firstMonthCenter - 1 - monthIndex + 9 * 100) % 9) + 1;
  return result;
}

/**
 * Generate a 9-palace flying stars chart given center star and flying direction.
 * Returns a map of {loShuPosition → star} for all 9 palaces.
 */
function flyStars(centerStar: number, forward: boolean): Map<LoShuPosition, number> {
  const map = new Map<LoShuPosition, number>();
  for (let i = 0; i < 9; i++) {
    const pos = FLYING_SEQUENCE[i];
    let star: number;
    if (forward) {
      star = ((centerStar - 1 + i) % 9) + 1;
    } else {
      star = ((centerStar - 1 - i + 9 * 100) % 9) + 1;
    }
    map.set(pos, star);
  }
  return map;
}

/**
 * Calculate the full flying stars chart.
 * Includes annual and monthly stars. Xuan Kong chart optional.
 */
export function calculateFlyingStars(
  year: number,
  month: number,
  xuanKong?: XuanKongInput,
): FlyingStarsChart {
  const yearCenter = getYearCenterStar(year);
  const monthCenter = getMonthCenterStar(year, month);

  const annualMap = flyStars(yearCenter, true);
  const monthlyMap = flyStars(monthCenter, true);

  // Xuan Kong mountain/facing stars (simplified - full implementation would use 玄空飛星盤 lookup table)
  let mountainMap: Map<LoShuPosition, number> | undefined;
  let facingMap: Map<LoShuPosition, number> | undefined;
  if (xuanKong) {
    const { mountainCenter, facingCenter, mountainForward, facingForward } =
      getXuanKongCenters(xuanKong);
    mountainMap = flyStars(mountainCenter, mountainForward);
    facingMap = flyStars(facingCenter, facingForward);
  }

  const palaces: Palace[] = FLYING_SEQUENCE.map((pos) => ({
    loShuPosition: pos,
    annualStar: annualMap.get(pos)!,
    monthlyStar: monthlyMap.get(pos)!,
    mountainStar: mountainMap?.get(pos),
    facingStar: facingMap?.get(pos),
  }));

  return { palaces, yearCenter, monthCenter };
}

// ---- Xuan Kong (玄空飛星) chart calculation ----
// This is a simplified version. Full implementation requires a lookup table of 216+ charts.
// For each of 24 mountains × 9 periods, there's a unique chart.
// Here we implement the generation algorithm.

interface XuanKongCenters {
  mountainCenter: number;
  facingCenter: number;
  mountainForward: boolean;
  facingForward: boolean;
}

// Direction of sitting (坐山) to Lo Shu position mapping
// 24 mountains grouped into 8 directions (45° each), each direction has Lo Shu number
export const MOUNTAIN_TO_LOSHU: Record<TwentyFourMountain, LoShuPosition> = {
  壬: 1,
  子: 1,
  癸: 1, // N = 1
  丑: 8,
  艮: 8,
  寅: 8, // NE = 8
  甲: 3,
  卯: 3,
  乙: 3, // E = 3
  辰: 4,
  巽: 4,
  巳: 4, // SE = 4
  丙: 9,
  午: 9,
  丁: 9, // S = 9
  未: 2,
  坤: 2,
  申: 2, // SW = 2
  庚: 7,
  酉: 7,
  辛: 7, // W = 7
  戌: 6,
  乾: 6,
  亥: 6, // NW = 6
};

// Facing direction is opposite of sitting
function getOppositeLoShu(pos: LoShuPosition): LoShuPosition {
  // Opposite pairs: 1↔9, 2↔8, 3↔7, 4↔6, 5↔5
  const opposites: Record<LoShuPosition, LoShuPosition> = {
    1: 9,
    2: 8,
    3: 7,
    4: 6,
    5: 5,
    6: 4,
    7: 3,
    8: 2,
    9: 1,
  };
  return opposites[pos];
}

/**
 * Determine Xuan Kong center stars and flying directions.
 *
 * Algorithm (simplified Xuan Kong Da Gua / Fei Xing):
 * 1. Mountain star for the center = period star (元運數)
 * 2. The mountain star's flying direction depends on whether sitting mountain
 *    belongs to yin or yang category
 * 3. Facing star for center = period star (same as mountain)
 * 4. Facing star direction is opposite of mountain
 *
 * NOTE: This is a simplified model. A complete implementation requires
 * consulting full 玄空飛星 charts or implementing the full Wang Fang algorithm.
 * The center stars for mountain and facing in Xuan Kong are both the period number.
 */
function getXuanKongCenters(input: XuanKongInput): XuanKongCenters {
  const { period, facing } = input;

  // Both mountain star and facing star center = period number
  const mountainCenter: number = period;
  const facingCenter: number = period;

  // Determine flying direction based on facing mountain category
  // Yang mountains (陽山): 壬子癸, 甲卯乙, 丙午丁, 庚酉辛 → mountain flies forward (順)
  // Yin mountains (陰山): 丑艮寅, 辰巽巳, 未坤申, 戌乾亥 → mountain flies reverse (逆)
  const yangMountains = new Set<TwentyFourMountain>([
    '壬',
    '子',
    '癸',
    '甲',
    '卯',
    '乙',
    '丙',
    '午',
    '丁',
    '庚',
    '酉',
    '辛',
  ]);

  const facingLoShu = MOUNTAIN_TO_LOSHU[facing];
  const sittingLoShu = getOppositeLoShu(facingLoShu);

  // Determine if this is an "up the mountain, down the river" (上山下水) situation
  // For simplicity: use basic yin/yang of the facing mountain to determine direction
  const isYangFacing = yangMountains.has(facing);

  // Mountain star flies: forward if yang sitting, reverse if yin sitting
  // (This is a simplification; full calculation also considers period and palace relationship)
  const sittingMountains = Object.entries(MOUNTAIN_TO_LOSHU)
    .filter(([, v]) => v === sittingLoShu)
    .map(([k]) => k as TwentyFourMountain);
  const isYangSitting = sittingMountains.some((m) => yangMountains.has(m));

  return {
    mountainCenter,
    facingCenter,
    mountainForward: isYangSitting,
    facingForward: isYangFacing,
  };
}

// ---- Star display information ----
export const STAR_INFO: Record<number, StarInfo> = {
  1: {
    number: 1,
    name: '一白水星',
    element: '水',
    trigram: '坎',
    quality: 'auspicious',
    description: '主桃花文昌，利升學求職，水旺則吉',
    color: '#4a90d9',
  },
  2: {
    number: 2,
    name: '二黑土星',
    element: '土',
    trigram: '坤',
    quality: 'inauspicious',
    description: '病符星，主疾病纏身，尤忌入中宮或飛到主臥',
    color: '#8b4513',
  },
  3: {
    number: 3,
    name: '三碧木星',
    element: '木',
    trigram: '震',
    quality: 'inauspicious',
    description: '是非星，主口舌爭訟，易起紛爭',
    color: '#2d8a2d',
  },
  4: {
    number: 4,
    name: '四綠木星',
    element: '木',
    trigram: '巽',
    quality: 'auspicious',
    description: '文昌星，利讀書學習，主才藝與感情',
    color: '#5cb85c',
  },
  5: {
    number: 5,
    name: '五黃土星',
    element: '土',
    trigram: '無',
    quality: 'inauspicious',
    description: '廉貞星，最凶，主大病、官非、破財，切勿動土',
    color: '#ffd700',
  },
  6: {
    number: 6,
    name: '六白金星',
    element: '金',
    trigram: '乾',
    quality: 'auspicious',
    description: '武曲星，主偏財貴人，利武職，男性運佳',
    color: '#c0c0c0',
  },
  7: {
    number: 7,
    name: '七赤金星',
    element: '金',
    trigram: '兌',
    quality: 'inauspicious',
    description: '破軍星，主口舌、小人、火災與盜竊',
    color: '#cd5c5c',
  },
  8: {
    number: 8,
    name: '八白土星',
    element: '土',
    trigram: '艮',
    quality: 'auspicious',
    description: '財星，當運最旺，主財富、健康與子嗣',
    color: '#f5f5dc',
  },
  9: {
    number: 9,
    name: '九紫火星',
    element: '火',
    trigram: '離',
    quality: 'auspicious',
    description: '喜慶星，主婚嫁喜事，九運最旺，利名聲與人緣',
    color: '#e75480',
  },
};

// Direction labels for 9 Lo Shu positions
export const LOSHU_DIRECTION: Record<LoShuPosition, string> = {
  1: '北',
  2: '西南',
  3: '東',
  4: '東南',
  5: '中',
  6: '西北',
  7: '西',
  8: '東北',
  9: '南',
};

// Grid layout: [row][col] → Lo Shu position
// Top = South (facing), Bottom = North (sitting)
export const GRID_LAYOUT: LoShuPosition[][] = [
  [4, 9, 2], // top row: SE, S, SW
  [3, 5, 7], // middle row: E, Center, W
  [8, 1, 6], // bottom row: NE, N, NW
];
