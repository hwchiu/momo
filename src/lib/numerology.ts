// Numerology calculation engine
// All numbers use Pythagorean numerology system.
// Master numbers 11, 22, 33 are preserved (not reduced further).

import type { NumerologyResult, PinnaclePeriod } from '../types/numerology';
import { PINNACLE_LABELS } from '../types/numerology';

/** Sum all digits of a positive integer. */
function digitSum(n: number): number {
  return String(Math.abs(Math.round(n)))
    .split('')
    .reduce((a, d) => a + parseInt(d, 10), 0);
}

/**
 * Reduce n to a single digit (1–9), preserving master numbers 11, 22, 33.
 * keepMaster=false reduces everything to 1–9 (used for challenges).
 */
export function reduceNumber(n: number, keepMaster = true): number {
  if (keepMaster && (n === 11 || n === 22 || n === 33)) return n;
  if (n >= 1 && n <= 9) return n;
  if (n === 0) return 0; // challenge number can be 0
  return reduceNumber(digitSum(n), keepMaster);
}

/** Compute Life Path Number from birth date. */
export function calcLifePath(year: number, month: number, day: number): number {
  // Reduce each component first, then sum and reduce (preserves master numbers).
  const m = reduceNumber(month);
  const d = reduceNumber(day);
  const y = reduceNumber(digitSum(year));
  return reduceNumber(m + d + y);
}

/** Birthday Number = birth day reduced to single digit (master-aware). */
export function calcBirthdayNumber(day: number): number {
  return reduceNumber(day);
}

/** Personal Year Number for a given reference year. */
export function calcPersonalYear(birthMonth: number, birthDay: number, refYear: number): number {
  const m = reduceNumber(birthMonth);
  const d = reduceNumber(birthDay);
  const y = reduceNumber(digitSum(refYear));
  return reduceNumber(m + d + y);
}

/** Personal Month Number. */
export function calcPersonalMonth(personalYear: number, refMonth: number): number {
  return reduceNumber(personalYear + refMonth);
}

/** Personal Day Number. */
export function calcPersonalDay(personalMonth: number, refDay: number): number {
  return reduceNumber(personalMonth + refDay);
}

/**
 * Challenge Numbers — use simple single digits (no master numbers).
 * C1 = |month − day|
 * C2 = |year − day|
 * C3 = |C1 − C2|
 * C4 = |month − year|
 */
export function calcChallenges(
  year: number,
  month: number,
  day: number,
): [number, number, number, number] {
  const m = reduceNumber(month, false);
  const d = reduceNumber(day, false);
  const y = reduceNumber(digitSum(year), false);
  const c1 = Math.abs(m - d);
  const c2 = Math.abs(y - d);
  const c3 = Math.abs(c1 - c2);
  const c4 = Math.abs(m - y);
  return [c1, c2, c3, c4];
}

/**
 * Pinnacle Cycles.
 * P1 = month + day  (reduced)
 * P2 = day + year   (reduced)
 * P3 = P1 + P2      (reduced)
 * P4 = month + year (reduced)
 *
 * Duration: P1 ends at age (36 − lifePath); each subsequent pinnacle = 9 years.
 * P4 is ongoing (endAge = null).
 */
export function calcPinnacles(
  year: number,
  month: number,
  day: number,
  lifePath: number,
): PinnaclePeriod[] {
  const m = reduceNumber(month);
  const d = reduceNumber(day);
  const y = reduceNumber(digitSum(year));

  const p1 = reduceNumber(m + d);
  const p2 = reduceNumber(d + y);
  const p3 = reduceNumber(p1 + p2);
  const p4 = reduceNumber(m + y);

  // For master-number life paths treat as their reduced value for duration calc
  const lpBase = lifePath > 9 ? reduceNumber(lifePath, false) : lifePath;
  const end1 = 36 - lpBase;

  return [
    { number: p1, startAge: 0, endAge: end1, label: PINNACLE_LABELS[0] },
    { number: p2, startAge: end1 + 1, endAge: end1 + 9, label: PINNACLE_LABELS[1] },
    { number: p3, startAge: end1 + 10, endAge: end1 + 18, label: PINNACLE_LABELS[2] },
    { number: p4, startAge: end1 + 19, endAge: null, label: PINNACLE_LABELS[3] },
  ];
}

/** Full numerology calculation. refDate defaults to today if not provided. */
export function calculateNumerology(
  birthYear: number,
  birthMonth: number,
  birthDay: number,
  refDate?: { year: number; month: number; day: number },
): NumerologyResult {
  const today = new Date();
  const refYear = refDate?.year ?? today.getFullYear();
  const refMonth = refDate?.month ?? today.getMonth() + 1;
  const refDay = refDate?.day ?? today.getDate();

  const lifePath = calcLifePath(birthYear, birthMonth, birthDay);
  const birthdayNumber = calcBirthdayNumber(birthDay);
  const personalYear = calcPersonalYear(birthMonth, birthDay, refYear);
  const personalMonth = calcPersonalMonth(personalYear, refMonth);
  const personalDay = calcPersonalDay(personalMonth, refDay);
  const challenges = calcChallenges(birthYear, birthMonth, birthDay);
  const pinnacles = calcPinnacles(birthYear, birthMonth, birthDay, lifePath);

  return {
    birthYear,
    birthMonth,
    birthDay,
    lifePath,
    birthdayNumber,
    personalYear,
    personalMonth,
    personalDay,
    refYear,
    refMonth,
    refDay,
    challenges,
    pinnacles,
  };
}
