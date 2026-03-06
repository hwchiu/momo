/**
 * Bazi (Four Pillars of Destiny) calculation engine.
 *
 * Computes year/month/day/hour pillars from birth date/time using
 * solar term boundaries derived from a simplified VSOP87 Sun model.
 * All input times are treated as local standard time (no tz conversion).
 */

import type { BaziInput, BaziChart, Pillar, LuckCycle } from '../types/bazi';
import { STEM_ELEMENTS, BRANCH_ELEMENTS } from '../types/bazi';

// 12 节 (solar term nodes) Sun longitudes: 寅月=315°, 卯月=345°, ..., 丑月=285°
const NODE_LONS = [315, 345, 15, 45, 75, 105, 135, 165, 195, 225, 255, 285] as const;

// ---- Julian Day Number helpers ----

/** Gregorian calendar date → Julian Day Number (integer, noon epoch) */
export function dateToJDN(y: number, m: number, d: number): number {
  const a = Math.floor((14 - m) / 12);
  const yr = y + 4800 - a;
  const mo = m + 12 * a - 3;
  return (
    d +
    Math.floor((153 * mo + 2) / 5) +
    365 * yr +
    Math.floor(yr / 4) -
    Math.floor(yr / 100) +
    Math.floor(yr / 400) -
    32045
  );
}

/** Rough calendar year from JDE */
function jdeToYear(jde: number): number {
  return Math.round(2000 + (jde - 2451545) / 365.25);
}

// ---- Solar longitude calculation ----

/**
 * Approximate Sun ecliptic longitude (degrees, 0-360) for a given Julian Ephemeris Day.
 * Accuracy: ~0.01° — sufficient for solar term boundary detection.
 */
export function sunLongitude(jde: number): number {
  const T = (jde - 2451545.0) / 36525.0;
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const Mrad = (357.52911 + 35999.05029 * T - 0.0001537 * T * T) * (Math.PI / 180);
  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mrad) +
    (0.019993 - 0.000101 * T) * Math.sin(2 * Mrad) +
    0.000289 * Math.sin(3 * Mrad);
  const omega = (125.04 - 1934.136 * T) * (Math.PI / 180);
  const lon = L0 + C - 0.00569 - 0.00478 * Math.sin(omega);
  return ((lon % 360) + 360) % 360;
}

/**
 * Find the JDE (UT) when the Sun reaches targetLon (degrees) in calendar year `year`.
 * Uses Jan 1 of the year as the initial reference, then applies Newton's method.
 */
function solarTermJDE(year: number, targetLon: number): number {
  // Start at noon Jan 1 of the given year
  let jde = dateToJDN(year, 1, 1) + 0.0; // noon
  const lonJan1 = sunLongitude(jde);

  // Estimate how many degrees ahead targetLon is from Jan 1 (going forward in time)
  let degDelta = ((targetLon - lonJan1 + 360) % 360);
  // If more than ~350°, it's effectively the same term from previous year — go backward
  if (degDelta > 355) degDelta -= 360;
  jde += (degDelta / 360) * 365.2422;

  // Newton's iterations
  for (let i = 0; i < 12; i++) {
    const lon = sunLongitude(jde);
    let diff = targetLon - lon;
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;
    jde += (diff / 360) * 365.2422;
  }
  return jde;
}

/** Find the most recent 節 JDE at or before birthJDE for nodeIndex (0-11) */
function findPrevTermJDE(birthJDE: number, nodeIndex: number): number {
  const targetLon = NODE_LONS[nodeIndex];
  const year = jdeToYear(birthJDE);
  const candidates = [-1, 0, 1]
    .map((offset) => solarTermJDE(year + offset, targetLon))
    .filter((jde) => jde <= birthJDE);
  return candidates.length > 0 ? Math.max(...candidates) : solarTermJDE(year, targetLon);
}

/** Find the next 節 JDE strictly after birthJDE for nodeIndex (0-11) */
function findNextTermJDE(birthJDE: number, nodeIndex: number): number {
  const targetLon = NODE_LONS[nodeIndex];
  const year = jdeToYear(birthJDE);
  const candidates = [-1, 0, 1]
    .map((offset) => solarTermJDE(year + offset, targetLon))
    .filter((jde) => jde > birthJDE);
  return candidates.length > 0 ? Math.min(...candidates) : solarTermJDE(year + 1, targetLon);
}

// ---- Sexagenary (60-cycle) index helpers ----

/** Convert stem+branch pair to 0-59 sexagenary index */
function sexagIndex(stem: number, branch: number): number {
  for (let i = 0; i < 60; i++) {
    if (i % 10 === stem && i % 12 === branch) return i;
  }
  return 0;
}

/** Convert 0-59 sexagenary index back to { stem, branch } */
function sexagToPillar(idx: number): Pillar {
  return { stem: ((idx % 10) + 10) % 10, branch: ((idx % 12) + 12) % 12 };
}

// ---- Four Pillars ----

/** Compute year pillar. Boundary is 立春 (Sun at 315°). */
function calcYearPillar(input: BaziInput, birthJDE: number): Pillar {
  const liChunJDE = solarTermJDE(input.year, 315);
  const chineseYear = birthJDE < liChunJDE ? input.year - 1 : input.year;
  return {
    stem: (chineseYear + 6 + 400 * 10) % 10, // +400*10 ensures positive
    branch: (chineseYear + 8 + 400 * 12) % 12,
  };
}

/** Compute month pillar from Sun longitude at birth. */
function calcMonthPillar(birthJDE: number, yearStem: number): Pillar {
  const sunLon = sunLongitude(birthJDE);
  // monthIndex 0=寅(315°), 1=卯(345°), ..., 11=丑(285°)
  const monthIndex = Math.floor(((sunLon - 315 + 360) % 360) / 30);
  const branch = (monthIndex + 2) % 12; // 寅=2, 卯=3, ...
  // 五虎遁年起月: stem = (yearStem%5 * 2 + 2 + monthIndex) % 10
  const stem = (((yearStem % 5) * 2 + 2 + monthIndex) % 10 + 10) % 10;
  return { stem, branch };
}

/** Compute day pillar from Julian Day Number. Reference: JDN 2451545 = 甲戌 (index 10). */
function calcDayPillar(jdn: number): Pillar {
  const dayIndex = ((jdn + 5) % 60 + 60) % 60;
  return { stem: dayIndex % 10, branch: dayIndex % 12 };
}

/** Compute hour pillar from local hour and day stem. */
function calcHourPillar(hour: number, dayStem: number): Pillar {
  const branch = Math.floor((hour + 1) / 2) % 12;
  const stem = (((dayStem % 5) * 2 + branch) % 10 + 10) % 10;
  return { stem, branch };
}

// ---- Luck Cycles (大運) ----

function calcLuckCycles(
  input: BaziInput,
  yearStem: number,
  monthPillar: Pillar,
  birthJDE: number,
): { isForward: boolean; startYears: number; startMonths: number; cycles: LuckCycle[] } {
  // Yang year stems: 0,2,4,6,8 (甲丙戊庚壬) — even index
  const isYangYear = yearStem % 2 === 0;
  const isMale = input.gender === 'male';
  // Forward if: (male + yang) or (female + yin)
  const isForward = (isMale && isYangYear) || (!isMale && !isYangYear);

  // Determine which 節 interval birth falls in via monthIndex
  const sunLon = sunLongitude(birthJDE);
  const monthIndex = Math.floor(((sunLon - 315 + 360) % 360) / 30);

  // Find adjacent term JDE
  let termJDE: number;
  if (isForward) {
    // Next 節 after birth
    termJDE = findNextTermJDE(birthJDE, (monthIndex + 1) % 12);
  } else {
    // Previous 節 before birth
    termJDE = findPrevTermJDE(birthJDE, monthIndex);
  }

  const daysToTerm = Math.abs(birthJDE - termJDE);
  const startYears = Math.floor(daysToTerm / 3);
  const startMonths = Math.floor((daysToTerm % 3) * 4);

  const monthSexag = sexagIndex(monthPillar.stem, monthPillar.branch);
  const delta = isForward ? 1 : -1;

  const cycles: LuckCycle[] = [];
  for (let i = 0; i < 8; i++) {
    const cycleIdx = ((monthSexag + delta * (i + 1)) % 60 + 60) % 60;
    cycles.push({
      index: i,
      pillar: sexagToPillar(cycleIdx),
      startAge: startYears + i * 10,
      startYear: input.year + startYears + i * 10,
    });
  }

  return { isForward, startYears, startMonths, cycles };
}

// ---- Public API ----

/** Calculate a complete Bazi chart from birth input. */
export function calculateBazi(input: BaziInput): BaziChart {
  const jdn = dateToJDN(input.year, input.month, input.day);
  // JDE at birth (local time, no tz conversion per spec)
  const birthJDE = jdn - 0.5 + input.hour / 24 + input.minute / 1440;

  const yearPillar = calcYearPillar(input, birthJDE);
  const monthPillar = calcMonthPillar(birthJDE, yearPillar.stem);
  const dayPillar = calcDayPillar(jdn);
  const hourPillar = calcHourPillar(input.hour, dayPillar.stem);

  const { isForward, startYears, startMonths, cycles } = calcLuckCycles(
    input,
    yearPillar.stem,
    monthPillar,
    birthJDE,
  );

  return {
    input,
    yearPillar,
    monthPillar,
    dayPillar,
    hourPillar,
    isForward,
    luckStartYears: startYears,
    luckStartMonths: startMonths,
    luckCycles: cycles,
  };
}

/** Get today's year/month/day pillars (for the 今日干支 banner). */
export function getTodayGanzhi(): { yearPillar: Pillar; monthPillar: Pillar; dayPillar: Pillar } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const hour = now.getHours();

  const fakeInput: BaziInput = { year, month, day, hour, minute: 0, gender: 'male' };
  const jdn = dateToJDN(year, month, day);
  const birthJDE = jdn - 0.5 + hour / 24;

  const yearPillar = calcYearPillar(fakeInput, birthJDE);
  const monthPillar = calcMonthPillar(birthJDE, yearPillar.stem);
  const dayPillar = calcDayPillar(jdn);

  return { yearPillar, monthPillar, dayPillar };
}

/** Count Wu-xing elements across all 8 characters of a bazi chart. */
export function countElements(chart: BaziChart): Record<string, number> {
  const counts: Record<string, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  for (const pillar of [chart.yearPillar, chart.monthPillar, chart.dayPillar, chart.hourPillar]) {
    counts[STEM_ELEMENTS[pillar.stem]]++;
    counts[BRANCH_ELEMENTS[pillar.branch]]++;
  }
  return counts;
}
