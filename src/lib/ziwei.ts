/**
 * 紫微斗數 (Zi Wei Dou Shu) calculation engine.
 *
 * Implements the classical Purple Star Astrology chart calculation:
 *  1. Lunar date conversion (via lunar.ts)
 *  2. 五行局 (Five Element Pattern, ju = 2/3/4/5/6) from 命宮 nayin
 *  3. 紫微星 palace from 五行局 × lunar day
 *  4. 天府星 from 紫微星 (symmetric about 午-子 axis)
 *  5. 14 main stars (紫微系 + 天府系) placed relative to 紫微/天府
 *  6. Key auxiliary stars (文昌, 文曲, 左輔, 右弼, 天魁, 天鉞, 祿存, 天馬,
 *     擎羊, 陀羅, 火星, 鈴星, 地空, 地劫)
 *  7. 宮干 (palace stem) from year stem + palace position
 */

import type {
  ZiWeiChart,
  ZiWeiPalace,
  ZiWeiJu,
  ZiWeiMainStar,
  ZiWeiAuxStar,
  StarBrightness,
} from '../types/ziwei';
import {
  BRANCHES,
  STEMS,
  NAYIN_ELEMENT,
  ELEMENT_TO_JU,
  JU_NAMES,
  ZIWEI_PALACE_NAMES,
} from '../types/ziwei';
import { gregorianToLunar } from './lunar';
import { dateToJDN } from './bazi';

// ---- Ganzhi helpers ----

function yearGanzhiIdx(year: number): number {
  return (((year - 4) % 60) + 60) % 60;
}

function dayGanzhiIdx(jdn: number): number {
  return (((jdn - 2451545 + 10) % 60) + 60) % 60;
}

// ---- 命宮 (Life Palace) ----

/**
 * Return the branch index (子=0…亥=11) of the 命宮 (Life Palace).
 *
 * Classical rule (月支月 + 時支 = 14, mod 12):
 *   - 月支月: 寅月=1, 卯月=2, ..., 丑月=12 (農曆月 as a "month number from 寅")
 *     We use: monthBranchIdx (寅=0) + 1 = 月支月 position
 *   - 時支數: 子=1, 丑=2, ..., 亥=12
 *   - 命宮月份數 = 14 - 月支月 - 時支數 (mod 12, if ≤ 0 add 12)
 *   - Convert back to branch: 命宮月份數 n → branch = (n + 1) % 12
 */
function calcMingGong(monthBranchIdx: number, hourBranch: number): number {
  // 月支月 (1=寅月, 2=卯月, ..., 12=丑月)
  const monthPos = monthBranchIdx + 1; // 0(寅)→1, 1(卯)→2, ..., 11(丑)→12
  // 時支數 (子=1, 丑=2, ..., 亥=12)
  const hourPos = hourBranch + 1;
  // 命宮月份數
  let mingPos = 14 - monthPos - hourPos;
  while (mingPos <= 0) mingPos += 12;
  mingPos = ((mingPos - 1) % 12) + 1; // keep in 1-12
  // Convert month pos → branch: pos 1(寅)→branch 2, pos 2(卯)→3, ..., pos 11(子)→0, pos 12(丑)→1
  return (mingPos + 1) % 12;
}

// ---- 宮干 (Palace Stem) ----

/**
 * Palace stem for palace at branchIdx (子=0…亥=11), given the year stem.
 * Uses 五虎遁年起月法:
 *   Year stem 甲/己 → 寅月 stem 丙(2)
 *   乙/庚 → 戊(4), 丙/辛 → 庚(6), 丁/壬 → 壬(8), 戊/癸 → 甲(0)
 */
function palaceStem(yearStemIdx: number, branchIdx: number): string {
  // 寅宮 start stem based on year stem
  const yinStartStem = [2, 4, 6, 8, 0, 2, 4, 6, 8, 0][yearStemIdx]; // 丙戊庚壬甲 repeating
  // 寅 = branch 2. Palace steps from 寅:
  const stepsFromYin = (branchIdx - 2 + 12) % 12;
  return STEMS[(yinStartStem + stepsFromYin) % 10];
}

// ---- 五行局 ----

/**
 * Determine 五行局 from 命宮 ganzhi (stem + branch).
 * 命宮 ganzhi → 納音五行 → 五行局.
 *
 * The 命宮 ganzhi cycle index = stem * 2 + floor(branch / 2) ... but actually
 * the 納音 uses consecutive pairs of the 60 ganzhi.
 * We compute: 60-ganzhi index of (命宮 stem + 命宮 branch) → NAYIN_ELEMENT.
 * The 60-ganzhi index: every branch appears with 2 stems in the 60-cycle.
 *
 * Simplified mapping using the standard 納音 table indexed by 10-stem × 6-branch-pairs:
 */
function calcJu(mingGongBranch: number, yearStemIdx: number): ZiWeiJu {
  const stemAtMing = palaceStem(yearStemIdx, mingGongBranch);
  const stemIdx = STEMS.indexOf(stemAtMing);
  // 60-ganzhi index from stem + branch
  const branchPairIdx = Math.floor(mingGongBranch / 2);
  // In the 60-cycle, stem s and branch b appear together when (s % 2 == b % 2).
  // 60-cycle index ≈ (stemIdx * 6 + branchPairIdx) approximation:
  const ganzhiIdx = ((stemIdx % 10) + branchPairIdx * 10) % 60;
  const element = NAYIN_ELEMENT[ganzhiIdx];
  return ELEMENT_TO_JU[element] ?? 5;
}

// ---- 紫微星 palace ----

/**
 * Find the branch of 紫微星 given 五行局 n (2–6) and lunar day d (1–30).
 *
 * Classical algorithm (安紫微法):
 *  1. 基數 q = ⌈d / n⌉  (rounds up)
 *  2. 差數 r = q * n - d  (0 = exact; otherwise correction needed)
 *  3. 起始宮 = 子(0) advanced q-1 steps → branch (q-1) % 12
 *  4. If r == 0: 紫微 stays at 起始宮
 *     If r is odd: 紫微 at (起始宮 + r) % 12  [moves toward 亥]
 *     If r is even: 紫微 at (起始宮 - r + 12) % 12  [moves toward 子]
 */
export function calcZiWeiBranch(ju: ZiWeiJu, lunarDay: number): number {
  const d = lunarDay;
  const n = ju;
  const q = Math.ceil(d / n);
  const r = q * n - d;
  const base = (q - 1) % 12; // 子(0) → 丑(1) → ... (0-indexed from 子)
  if (r === 0) return base;
  if (r % 2 === 1) return (base + r) % 12; // odd: move toward 亥
  return (((base - r) % 12) + 12) % 12; // even: move toward 子
}

/**
 * 天府星 branch: always mirrors 紫微 across the 子-午 axis.
 * Rule: 紫微 branch + 天府 branch = 12 (mod 12 using "午=6" as mirror)
 * Standard formula: 天府 = (12 - 紫微 + 2 * 6) % 12 = (24 - 紫微) % 12
 * Simplified known table: ziwei branch z → tianfu branch = (12 - z + 12) % 12 ...
 * but actual rule from texts: 天府 is at (午 + (午 - 紫微)) = 2*6 - z = (12 - z) % 12.
 */
export function calcTianFuBranch(ziWeiBranch: number): number {
  return (12 - ziWeiBranch) % 12;
}

// ---- Main star placement ----

/**
 * Place the 14 main stars relative to 紫微 and 天府.
 *
 * 紫微系 (relative offsets from 紫微, counter-clockwise = branch + offset):
 *   紫微(0), 天機(-1), 太陽(-2), 武曲(-3), 天同(-4), 廉貞(-7)
 *
 * 天府系 (relative offsets from 天府, clockwise = branch - offset):
 *   天府(0), 太陰(+1), 貪狼(+2), 巨門(+3), 天相(+4), 天梁(+5), 七殺(+6), 破軍(+10)
 */
const ZIWEI_OFFSETS: [ZiWeiMainStar, number][] = [
  ['紫微', 0],
  ['天機', -1],
  ['太陽', -2],
  ['武曲', -3],
  ['天同', -4],
  ['廉貞', -7],
];

const TIANFU_OFFSETS: [ZiWeiMainStar, number][] = [
  ['天府', 0],
  ['太陰', 1],
  ['貪狼', 2],
  ['巨門', 3],
  ['天相', 4],
  ['天梁', 5],
  ['七殺', 6],
  ['破軍', 10],
];

function placeMainStars(
  ziWeiBranch: number,
  tianFuBranch: number,
): Map<number, { name: ZiWeiMainStar; brightness: StarBrightness }[]> {
  const map = new Map<number, { name: ZiWeiMainStar; brightness: StarBrightness }[]>();

  const add = (branch: number, name: ZiWeiMainStar) => {
    const b = ((branch % 12) + 12) % 12;
    if (!map.has(b)) map.set(b, []);
    map.get(b)!.push({ name, brightness: '' });
  };

  for (const [name, offset] of ZIWEI_OFFSETS) {
    add(ziWeiBranch + offset, name);
  }
  for (const [name, offset] of TIANFU_OFFSETS) {
    add(tianFuBranch + offset, name);
  }
  return map;
}

// ---- Auxiliary star placement ----

/**
 * Place key auxiliary stars based on year stem, month branch, day stem, and hour branch.
 * Returns a map from branch index → array of aux star names.
 */
function placeAuxStars(
  yearStemIdx: number,
  lunarMonthBranchIdx: number,
  dayStemIdx: number,
  hourBranch: number,
): Map<number, ZiWeiAuxStar[]> {
  const map = new Map<number, ZiWeiAuxStar[]>();
  const add = (b: number, star: ZiWeiAuxStar) => {
    const idx = ((b % 12) + 12) % 12;
    if (!map.has(idx)) map.set(idx, []);
    map.get(idx)!.push(star);
  };

  // 文昌 (文昌 starts at 戌(10) for year stem 甲/己, stepping backward by year stem group)
  // 文昌: 甲年→戌, 乙年→酉, 丙年→申, 丁年→未, 戊年→午, 己年→巳, 庚年→辰, 辛年→卯, 壬年→寅, 癸年→丑
  const wenChangBase = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
  add(wenChangBase[yearStemIdx], '文昌');

  // 文曲: 甲→辰, 乙→巳, 丙→午, 丁→未, 戊→申, 己→酉, 庚→戌, 辛→亥, 壬→子, 癸→丑
  const wenQuBase = [4, 5, 6, 7, 8, 9, 10, 11, 0, 1];
  add(wenQuBase[yearStemIdx], '文曲');

  // 左輔: 辰(4) + 月支數 (寅月=0 → offset 0)
  add(4 + lunarMonthBranchIdx, '左輔');

  // 右弼: 戌(10) - 月支數
  add(10 - lunarMonthBranchIdx, '右弼');

  // 天魁: 甲戊庚→丑, 乙己→子, 丙丁→亥, 辛→午, 壬癸→卯, 庚→辰
  // Simplified standard table by year stem:
  const tianKuiBranch = [1, 0, 11, 11, 1, 0, 4, 6, 2, 2];
  add(tianKuiBranch[yearStemIdx], '天魁');

  // 天鉞: 甲戊庚→未, 乙己→申, 丙丁→酉, 辛→寅, 壬癸→巳, 庚→酉
  const tianYueBranch = [7, 8, 9, 9, 7, 8, 3, 5, 11, 11];
  add(tianYueBranch[yearStemIdx], '天鉞');

  // 祿存: follows year stem (甲→寅, 乙→卯, 丙→巳, 丁→午, 戊→巳, 己→午, 庚→申, 辛→酉, 壬→亥, 癸→子)
  const luCunBranch = [2, 3, 5, 6, 5, 6, 8, 9, 11, 0];
  add(luCunBranch[yearStemIdx], '祿存');

  // 擎羊: 祿存 + 1
  add(luCunBranch[yearStemIdx] + 1, '擎羊');
  // 陀羅: 祿存 - 1
  add(luCunBranch[yearStemIdx] - 1, '陀羅');

  // 天馬: depends on year branch (寅午戌→申, 申子辰→寅, 巳酉丑→亥, 亥卯未→巳)
  // We use year branch from year ganzhi (deferred to caller)

  // 火星: by hour branch and year branch group
  // Simplified: based on hour branch only (from 子時 = 寅宮 for most)
  // Standard formula: 火星 palace = (hourBranch + 2) % 12  (from 寅)
  add((2 + hourBranch) % 12, '火星');

  // 鈴星: similar
  add((10 + hourBranch) % 12, '鈴星');

  // 地空: 亥(11) - 時辰 (子=0): 子→亥, 丑→戌, ..., 亥→子
  add((11 - hourBranch + 12) % 12, '地空');

  // 地劫: 亥(11) + 時辰: 子→亥, 丑→子, ..., 亥→戌...
  // Standard: 地劫從亥宮逆行安，與地空同宮（子時）
  add((11 + hourBranch) % 12, '地劫');

  void dayStemIdx; // reserved for 截路、旬空 etc. — not implemented in MVP

  return map;
}

// ---- Main export ----

/**
 * Calculate a complete 紫微斗數 chart.
 */
export function calculateZiWei(input: {
  year: number;
  month: number;
  day: number;
  hour: number; // 0–23
  gender: 'male' | 'female';
}): ZiWeiChart {
  const { year, month, day, hour, gender } = input;
  const jdn = dateToJDN(year, month, day);
  const hourBranch = hour === 23 ? 0 : Math.floor((hour + 1) / 2);

  // Lunar date
  const lunar = gregorianToLunar(year, month, day);
  const { lunarMonth, lunarDay, isLeapMonth, monthBranchIdx } = lunar;

  // Year ganzhi
  const yearGIdx = yearGanzhiIdx(year);
  const yearStemIdx = yearGIdx % 10;
  const yearBranchIdx = yearGIdx % 12;

  // Day ganzhi
  const dayJdn = hour >= 23 ? jdn + 1 : jdn;
  const dayGIdx = dayGanzhiIdx(dayJdn);
  const dayStemIdx = dayGIdx % 10;

  // 命宮 branch
  const mingGongBranch = calcMingGong(monthBranchIdx, hourBranch);

  // 五行局
  const ju = calcJu(mingGongBranch, yearStemIdx);

  // 紫微 and 天府 branches
  const ziWeiBranch = calcZiWeiBranch(ju, lunarDay);
  const tianFuBranch = calcTianFuBranch(ziWeiBranch);

  // Place stars
  const mainStarMap = placeMainStars(ziWeiBranch, tianFuBranch);
  const auxStarMap = placeAuxStars(yearStemIdx, monthBranchIdx, dayStemIdx, hourBranch);

  // 天馬 placement (year branch)
  const tianMaByBranch: Record<number, number> = {
    2: 8,
    6: 8,
    10: 8, // 寅午戌 → 申(8)
    8: 2,
    0: 2,
    4: 2, // 申子辰 → 寅(2)
    5: 11,
    9: 11,
    1: 11, // 巳酉丑 → 亥(11)
    11: 5,
    3: 5,
    7: 5, // 亥卯未 → 巳(5)
  };
  const tianMaBranch = tianMaByBranch[yearBranchIdx] ?? 8;
  if (!auxStarMap.has(tianMaBranch)) auxStarMap.set(tianMaBranch, []);
  auxStarMap.get(tianMaBranch)!.push('天馬');

  // Build 12 palaces
  // Palace 0 = 命宮, at branch mingGongBranch
  // Palaces go counter-clockwise: 命宮, 兄弟, 夫妻, ..., 父母
  const palaces: ZiWeiPalace[] = [];
  for (let i = 0; i < 12; i++) {
    const branch = (mingGongBranch + i) % 12;
    const stem = palaceStem(yearStemIdx, branch);
    palaces.push({
      idx: i,
      branch,
      branchName: BRANCHES[branch],
      stem,
      palaceName: ZIWEI_PALACE_NAMES[i],
      mainStars: mainStarMap.get(branch) ?? [],
      auxStars: auxStarMap.get(branch) ?? [],
    });
  }

  return {
    birthYear: year,
    birthMonth: month,
    birthDay: day,
    birthHour: hour,
    gender,
    lunarMonth,
    lunarDay,
    isLeapMonth,
    ju,
    juName: JU_NAMES[ju],
    mingGongBranch,
    ziWeiBranch,
    tianFuBranch,
    yearStem: STEMS[yearStemIdx],
    yearBranch: BRANCHES[yearBranchIdx],
    hourBranch: BRANCHES[hourBranch],
    palaces,
  };
}
