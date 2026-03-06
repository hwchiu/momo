/**
 * Vedic Astrology (Jyotish) calculation engine.
 *
 * Builds on top of the same astronomia library used by astro.ts:
 * - Tropical positions → subtract Ayanamsha → Sidereal positions
 * - Rashi, Nakshatra, Pada, Whole Sign houses
 * - Vimshottari Dasha timeline
 *
 * All input times are treated as UTC.
 */

// @ts-expect-error astronomia has no type declarations
import * as julian from 'astronomia/julian';
// @ts-expect-error astronomia has no type declarations
import * as solar from 'astronomia/solar';
// @ts-expect-error astronomia has no type declarations
import * as moonposition from 'astronomia/moonposition';
// @ts-expect-error astronomia has no type declarations
import * as sidereal from 'astronomia/sidereal';
// @ts-expect-error astronomia has no type declarations
import * as nutation from 'astronomia/nutation';
// @ts-expect-error astronomia has no type declarations
import * as planetposition from 'astronomia/planetposition';
// @ts-expect-error astronomia has no type declarations
import * as base from 'astronomia/base';
// @ts-expect-error astronomia has no type declarations
import data from 'astronomia/data';

import type {
  VedicInput,
  VedicChart,
  VedicPlanet,
  MahaDasha,
  AntarDasha,
  VedicAyanamsha,
} from '../types/vedic';
import {
  DASHA_ORDER,
  DASHA_ORDER_ZH,
  DASHA_YEARS,
} from '../types/vedic';

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;
const NAKSHATRA_SPAN = 360 / 27; // 13.3333...°

// ---- VSOP87 planet singleton ----

function createPlanetObjects() {
  return {
    earth: new planetposition.Planet(data.earth),
    mercury: new planetposition.Planet(data.mercury),
    venus: new planetposition.Planet(data.venus),
    mars: new planetposition.Planet(data.mars),
    jupiter: new planetposition.Planet(data.jupiter),
    saturn: new planetposition.Planet(data.saturn),
  };
}

let _vedicPlanets: ReturnType<typeof createPlanetObjects> | null = null;
function getVPlanets() {
  if (!_vedicPlanets) _vedicPlanets = createPlanetObjects();
  return _vedicPlanets;
}

// ---- JDE conversion ----

function inputToJDE(input: VedicInput): number {
  const fractionalDay = input.day + (input.hour + input.minute / 60) / 24;
  const cal = new julian.CalendarGregorian(input.year, input.month, fractionalDay);
  return cal.toJDE();
}

function jdeToDate(jde: number): Date {
  // JDE 2451545.0 = 2000-01-01 12:00 UTC
  const msFromJ2000 = (jde - 2451545.0) * 86400000;
  return new Date(Date.UTC(2000, 0, 1, 12, 0, 0, 0) + msFromJ2000);
}

function addYears(date: Date, years: number): Date {
  return new Date(date.getTime() + years * 365.2425 * 86400000);
}

// ---- Normalize ----

function norm(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

// ---- Ayanamsha ----

/**
 * Approximate Lahiri Chitrapaksha ayanamsha.
 * Value at J2000.0 = 23.85317°, precession ~50.29"/year.
 */
function getAyanamsha(jde: number, type: VedicAyanamsha): number {
  const T_years = (jde - 2451545.0) / 365.25;
  const rate = 50.29 / 3600; // degrees per year
  switch (type) {
    case 'lahiri':
      return 23.85317 + T_years * rate;
    case 'raman':
      return 22.460 + T_years * rate;
    case 'krishnamurti':
      return 23.7262 + T_years * rate;
  }
}

// ---- Tropical planetary positions ----

function tropicalSun(jde: number): number {
  const T = base.J2000Century(jde);
  return norm(solar.apparentLongitude(T) * DEG);
}

function tropicalMoon(jde: number): number {
  return norm(moonposition.position(jde).lon * DEG);
}

function tropicalPlanet(name: string, jde: number): number {
  const vp = getVPlanets();
  const earth = vp.earth;
  const planet = vp[name as keyof typeof vp];
  const ep = earth.position2000(jde);
  const pp = planet.position2000(jde);
  const dx = pp.range * Math.cos(pp.lat) * Math.cos(pp.lon) - ep.range * Math.cos(ep.lat) * Math.cos(ep.lon);
  const dy = pp.range * Math.cos(pp.lat) * Math.sin(pp.lon) - ep.range * Math.cos(ep.lat) * Math.sin(ep.lon);
  return norm(Math.atan2(dy, dx) * DEG);
}

/**
 * Mean Lunar Ascending Node (Rahu) — tropical longitude.
 * Formula: Ω = 125.04455 − 1934.13626·T + 0.00207·T² + T³/450000 (degrees)
 * where T = Julian centuries since J2000.0.
 */
function tropicalRahu(jde: number): number {
  const T = (jde - 2451545.0) / 36525.0;
  const omega = 125.04455 - 1934.13626 * T + 0.00207 * T * T + (T * T * T) / 450000;
  return norm(omega);
}

// ---- Tropical Lagna (Ascendant) ----

function tropicalLagna(jde: number, latitude: number, longitude: number): number {
  const gmst = sidereal.mean(jde);
  const lst = norm(gmst / 240 + longitude);
  const ramc = lst * RAD;
  const eps = nutation.meanObliquity(jde);
  const phi = latitude * RAD;

  const mcRad = Math.atan2(Math.sin(ramc), Math.cos(eps) * Math.cos(ramc));
  const mc = norm(mcRad * DEG);

  const ascRad = Math.atan2(-Math.cos(ramc), Math.sin(eps) * Math.tan(phi) + Math.cos(eps) * Math.sin(ramc));
  const asc = norm(ascRad * DEG);

  const arcFromMC = ((asc - mc) % 360 + 360) % 360;
  return arcFromMC <= 180 ? asc : norm(asc + 180);
}

// ---- Retrograde detection ----

function isRetrograde(getLon: (j: number) => number, jde: number): boolean {
  const before = getLon(jde - 1);
  const after = getLon(jde + 1);
  let diff = after - before;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return diff < 0;
}

// ---- Dignity ----

const EXALTATION_SIGN: Partial<Record<string, number>> = {
  Sun: 0 /* Aries */, Moon: 1 /* Taurus */, Mars: 9 /* Capricorn */,
  Mercury: 5 /* Virgo */, Jupiter: 3 /* Cancer */, Venus: 11 /* Pisces */,
  Saturn: 6 /* Libra */,
};
const DEBILITATION_SIGN: Partial<Record<string, number>> = {
  Sun: 6 /* Libra */, Moon: 7 /* Scorpio */, Mars: 3 /* Cancer */,
  Mercury: 11 /* Pisces */, Jupiter: 9 /* Capricorn */, Venus: 5 /* Virgo */,
  Saturn: 0 /* Aries */,
};

function getDignity(name: string, rashi: number): VedicPlanet['dignity'] {
  if (EXALTATION_SIGN[name] === rashi) return 'exalted';
  if (DEBILITATION_SIGN[name] === rashi) return 'debilitated';
  return null;
}

// ---- Nakshatra & Pada ----

function getNakshatra(siderealLon: number): { nakshatra: number; pada: number } {
  const normalized = norm(siderealLon);
  const nakshatra = Math.floor(normalized / NAKSHATRA_SPAN);
  const withinNak = normalized % NAKSHATRA_SPAN;
  const pada = Math.floor(withinNak / (NAKSHATRA_SPAN / 4)) + 1;
  return { nakshatra, pada };
}

// ---- Whole Sign house ----

function wholeSignHouse(planetRashi: number, lagnaRashi: number): number {
  return ((planetRashi - lagnaRashi + 12) % 12) + 1;
}

// ---- Build planet list ----

const PLANET_DEFS: Array<{
  name: string;
  nameZh: string;
  abbr: string;
  getLon: (jde: number) => number;
  alwaysRetrograde?: boolean;
}> = [
  { name: 'Sun', nameZh: '太陽', abbr: 'Su', getLon: tropicalSun },
  { name: 'Moon', nameZh: '月亮', abbr: 'Mo', getLon: tropicalMoon },
  { name: 'Mars', nameZh: '火星', abbr: 'Ma', getLon: (j) => tropicalPlanet('mars', j) },
  { name: 'Mercury', nameZh: '水星', abbr: 'Me', getLon: (j) => tropicalPlanet('mercury', j) },
  { name: 'Jupiter', nameZh: '木星', abbr: 'Ju', getLon: (j) => tropicalPlanet('jupiter', j) },
  { name: 'Venus', nameZh: '金星', abbr: 'Ve', getLon: (j) => tropicalPlanet('venus', j) },
  { name: 'Saturn', nameZh: '土星', abbr: 'Sa', getLon: (j) => tropicalPlanet('saturn', j) },
  { name: 'Rahu', nameZh: '羅睺', abbr: 'Ra', getLon: tropicalRahu, alwaysRetrograde: true },
];

function buildPlanets(jde: number, ayanamsha: number, lagnaRashi: number): VedicPlanet[] {
  const planets: VedicPlanet[] = [];

  for (const def of PLANET_DEFS) {
    const tropicalLon = def.getLon(jde);
    const siderealLon = norm(tropicalLon - ayanamsha);
    const rashi = Math.floor(siderealLon / 30);
    const degreeInRashi = siderealLon % 30;
    const { nakshatra, pada } = getNakshatra(siderealLon);
    const house = wholeSignHouse(rashi, lagnaRashi);
    const retrograde = def.alwaysRetrograde ? true : isRetrograde(def.getLon, jde);

    planets.push({
      name: def.name,
      nameZh: def.nameZh,
      abbr: def.abbr,
      tropicalLon,
      siderealLon,
      rashi,
      degreeInRashi,
      nakshatra,
      pada,
      house,
      retrograde,
      dignity: getDignity(def.name, rashi),
    });
  }

  // Ketu = Rahu + 180°
  const rahu = planets.find((p) => p.name === 'Rahu')!;
  const ketuSidereal = norm(rahu.siderealLon + 180);
  const ketuRashi = Math.floor(ketuSidereal / 30);
  const { nakshatra: ketuNak, pada: ketuPada } = getNakshatra(ketuSidereal);
  planets.push({
    name: 'Ketu',
    nameZh: '計都',
    abbr: 'Ke',
    tropicalLon: norm(rahu.tropicalLon + 180),
    siderealLon: ketuSidereal,
    rashi: ketuRashi,
    degreeInRashi: ketuSidereal % 30,
    nakshatra: ketuNak,
    pada: ketuPada,
    house: wholeSignHouse(ketuRashi, lagnaRashi),
    retrograde: true,
    dignity: getDignity('Ketu', ketuRashi),
  });

  return planets;
}

// ---- Vimshottari Dasha ----

function buildDashas(moon: VedicPlanet, birthDate: Date): MahaDasha[] {
  const moonLon = moon.siderealLon;
  const moonNakshatra = Math.floor(moonLon / NAKSHATRA_SPAN);
  const lordIdx = moonNakshatra % 9; // index in DASHA_ORDER

  // How far through the current nakshatra
  const nakshatraStart = moonNakshatra * NAKSHATRA_SPAN;
  const elapsed = (moonLon - nakshatraStart) / NAKSHATRA_SPAN; // 0-1
  const remaining = 1 - elapsed;
  const firstYears = DASHA_YEARS[lordIdx] * remaining;

  const now = new Date();
  const dashas: MahaDasha[] = [];
  let cursor = birthDate;

  for (let i = 0; i < 9; i++) {
    const idx = (lordIdx + i) % 9;
    const totalYears = i === 0 ? firstYears : DASHA_YEARS[idx];
    const endDate = addYears(cursor, totalYears);
    const isCurrent = now >= cursor && now < endDate;

    // Antardasha: sub-lords start from the same lord, go through all 9
    const antardasha: AntarDasha[] = [];
    let aCursor = cursor;
    for (let j = 0; j < 9; j++) {
      const aIdx = (idx + j) % 9;
      const aDurationYears = (totalYears * DASHA_YEARS[aIdx]) / 120;
      const aEnd = addYears(aCursor, aDurationYears);
      antardasha.push({
        lord: DASHA_ORDER[aIdx],
        lordZh: DASHA_ORDER_ZH[aIdx],
        startDate: new Date(aCursor),
        endDate: aEnd,
        isCurrent: now >= aCursor && now < aEnd,
      });
      aCursor = aEnd;
    }

    dashas.push({
      lord: DASHA_ORDER[idx],
      lordZh: DASHA_ORDER_ZH[idx],
      startDate: new Date(cursor),
      endDate,
      durationYears: totalYears,
      antardasha,
      isCurrent,
    });
    cursor = endDate;
  }

  return dashas;
}

// ---- Public API ----

/** Calculate a complete Vedic natal chart. */
export function calculateVedicChart(input: VedicInput): VedicChart {
  const jde = inputToJDE(input);
  const ayanamshaValue = getAyanamsha(jde, input.ayanamsha);

  // Tropical Lagna → Sidereal
  const tropLagna = tropicalLagna(jde, input.latitude, input.longitude);
  const siderealLagna = norm(tropLagna - ayanamshaValue);
  const lagnaRashi = Math.floor(siderealLagna / 30);

  const planets = buildPlanets(jde, ayanamshaValue, lagnaRashi);

  const moon = planets.find((p) => p.name === 'Moon')!;
  const birthDate = jdeToDate(jde);
  const dashas = buildDashas(moon, birthDate);

  return {
    input,
    ayanamshaValue,
    lagna: siderealLagna,
    lagnaRashi,
    planets,
    dashas,
  };
}
