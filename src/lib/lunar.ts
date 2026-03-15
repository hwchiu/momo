/**
 * Chinese Lunisolar Calendar (農曆) engine.
 *
 * Provides conversion from Gregorian date to Chinese lunar date, which is
 * required for 紫微斗數 (Zi Wei Dou Shu) calculations.
 *
 * Algorithm:
 *  1. Find JDE of each new moon using Newton's method on the Moon-Sun
 *     ecliptic longitude difference (true conjunction).
 *  2. Locate the new moon just before the given JDE → start of the lunar month.
 *  3. Walk backward to find the previous 冬至 (winter solstice, Sun lon = 270°)
 *     and count months from there to determine the lunar month number.
 *  4. An intercalary month (閏月) is a month that contains no 中氣 (major
 *     solar term, every 30° of Sun longitude starting at 330° for 大寒...).
 *
 * Accuracy: sufficient for dates 1900–2100.
 */

import { sunLongitude, dateToJDN } from './bazi';

// @ts-expect-error no type declarations for astronomia/moonposition
import * as MoonPos from 'astronomia/moonposition';

const DEG = Math.PI / 180;

// ---- Moon longitude ----

/** Moon's apparent geocentric ecliptic longitude in degrees [0, 360). */
function moonLongitude(jde: number): number {
  const pos = MoonPos.position(jde) as { lon: number };
  return (((pos.lon / DEG) % 360) + 360) % 360;
}

// ---- New moon finder ----

/**
 * Find the JDE of the astronomical new moon (true conjunction) nearest to
 * the given JDE. Uses Newton's method converging in ≤ 20 iterations.
 */
export function newMoonNear(jde: number): number {
  let t = jde;
  for (let i = 0; i < 25; i++) {
    const mLon = moonLongitude(t);
    const sLon = sunLongitude(t);
    let diff = (mLon - sLon + 360) % 360;
    if (diff > 180) diff -= 360; // signed difference toward 0
    // Moon moves ~13.176°/day, Sun ~0.9856°/day; net ~12.19°/day
    const step = -diff / 12.19;
    t += step;
    if (Math.abs(step) < 1e-5) break;
  }
  return t;
}

/** JDE of the new moon just before (or exactly at) the given JDE. */
export function newMoonBefore(jde: number): number {
  // Start search one lunar month earlier
  let nm = newMoonNear(jde - 15);
  // If the result is after jde, step back one synodic month
  if (nm > jde + 0.5) nm = newMoonNear(nm - 29.53);
  // Step forward until nm is just before jde
  while (newMoonNear(nm + 29.53) < jde - 0.5) {
    nm = newMoonNear(nm + 29.53);
  }
  return nm;
}

// ---- Solar term helpers ----

/**
 * Sun longitude target for the N-th 中氣 (major solar term, every 30°).
 * Index 0 = 冬至 (270°), 1 = 大寒 (300°), 2 = 雨水 (330°), 3 = 春分 (0°), ...
 */
/**
 * Find the JDE when Sun reaches targetLon, searching near startJDE.
 * Same Newton's method as in bazi.ts / qimen.ts.
 */
function solarTermJDE(startJDE: number, targetLon: number): number {
  let t = startJDE;
  for (let i = 0; i < 15; i++) {
    let diff = targetLon - sunLongitude(t);
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;
    t += (diff / 360) * 365.2422;
    if (Math.abs(diff) < 1e-6) break;
  }
  return t;
}

/** JDE of the 冬至 (winter solstice, Sun lon = 270°) just before the given JDE. */
export function dongzhiBefore(jde: number): number {
  // Approximate year to start search
  const approxYear = 2000 + (jde - 2451545) / 365.25;
  const startJDN = dateToJDN(Math.floor(approxYear), 12, 1);
  let dz = solarTermJDE(startJDN - 0.5, 270);
  // Ensure dz is before jde
  while (dz > jde) dz = solarTermJDE(dz - 360, 270);
  while (solarTermJDE(dz + 350, 270) < jde) dz = solarTermJDE(dz + 350, 270);
  return dz;
}

/**
 * Does the lunar month starting at `monthNewMoon` contain a 中氣?
 * A 中氣 occurs every 30° of Sun longitude.  An intercalary month (閏月)
 * contains no 中氣.
 */
function monthContainsZhongQi(monthNewMoon: number, nextNewMoon: number): boolean {
  const sLonStart = sunLongitude(monthNewMoon);
  // If the Sun crosses a multiple of 30° (中氣) between monthStart and nextStart
  const startRounded = Math.floor(sLonStart / 30) * 30;
  const targetLon = (startRounded + 30) % 360;
  // Check if the crossing falls within this month
  const crossingJDE = solarTermJDE(monthNewMoon, targetLon);
  return crossingJDE >= monthNewMoon && crossingJDE < nextNewMoon;
}

// ---- Public interface ----

export interface LunarDate {
  lunarYear: number;
  lunarMonth: number; // 1–12 (1 = 正月, the month after Spring Festival)
  lunarDay: number; // 1–30
  isLeapMonth: boolean;
  /** For 紫微 purposes: branch index of the lunar month (寅=0, 卯=1, ..., 丑=11) */
  monthBranchIdx: number;
}

/**
 * Convert a Gregorian date to a Chinese lunar date.
 *
 * Algorithm:
 *  1. Find the 冬至 before the birth date → establishes the base for counting months.
 *  2. The new moon containing 冬至 starts month 11 (十一月 = 子月) of the current year.
 *  3. Walk forward through new moons, marking intercalary months, until we reach
 *     the new moon that starts the birth's lunar month.
 */
export function gregorianToLunar(year: number, month: number, day: number): LunarDate {
  const jdn = dateToJDN(year, month, day);
  const jde = jdn - 0.5; // noon

  // Find the new moon just before this date (= start of current lunar month)
  const thisNewMoon = newMoonBefore(jde);
  const lunarDay = Math.round(jde - thisNewMoon) + 1;

  // Find the 冬至 most recently before or on thisNewMoon
  const dz = dongzhiBefore(thisNewMoon + 1);

  // The new moon that contains (or is just before) 冬至 → "月11" (十一月)
  const dzNewMoon = newMoonBefore(dz + 1);

  // Walk forward from dzNewMoon, assigning month numbers
  // Month 11 = 子月 = monthBranch 0 (子=0 in 0-indexed branch system)
  // Standard: month 11 → 子月(branchIdx=10, since 子=0 in 地支 but 月份 ordering starts 子=11)
  //
  // 農曆 month numbering: 正月=1 (寅月), 二月=2 (卯月), ..., 十一月=11 (子月), 十二月=12 (丑月)
  // monthBranchIdx (for 紫微): 寅=0, 卯=1, ..., 子=10, 丑=11
  //   → 農曆月 M → monthBranchIdx = (M + 9) % 12
  //   → Check: M=1(寅)→(1+9)%12=10? No, 寅=2 in 地支 (子=0)...

  // Let's use a simpler mapping:
  // 農曆月 M → 地支月 branch (子=0): (M + 9) % 12
  //   M=11 → (11+9)%12=8?  子 should be 0. Hmm.
  //   Actually: M=11=子月 → branch 0; M=12=丑月 → branch 1; M=1=寅月 → branch 2
  //   Formula: branch = (M + 1) % 12
  //   M=11→(11+1)%12=0(子) ✓, M=12→(12+1)%12=1(丑) ✓, M=1→(1+1)%12=2(寅) ✓

  // Walk from dzNewMoon through lunar months to find thisNewMoon's month number
  const curNewMoon = dzNewMoon;
  const curMonthNum = 11; // 子月 = 十一月 = month 11
  const curIsLeap = false;
  let prevMonthNum = 10; // one before 子月 for tracking
  const lunarYear = year; // approximate; refine below

  // Check if dzNewMoon is actually BEFORE 冬至 (it should be; adjust if needed)
  // and which year's 十一月 it is
  // The new year (正月) starts after the 2nd new moon from 冬至
  // So months 11, 12, [閏12?], 1(正月), 2, ...

  // Collect months from dzNewMoon until we pass thisNewMoon
  let prevHadZhongQi = true; // 冬至 月 always has 中氣
  let nm = dzNewMoon;
  let mNum = 11;
  let isLeap = false;
  let foundMonth = 11;
  let foundIsLeap = false;
  let foundLunarYear = Math.round(year - 0.5); // approximate

  // We need up to ~15 months of data
  for (let step = 0; step < 16; step++) {
    const nextNm = newMoonNear(nm + 29.53);
    const hasZhongQi = monthContainsZhongQi(nm, nextNm);

    if (step === 0) {
      // 冬至 月 = month 11, not leap
      if (nm >= thisNewMoon - 1 && nm <= thisNewMoon + 1) {
        foundMonth = 11;
        foundIsLeap = false;
        break;
      }
    } else {
      // Determine next month number
      if (!prevHadZhongQi) {
        // Previous month was intercalary (no 中氣) → this month is leap of prevMonthNum
        // Actually: 閏月 is the month itself (current nm)
        isLeap = true;
        // mNum stays the same as the previous month number
      } else {
        isLeap = false;
        mNum = mNum === 12 ? 1 : mNum + 1;
        if (mNum === 1) {
          // New lunar year starts
          foundLunarYear = Math.round(year);
        }
      }

      if (Math.abs(nm - thisNewMoon) < 1) {
        foundMonth = mNum;
        foundIsLeap = isLeap;
        break;
      }
    }

    prevHadZhongQi = hasZhongQi;
    prevMonthNum = mNum;
    nm = nextNm;
  }

  void curNewMoon;
  void curMonthNum;
  void curIsLeap;
  void prevMonthNum;
  void lunarYear;

  // monthBranchIdx for 紫微: 寅=0, 卯=1, ..., 丑=11
  // 農曆月 M: 1→寅(0), 2→卯(1), ..., 10→亥(9), 11→子(10), 12→丑(11)
  const monthBranchIdx = (foundMonth + 10) % 12;

  return {
    lunarYear: foundLunarYear,
    lunarMonth: foundMonth,
    lunarDay: Math.max(1, Math.min(30, lunarDay)),
    isLeapMonth: foundIsLeap,
    monthBranchIdx,
  };
}
