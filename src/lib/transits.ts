/**
 * Predictive astrology engine — 推運計算引擎
 *
 * Four techniques:
 *  1. Transits (過境)              — current planetary positions vs natal
 *  2. Secondary Progressions (二次推運) — 1 day after birth = 1 year of life
 *  3. Solar Arc Directions (太陽弧)  — all planets advance by SP Sun - natal Sun
 *  4. Annual Profections (年度流年法) — whole-sign house activated each year of life
 */

import type { NatalChart, BirthData, PlanetPosition } from '../types/astro';
import { Planet, ZodiacSign, AspectType, HouseSystem, ZODIAC_SIGNS } from '../types/astro';
import { calculateNatalChart, birthDataToJDE } from './astro';
import { dateToJDN } from './bazi';

// ---- Utilities ----

/** Gregorian Date → JDE (UTC noon as base) */
function dateToJDE(d: Date): number {
  return (
    dateToJDN(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()) -
    0.5 +
    d.getUTCHours() / 24 +
    d.getUTCMinutes() / 1440
  );
}

/** JDE → Date */
function jdeToDate(jde: number): Date {
  return new Date(Date.UTC(2000, 0, 1, 12, 0, 0) + (jde - 2451545.0) * 86400000);
}

/** Normalize angle to [0, 360) */
function norm(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/**
 * Get planet positions at a given UTC Date, using natal lat/lon (needed for house calculation,
 * but ecliptic longitudes are observer-independent).
 */
function getPlanetsAtDate(date: Date, natalChart: NatalChart): PlanetPosition[] {
  const bd: BirthData = {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
    latitude: natalChart.birthData.latitude,
    longitude: natalChart.birthData.longitude,
    locationName: natalChart.birthData.locationName,
  };
  return calculateNatalChart(bd, HouseSystem.WholeSign).planets;
}

// ---- Types ----

export interface TransitAspect {
  transitPlanet: Planet;
  natalPlanet: Planet;
  type: AspectType;
  /** Angular orb in degrees */
  orb: number;
  /** True = aspect is tightening over time */
  applying: boolean;
}

export interface TransitPlanetRow {
  planet: Planet;
  longitude: number;
  sign: ZodiacSign;
  degree: number;
  minute: number;
  retrograde: boolean;
}

export interface TransitChart {
  date: Date;
  planets: TransitPlanetRow[];
  aspects: TransitAspect[];
}

export interface ProgressedChart {
  date: Date;
  progressedAge: number; // years
  planets: TransitPlanetRow[];
  progressedAsc: number;
  progressedMC: number;
  aspects: TransitAspect[];
}

export interface SolarArcChart {
  date: Date;
  solarArc: number; // degrees
  planets: TransitPlanetRow[];
  aspects: TransitAspect[];
}

export interface ProfectionResult {
  age: number;
  activatedHouse: number; // 1-12
  activatedSign: ZodiacSign;
  lordOfYear: Planet;
  lordPosition: PlanetPosition | undefined;
  houseTopicZh: string;
}

// ---- Cross-aspect detection ----

const ASPECT_ANGLES: AspectType[] = [
  AspectType.Conjunction,
  AspectType.Sextile,
  AspectType.Square,
  AspectType.Trine,
  AspectType.Opposition,
];

function angularDiff(lon1: number, lon2: number): number {
  let d = Math.abs(lon1 - lon2) % 360;
  if (d > 180) d = 360 - d;
  return d;
}

function getOrb(lon1: number, lon2: number, angle: number): number {
  return Math.abs(angularDiff(lon1, lon2) - angle);
}

/**
 * Determine applying/separating by comparing orbs at t vs t+1 day.
 * Requires the transit planet's longitude one day later.
 */
function isApplying(
  tLon: number,
  tLonNext: number,
  nLon: number,
  aspectAngle: number,
): boolean {
  const orbNow = getOrb(tLon, nLon, aspectAngle);
  const orbNext = getOrb(tLonNext, nLon, aspectAngle);
  return orbNext < orbNow;
}

/** Find all cross-aspects between transiting and natal planets */
function findCrossAspects(
  transiting: TransitPlanetRow[],
  transitingNext: PlanetPosition[], // positions 1 day later (for applying check)
  natal: PlanetPosition[],
  maxOrb: number,
): TransitAspect[] {
  const aspects: TransitAspect[] = [];

  for (const tp of transiting) {
    const tpNext = transitingNext.find((p) => p.planet === tp.planet);
    for (const np of natal) {
      for (const aspectAngle of ASPECT_ANGLES) {
        const orb = getOrb(tp.longitude, np.longitude, aspectAngle as number);
        if (orb <= maxOrb) {
          const applying = tpNext
            ? isApplying(tp.longitude, tpNext.longitude, np.longitude, aspectAngle as number)
            : false;
          aspects.push({
            transitPlanet: tp.planet,
            natalPlanet: np.planet,
            type: aspectAngle,
            orb: Math.round(orb * 100) / 100,
            applying,
          });
        }
      }
    }
  }

  return aspects.sort((a, b) => a.orb - b.orb);
}

function toPlanetRows(positions: PlanetPosition[]): TransitPlanetRow[] {
  return positions.map((p) => ({
    planet: p.planet,
    longitude: p.longitude,
    sign: p.sign,
    degree: p.degree,
    minute: p.minute,
    retrograde: p.retrograde,
  }));
}

// ---- Public API ----

/**
 * Transits: current planetary positions vs natal (2° orb).
 */
export function getTransitChart(natalChart: NatalChart, date: Date): TransitChart {
  const noon = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12, 0, 0),
  );
  const noonNext = new Date(noon.getTime() + 86400000);

  const transitPlanets = getPlanetsAtDate(noon, natalChart);
  const transitPlanetsNext = getPlanetsAtDate(noonNext, natalChart);

  const rows = toPlanetRows(transitPlanets);
  const aspects = findCrossAspects(rows, transitPlanetsNext, natalChart.planets, 2.0);

  return { date: noon, planets: rows, aspects };
}

/**
 * Secondary Progressions: each elapsed day after birth = 1 year of life (2° orb).
 */
export function getProgressedChart(natalChart: NatalChart, date: Date): ProgressedChart {
  const birthJDE = birthDataToJDE(natalChart.birthData);
  const targetJDE = dateToJDE(date);
  const ageInYears = (targetJDE - birthJDE) / 365.25;

  // Progressed JDE = birthJDE + age_in_years (days)
  const progressedJDE = birthJDE + ageInYears;
  const progressedJDENext = progressedJDE + (1 / 365.25); // 1 year later = 1 more day

  const progDate = jdeToDate(progressedJDE);
  const progDateNext = jdeToDate(progressedJDENext);

  const progPlanets = getPlanetsAtDate(progDate, natalChart);
  const progPlanetsNext = getPlanetsAtDate(progDateNext, natalChart);

  // Progressed Asc/MC: calculate chart at progressed date with natal location
  const progBD: BirthData = {
    ...natalChart.birthData,
    year: progDate.getUTCFullYear(),
    month: progDate.getUTCMonth() + 1,
    day: progDate.getUTCDate(),
    hour: progDate.getUTCHours(),
    minute: progDate.getUTCMinutes(),
  };
  const progFullChart = calculateNatalChart(progBD, HouseSystem.WholeSign);

  const rows = toPlanetRows(progPlanets);
  const aspects = findCrossAspects(rows, progPlanetsNext, natalChart.planets, 2.0);

  return {
    date,
    progressedAge: ageInYears,
    planets: rows,
    progressedAsc: progFullChart.ascendant,
    progressedMC: progFullChart.midheaven,
    aspects,
  };
}

/**
 * Solar Arc Directions: all natal planets advanced by (SP Sun - natal Sun) degrees (1° orb).
 */
export function getSolarArcChart(natalChart: NatalChart, date: Date): SolarArcChart {
  const progChart = getProgressedChart(natalChart, date);
  const natalSun = natalChart.planets.find((p) => p.planet === Planet.Sun)!;
  const progSun = progChart.planets.find((p) => p.planet === Planet.Sun)!;

  // Solar arc: how many degrees the Sun has advanced since birth
  let solarArc = norm(progSun.longitude - natalSun.longitude);
  if (solarArc > 180) solarArc -= 360; // usually positive 0–90° within a lifetime

  // Apply solar arc to all natal planets
  const saPositions: TransitPlanetRow[] = natalChart.planets.map((p) => {
    const newLon = norm(p.longitude + solarArc);
    const newSign = Math.floor(newLon / 30) as ZodiacSign;
    return {
      planet: p.planet,
      longitude: newLon,
      sign: newSign,
      degree: Math.floor(newLon % 30),
      minute: Math.floor((newLon % 1) * 60),
      retrograde: p.retrograde,
    };
  });

  // SA-to-natal aspects (tight 1° orb)
  const aspects = findCrossAspects(saPositions, [], natalChart.planets, 1.0);

  return { date, solarArc: Math.abs(solarArc), planets: saPositions, aspects };
}

// ---- House topics for profection display ----

const HOUSE_TOPICS_ZH: string[] = [
  '本人・身體・性格',         // 1
  '財務・資產・價值觀',        // 2
  '溝通・兄弟・短途旅行',      // 3
  '家庭・房產・根源',          // 4
  '創意・子女・戀愛',          // 5
  '健康・工作・日常',          // 6
  '婚姻・伴侶・公開關係',      // 7
  '死亡・遺產・共享資源',      // 8
  '信仰・高等教育・遠途旅行',  // 9
  '事業・名聲・公共地位',      // 10
  '友誼・社群・理想',          // 11
  '隱藏・療癒・靈性',          // 12
];

// Classical sign rulers (7 planets)
const SIGN_RULER: Partial<Record<ZodiacSign, Planet>> = {
  [ZodiacSign.Aries]: Planet.Mars,
  [ZodiacSign.Taurus]: Planet.Venus,
  [ZodiacSign.Gemini]: Planet.Mercury,
  [ZodiacSign.Cancer]: Planet.Moon,
  [ZodiacSign.Leo]: Planet.Sun,
  [ZodiacSign.Virgo]: Planet.Mercury,
  [ZodiacSign.Libra]: Planet.Venus,
  [ZodiacSign.Scorpio]: Planet.Mars,
  [ZodiacSign.Sagittarius]: Planet.Jupiter,
  [ZodiacSign.Capricorn]: Planet.Saturn,
  [ZodiacSign.Aquarius]: Planet.Saturn,
  [ZodiacSign.Pisces]: Planet.Jupiter,
};

/**
 * Annual Profections: activated house shifts by 1 each year (age 0 → H1, age 1 → H2, ...).
 */
export function getProfection(natalChart: NatalChart, date: Date): ProfectionResult {
  const birthDate = new Date(
    Date.UTC(
      natalChart.birthData.year,
      natalChart.birthData.month - 1,
      natalChart.birthData.day,
      natalChart.birthData.hour,
      natalChart.birthData.minute,
    ),
  );
  const ageInYears = (date.getTime() - birthDate.getTime()) / (365.25 * 86400000);
  const age = Math.floor(ageInYears);
  const houseIdx = age % 12; // 0-11
  const activatedHouse = houseIdx + 1; // 1-12

  const houseCusp = natalChart.houses[houseIdx];
  const activatedSign = houseCusp.sign;
  const lordOfYear = SIGN_RULER[activatedSign] ?? Planet.Sun;
  const lordPosition = natalChart.planets.find((p) => p.planet === lordOfYear);

  return {
    age,
    activatedHouse,
    activatedSign,
    lordOfYear,
    lordPosition,
    houseTopicZh: HOUSE_TOPICS_ZH[houseIdx],
  };
}

// ---- Firdaria (法達) — Arabic planetary time-lord system ----

/** A planet or lunar node acting as Firdaria lord */
export type FirdariaLord = Planet | 'NorthNode' | 'SouthNode';

export interface FirdariaSubPeriod {
  lord: Planet;     // classical planet lord for this sub-period
  startDate: Date;
  endDate: Date;
}

export interface FirdariaPeriod {
  lord: FirdariaLord;
  years: number;
  startDate: Date;
  endDate: Date;
  subPeriods: FirdariaSubPeriod[];
}

export interface FirdariaResult {
  isDay: boolean;
  allPeriods: FirdariaPeriod[];      // all 9 periods in the current 75-year cycle
  currentPeriod: FirdariaPeriod;
  currentSubPeriod: FirdariaSubPeriod;
}

// Day chart: Sun (10y), Venus (8y), Mercury (13y), Moon (9y), Saturn (11y), Jupiter (12y), Mars (7y), ☊ (3y), ☋ (2y)
const DAY_FIRDARIA: Array<[FirdariaLord, number]> = [
  [Planet.Sun, 10], [Planet.Venus, 8], [Planet.Mercury, 13], [Planet.Moon, 9],
  [Planet.Saturn, 11], [Planet.Jupiter, 12], [Planet.Mars, 7],
  ['NorthNode', 3], ['SouthNode', 2],
];

// Night chart: Moon (9y), Saturn (11y), Jupiter (12y), Mars (7y), Sun (10y), Venus (8y), Mercury (13y), ☊ (3y), ☋ (2y)
const NIGHT_FIRDARIA: Array<[FirdariaLord, number]> = [
  [Planet.Moon, 9], [Planet.Saturn, 11], [Planet.Jupiter, 12], [Planet.Mars, 7],
  [Planet.Sun, 10], [Planet.Venus, 8], [Planet.Mercury, 13],
  ['NorthNode', 3], ['SouthNode', 2],
];

const DAY_SEQ7: Planet[] = [Planet.Sun, Planet.Venus, Planet.Mercury, Planet.Moon, Planet.Saturn, Planet.Jupiter, Planet.Mars];
const NIGHT_SEQ7: Planet[] = [Planet.Moon, Planet.Saturn, Planet.Jupiter, Planet.Mars, Planet.Sun, Planet.Venus, Planet.Mercury];

/** Sub-lords for a main period: 7 classical planets starting from the main lord */
function getFirdariaSubLords(mainLord: FirdariaLord, isDay: boolean): Planet[] {
  const seq7 = isDay ? DAY_SEQ7 : NIGHT_SEQ7;
  const startIdx = typeof mainLord === 'string' ? 0 : Math.max(0, seq7.indexOf(mainLord as Planet));
  return Array.from({ length: 7 }, (_, i) => seq7[(startIdx + i) % 7]);
}

function addYearsMs(date: Date, years: number): Date {
  return new Date(date.getTime() + years * 365.25 * 86400000);
}

/**
 * Firdaria: Arabic planetary time-lords.
 * Day/night sect determines sequence; 75-year cycle repeats through life.
 */
export function getFirdaria(natalChart: NatalChart, date: Date): FirdariaResult {
  const birthDate = new Date(Date.UTC(
    natalChart.birthData.year, natalChart.birthData.month - 1, natalChart.birthData.day,
    natalChart.birthData.hour, natalChart.birthData.minute,
  ));

  // Day chart: Sun in houses 7–12 (above horizon)
  const sunPos = natalChart.planets.find((p) => p.planet === Planet.Sun);
  const isDay = sunPos ? sunPos.house >= 7 : true;

  const sequence = isDay ? DAY_FIRDARIA : NIGHT_FIRDARIA;
  const cycleYears = 75;

  const ageMs = date.getTime() - birthDate.getTime();
  const ageInYears = ageMs / (365.25 * 86400000);
  const cycleNumber = Math.floor(Math.max(0, ageInYears) / cycleYears);
  const cycleStartDate = addYearsMs(birthDate, cycleNumber * cycleYears);

  // Build all 9 main periods for the current cycle
  const allPeriods: FirdariaPeriod[] = [];
  let cursor = new Date(cycleStartDate);

  for (const [lord, years] of sequence) {
    const periodStart = new Date(cursor);
    const periodEnd = addYearsMs(periodStart, years);
    const subLords = getFirdariaSubLords(lord, isDay);
    const subYears = years / 7;
    const subPeriods: FirdariaSubPeriod[] = subLords.map((subLord, i) => ({
      lord: subLord,
      startDate: addYearsMs(periodStart, i * subYears),
      endDate: addYearsMs(periodStart, (i + 1) * subYears),
    }));
    allPeriods.push({ lord, years, startDate: periodStart, endDate: periodEnd, subPeriods });
    cursor = periodEnd;
  }

  const currentPeriod = allPeriods.find((p) => date >= p.startDate && date < p.endDate)
    ?? allPeriods[allPeriods.length - 1];
  const currentSubPeriod =
    currentPeriod.subPeriods.find((sp) => date >= sp.startDate && date < sp.endDate)
    ?? currentPeriod.subPeriods[currentPeriod.subPeriods.length - 1];

  return { isDay, allPeriods, currentPeriod, currentSubPeriod };
}

// ---- Helpers for display (exported for TransitPanel) ----

/** Format longitude as "♑ 13° 24'" */
export function formatLon(lon: number): string {
  const signIdx = Math.floor(lon / 30) as ZodiacSign;
  const deg = Math.floor(lon % 30);
  const min = Math.floor(((lon % 30) - deg) * 60);
  return `${ZODIAC_SIGNS[signIdx].glyph} ${deg}°${String(min).padStart(2, '0')}'`;
}

export { ZODIAC_SIGNS };
