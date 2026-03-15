/**
 * Qi Men Dun Jia (奇門遁甲) calculation engine.
 *
 * Implements hourly time charts (時盤) using the Yang/Yin Dun (陽/陰遁)
 * and Nine-Palace (九宮) rotation method.
 *
 * Algorithm summary:
 *   1. Sun longitude → solar term index (0–23 from 冬至)
 *   2. Solar term + year yuan (上/中/下元) → ju number (局數 1–9) + dun type
 *   3. Day ganzhi → xun (旬首, decade head) → base palace
 *   4. Hour offset within xun → rotate stars/doors/deities in Lo Shu order
 */

import type { QiMenChart, QiMenPalace, QiMenDun } from '../types/qimen';
import {
  QIMEN_STARS,
  QIMEN_DOORS,
  DEITIES_YANG,
  DEITIES_YIN,
  PALACE_META,
  SOLAR_TERM_NAMES,
  YANG_JU_TABLE,
  YIN_JU_TABLE,
} from '../types/qimen';
import { sunLongitude, dateToJDN } from './bazi';
import { STEMS, BRANCHES } from '../types/bazi';

// ---- Lo Shu constants ----

/** Lo Shu palace path (飛宮 order): 1→2→3→4→5→6→7→8→9 */
const LO_SHU_PATH = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

/** Lo Shu palace → index in path */
const LO_SHU_IDX: Record<number, number> = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 7, 9: 8 };

/** 8-palace path (excluding center): used for 八門 and 八神 rotation */
const EIGHT_PALACE_PATH = [1, 2, 3, 4, 6, 7, 8, 9] as const;

/** 8-palace path → index */
const EIGHT_IDX: Record<number, number> = { 1: 0, 2: 1, 3: 2, 4: 3, 6: 4, 7: 5, 8: 6, 9: 7 };

/** Ground plate (地盤) stem fixed to each palace */
const EARTH_STEMS: Record<number, string> = {
  1: '戊',
  2: '己',
  3: '庚',
  4: '辛',
  5: '戊',
  6: '壬',
  7: '癸',
  8: '丁',
  9: '丙',
};

// ---- Xun (旬) definitions ----

/** Six 旬首 names */
const XUN_NAMES = ['甲子', '甲戌', '甲申', '甲午', '甲辰', '甲寅'] as const;

/**
 * 地盤 palace where the six 旬首 hide (甲遁入戊→坎(1), etc.)
 * 甲子→戊→1, 甲戌→己→2, 甲申→庚→3, 甲午→辛→4, 甲辰→壬→6, 甲寅→癸→7
 */
const XUN_PALACES = [1, 2, 3, 4, 6, 7] as const;

// ---- Solar longitude helpers ----

/**
 * Find the JDE when Sun reaches targetLon in the vicinity of startJDE.
 * Uses Newton's method (converges in ~10 iterations).
 */
function solarTermJDE(startJDE: number, targetLon: number): number {
  let jde = startJDE;
  for (let i = 0; i < 15; i++) {
    let diff = targetLon - sunLongitude(jde);
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;
    jde += (diff / 360) * 365.2422;
    if (Math.abs(diff) < 1e-6) break;
  }
  return jde;
}

/**
 * Given a JDE, return:
 *  - termIdx: solar term index 0–23 (冬至=0, 小寒=1, …, 大雪=23)
 *  - daysFromTermStart: days elapsed since the current term began
 */
function solarTermInfo(jde: number): { termIdx: number; daysFromTermStart: number } {
  const sunLon = sunLongitude(jde);
  // 冬至 is at Sun longitude 270°; each term spans 15°
  const termIdx = Math.floor(((sunLon - 270 + 360) % 360) / 15);

  // Compute the JDE of the term's start
  const termStartLon = (270 + termIdx * 15) % 360;
  // Estimate the year from JDE
  const approxYear = Math.round(2000 + (jde - 2451545) / 365.25);
  const termStart = solarTermJDE(dateToJDN(approxYear, 1, 1) - 30 + termIdx * 15.2, termStartLon);

  const daysFromTermStart = Math.max(0, jde - termStart);
  return { termIdx, daysFromTermStart };
}

// ---- Yuan (元) determination ----

/**
 * Return the year's yuan index: 0=上元, 1=中元, 2=下元.
 * Cycles on the ganzhi year index using the rule:
 *   year ganzhi index (mod 3) → yuan
 * Traditional anchor: 甲子年 (year 4 AD) = index 0 = 上元.
 */
function yearYuanOffset(year: number): 0 | 1 | 2 {
  const idx = (((year - 4) % 60) + 60) % 60;
  return (idx % 3) as 0 | 1 | 2;
}

/**
 * Determine the yuan for a specific pentad, given:
 *  - yearYuan: the yuan offset for the year (0/1/2)
 *  - pentadIndexInYear: cumulative pentad number since 冬至 (0–71)
 */
function pentadYuan(yearYuan: 0 | 1 | 2, pentadIndexInYear: number): 0 | 1 | 2 {
  return ((yearYuan + pentadIndexInYear) % 3) as 0 | 1 | 2;
}

// ---- Ganzhi helpers ----

/**
 * Returns the day ganzhi cycle index (0–59) from a Julian Day Number.
 * Anchor: JDN 2451545 (J2000 = 2000-01-01) has day ganzhi index 10 (甲戌).
 */
function dayGanzhiIndex(jdn: number): number {
  // Anchor: JDN 2415021 (1900-01-01) = 甲戌 (index 10); equivalent to offset +49
  return (((jdn - 2415021 + 10) % 60) + 60) % 60;
}

/** Year ganzhi cycle index (0–59). Anchor: year 4 AD = 甲子 = index 0. */
function yearGanzhiIndex(year: number): number {
  return (((year - 4) % 60) + 60) % 60;
}

/** Hour branch from clock hour (子=0…亥=11). 子時 spans 23:00–01:00. */
export function hourBranchFromHour(hour: number): number {
  if (hour === 23) return 0; // 子時 starts at 23
  return Math.floor((hour + 1) / 2);
}

/** Hour stem from day stem + hour branch (五鼠遁時法). */
export function hourStemFromDayStem(dayStem: number, hourBranch: number): number {
  // Start stems for 子時: 甲己→甲(0), 乙庚→丙(2), 丙辛→戊(4), 丁壬→庚(6), 戊癸→壬(8)
  const startStem = [0, 2, 4, 6, 8, 0, 2, 4, 6, 8][dayStem];
  return (startStem + hourBranch) % 10;
}

// ---- Ganzhi pillar builder ----

function makePillar(stemIdx: number, branchIdx: number) {
  const stem = STEMS[stemIdx];
  const branch = BRANCHES[branchIdx];
  return { stem, branch, full: stem + branch };
}

// ---- Main calculation ----

/**
 * Core palace-building logic shared by 時盤, 日盤, and 年盤.
 * `totalOffset` drives the star/door/deity rotation:
 *   時盤: dayInXun * 12 + hourBranch
 *   日盤: dayInXun
 *   年盤: yearInXun
 */
function buildChart(params: {
  datetime: QiMenChart['datetime'];
  isYangDun: boolean;
  solarTermName: string;
  ju: number;
  yuan: '上元' | '中元' | '下元';
  pillarYear: ReturnType<typeof makePillar>;
  pillarMonth: ReturnType<typeof makePillar>;
  pillarDay: ReturnType<typeof makePillar>;
  pillarHour: ReturnType<typeof makePillar>;
  xunPalace: number;
  xunShou: string;
  totalOffset: number;
}): QiMenChart {
  const {
    datetime,
    isYangDun,
    solarTermName,
    ju,
    yuan,
    pillarYear,
    pillarMonth,
    pillarDay,
    pillarHour,
    xunPalace,
    xunShou,
    totalOffset,
  } = params;

  const dun: QiMenDun = isYangDun ? '陽遁' : '陰遁';
  const direction = isYangDun ? 1 : -1;

  // Star rotation in Lo Shu 9-palace path
  const starOffset = totalOffset % 9;
  const xunPalaceIdx = LO_SHU_IDX[xunPalace];
  const dutyStarPalaceIdx = (((xunPalaceIdx + direction * starOffset) % 9) + 9) % 9;
  const dutyStarPalace = LO_SHU_PATH[dutyStarPalaceIdx];
  const dutyStar = QIMEN_STARS[xunPalace];

  const rotOffset = ((dutyStarPalaceIdx - xunPalaceIdx) * direction + 9 * 10) % 9;

  // Door rotation in 8-palace path
  const doorOffset = totalOffset % 8;
  const xunEightIdx = EIGHT_IDX[xunPalace];
  const dutyDoorPalaceEightIdx = (((xunEightIdx + direction * doorOffset) % 8) + 8) % 8;
  const dutyDoorPalace = EIGHT_PALACE_PATH[dutyDoorPalaceEightIdx];
  const dutyDoor = QIMEN_DOORS[dutyDoorPalace] ?? '休門';

  const deities = isYangDun ? DEITIES_YANG : DEITIES_YIN;

  const palaces: QiMenPalace[] = LO_SHU_PATH.map((p) => {
    const meta = PALACE_META[p];
    const isCenter = p === 5;

    const heavenStemSourceIdx = (((LO_SHU_IDX[p] - direction * rotOffset) % 9) + 9) % 9;
    const heavenStemSourcePalace = LO_SHU_PATH[heavenStemSourceIdx];
    const heavenStem = EARTH_STEMS[heavenStemSourcePalace];
    const star = QIMEN_STARS[heavenStemSourcePalace];
    const door = isCenter ? null : QIMEN_DOORS[p];

    let deity: string | null = null;
    if (!isCenter) {
      const eightIdx = EIGHT_IDX[p];
      const dutyStarEightIdx = EIGHT_IDX[dutyStarPalace] ?? 0;
      const deityStep = ((eightIdx - dutyStarEightIdx) * direction + 8 * 10) % 8;
      deity = deities[deityStep];
    }

    return {
      palace: p,
      gua: meta.gua,
      direction: meta.direction,
      dirShort: meta.dirShort,
      earthStem: EARTH_STEMS[p],
      heavenStem,
      star,
      door,
      deity,
      isDutyStar: p === dutyStarPalace,
      isDutyDoor: p === dutyDoorPalace,
      isCenter,
    };
  });

  return {
    datetime,
    dun,
    ju,
    yuan,
    solarTermName,
    pillarYear,
    pillarMonth,
    pillarDay,
    pillarHour,
    xunShou,
    dutyStar,
    dutyDoor,
    dutyStarPalace,
    dutyDoorPalace,
    palaces,
  };
}

/**
 * Calculate a Qi Men Dun Jia hourly time chart (時盤) for the given datetime.
 * The datetime is treated as local time (no timezone conversion).
 */
export function calculateQiMen(dt: {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}): QiMenChart {
  const jdn = dateToJDN(dt.year, dt.month, dt.day);

  // --- Solar term and ju ---
  // Use the noon JDE of the calendar day for term/ju calculation.
  const noonJde = jdn - 0.5; // noon of the calendar day
  const { termIdx, daysFromTermStart } = solarTermInfo(noonJde);
  const isYangDun = termIdx < 12;
  const solarTermName = SOLAR_TERM_NAMES[termIdx];

  const pentadIdx = Math.min(2, Math.floor(daysFromTermStart / 5));
  const pentadIndexInYear = termIdx * 3 + pentadIdx; // 0–71 cumulative since 冬至

  const yyuan = yearYuanOffset(dt.year);
  const pYuan = pentadYuan(yyuan, pentadIndexInYear);
  const yuanLabel: '上元' | '中元' | '下元' = ['上元', '中元', '下元'][pYuan] as
    | '上元'
    | '中元'
    | '下元';

  const juTable = isYangDun ? YANG_JU_TABLE : YIN_JU_TABLE;
  const tableRow = termIdx % 12;
  const ju = juTable[tableRow][pYuan];

  // --- Ganzhi pillars ---
  // Day pillar stays on the calendar day even at 子時 (23:00).
  // Only the hour STEM uses the next day's stem at 子時 (per standard convention).
  const dayIdx = dayGanzhiIndex(jdn);
  const dayStem = dayIdx % 10;
  // 子時跨日: at hour ≥ 23, hour stem is derived from the next calendar day's stem
  const stemForHour = dt.hour >= 23 ? dayGanzhiIndex(jdn + 1) % 10 : dayStem;
  const dayBranch = dayIdx % 12;

  const yearIdx = yearGanzhiIndex(dt.year);
  const yearStem = yearIdx % 10;
  const yearBranch = yearIdx % 12;

  // Month: simplified — use solar-term-based month ganzhi
  // 五虎元旦法: start stem for 寅月 based on year stem
  const monthStartStem = [0, 2, 4, 6, 8, 0, 2, 4, 6, 8][yearStem];
  // Approximate solar month by calendar month (寅月≈Feb, 卯月≈Mar, …)
  const solarMonthOffset = (dt.month - 2 + 12) % 12; // 寅月=0 when month=2
  const monthStem = (monthStartStem + solarMonthOffset) % 10;
  const monthBranch = (2 + solarMonthOffset) % 12; // 寅(2) for first solar month

  const hourBranch = hourBranchFromHour(dt.hour);
  const hourStem = hourStemFromDayStem(stemForHour, hourBranch);

  const pillarYear = makePillar(yearStem, yearBranch);
  const pillarMonth = makePillar(monthStem, monthBranch);
  const pillarDay = makePillar(dayStem, dayBranch);
  const pillarHour = makePillar(hourStem, hourBranch);

  // --- Xun (旬首) ---
  const xunIdx = Math.floor(dayIdx / 10) % 6;
  const xunShou = XUN_NAMES[xunIdx];
  const xunPalace = XUN_PALACES[xunIdx]; // 地盤 base palace for 值符

  // --- Hour offset within the 旬 (for rotating star/door/deity) ---
  const dayInXun = dayIdx % 10; // 0–9
  const totalHourOffset = dayInXun * 12 + hourBranch; // 0–119

  return buildChart({
    datetime: { ...dt },
    isYangDun,
    solarTermName,
    ju,
    yuan: yuanLabel,
    pillarYear,
    pillarMonth,
    pillarDay,
    pillarHour,
    xunPalace,
    xunShou,
    totalOffset: totalHourOffset,
  });
}

/**
 * Calculate a Qi Men Dun Jia daily chart (日盤) for the given date.
 * Uses day-level rotation (1 step per day) instead of hour-level.
 */
export function calculateQiMenDay(dt: { year: number; month: number; day: number }): QiMenChart {
  const jdn = dateToJDN(dt.year, dt.month, dt.day);
  const noonJde = jdn - 0.5;
  const { termIdx, daysFromTermStart } = solarTermInfo(noonJde);
  const isYangDun = termIdx < 12;
  const solarTermName = SOLAR_TERM_NAMES[termIdx];

  const pentadIdx = Math.min(2, Math.floor(daysFromTermStart / 5));
  const pentadIndexInYear = termIdx * 3 + pentadIdx;
  const yyuan = yearYuanOffset(dt.year);
  const pYuan = pentadYuan(yyuan, pentadIndexInYear);
  const yuanLabel: '上元' | '中元' | '下元' = ['上元', '中元', '下元'][pYuan] as
    | '上元'
    | '中元'
    | '下元';
  const juTable = isYangDun ? YANG_JU_TABLE : YIN_JU_TABLE;
  const ju = juTable[termIdx % 12][pYuan];

  const dayIdx = dayGanzhiIndex(jdn);
  const dayStem = dayIdx % 10;
  const dayBranch = dayIdx % 12;

  const yearIdx = yearGanzhiIndex(dt.year);
  const yearStem = yearIdx % 10;
  const yearBranch = yearIdx % 12;

  const monthStartStem = [0, 2, 4, 6, 8, 0, 2, 4, 6, 8][yearStem];
  const solarMonthOffset = (dt.month - 2 + 12) % 12;
  const monthStem = (monthStartStem + solarMonthOffset) % 10;
  const monthBranch = (2 + solarMonthOffset) % 12;

  const xunIdx = Math.floor(dayIdx / 10) % 6;
  const xunShou = XUN_NAMES[xunIdx];
  const xunPalace = XUN_PALACES[xunIdx];

  // 日盤: offset = day's position within its 旬 (0–9), no hour component
  const dayInXun = dayIdx % 10;

  // Hour pillar for reference (子時, first hour of day)
  const hourStem = hourStemFromDayStem(dayStem, 0);
  const pillarHour = makePillar(hourStem, 0);

  return buildChart({
    datetime: { ...dt, hour: 0, minute: 0 },
    isYangDun,
    solarTermName,
    ju,
    yuan: yuanLabel,
    pillarYear: makePillar(yearStem, yearBranch),
    pillarMonth: makePillar(monthStem, monthBranch),
    pillarDay: makePillar(dayStem, dayBranch),
    pillarHour,
    xunPalace,
    xunShou,
    totalOffset: dayInXun,
  });
}

/**
 * Calculate a Qi Men Dun Jia annual chart (年盤) for the given year.
 * Uses year-level rotation (1 step per year within the 10-year 旬).
 * Based on 冬至 (winter solstice) as the year's anchor.
 */
export function calculateQiMenYear(year: number): QiMenChart {
  // 冬至 falls around Dec 22; use that as the annual anchor
  const jdn = dateToJDN(year, 12, 22);

  // Year yuan (上中下元) determined by year ganzhi cycle
  const yyuan = yearYuanOffset(year);
  const yuanLabel: '上元' | '中元' | '下元' = ['上元', '中元', '下元'][yyuan] as
    | '上元'
    | '中元'
    | '下元';

  // 年盤 is always 陽遁 (based on 冬至 anchor, which starts 陽遁 cycle)
  const ju = YANG_JU_TABLE[0][yyuan]; // 冬至 (term 0) ju for this yuan

  // Year ganzhi
  const yearIdx = yearGanzhiIndex(year);
  const yearStem = yearIdx % 10;
  const yearBranch = yearIdx % 12;

  // 旬 is determined by year ganzhi: every 10 years = 1 旬
  const yearXunIdx = Math.floor(yearIdx / 10) % 6;
  const xunShou = XUN_NAMES[yearXunIdx];
  const xunPalace = XUN_PALACES[yearXunIdx];

  // Offset = year's position within its 10-year 旬 (0–9)
  const yearInXun = yearIdx % 10;

  // Month pillar: 子月 (冬至 month) — branch 11, stem derived from year stem
  const monthStartStem = [0, 2, 4, 6, 8, 0, 2, 4, 6, 8][yearStem];
  const monthStem = (monthStartStem + 9) % 10; // 子月 is 9th solar month offset from 寅
  const pillarMonth = makePillar(monthStem, 11); // branch 11 = 子

  // Day pillar: 冬至 day ganzhi
  const dayIdx = dayGanzhiIndex(jdn);
  const pillarDay = makePillar(dayIdx % 10, dayIdx % 12);
  const pillarHour = makePillar(hourStemFromDayStem(dayIdx % 10, 0), 0);

  return buildChart({
    datetime: { year, month: 12, day: 22, hour: 0, minute: 0 },
    isYangDun: true,
    solarTermName: '冬至',
    ju,
    yuan: yuanLabel,
    pillarYear: makePillar(yearStem, yearBranch),
    pillarMonth,
    pillarDay,
    pillarHour,
    xunPalace,
    xunShou,
    totalOffset: yearInXun,
  });
}
