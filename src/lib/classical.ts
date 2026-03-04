/**
 * Classical astrology dignity data and helper functions.
 *
 * Implements: domicile, exaltation, detriment, fall, triplicity,
 * Egyptian terms, decans/faces, dignity scores, combust detection,
 * sect detection, and oriental/occidental determination.
 */

import { Planet, ZodiacSign } from '../types/astro';
import type { PlanetPosition } from '../types/astro';

// ---- Domicile (本垣) ----

export const DOMICILE: Partial<Record<Planet, ZodiacSign[]>> = {
  [Planet.Sun]: [ZodiacSign.Leo],
  [Planet.Moon]: [ZodiacSign.Cancer],
  [Planet.Mercury]: [ZodiacSign.Gemini, ZodiacSign.Virgo],
  [Planet.Venus]: [ZodiacSign.Taurus, ZodiacSign.Libra],
  [Planet.Mars]: [ZodiacSign.Aries, ZodiacSign.Scorpio],
  [Planet.Jupiter]: [ZodiacSign.Sagittarius, ZodiacSign.Pisces],
  [Planet.Saturn]: [ZodiacSign.Capricorn, ZodiacSign.Aquarius],
};

// ---- Exaltation (曜升) ----
// sign + exact degree of exaltation

export interface ExaltationData {
  sign: ZodiacSign;
  degree: number;
}

export const EXALTATION: Partial<Record<Planet, ExaltationData>> = {
  [Planet.Sun]: { sign: ZodiacSign.Aries, degree: 19 },
  [Planet.Moon]: { sign: ZodiacSign.Taurus, degree: 3 },
  [Planet.Mercury]: { sign: ZodiacSign.Virgo, degree: 15 },
  [Planet.Venus]: { sign: ZodiacSign.Pisces, degree: 27 },
  [Planet.Mars]: { sign: ZodiacSign.Capricorn, degree: 28 },
  [Planet.Jupiter]: { sign: ZodiacSign.Cancer, degree: 15 },
  [Planet.Saturn]: { sign: ZodiacSign.Libra, degree: 21 },
};

// ---- Detriment (落): opposite sign(s) of domicile ----

function oppositeSign(sign: ZodiacSign): ZodiacSign {
  return ((sign + 6) % 12) as ZodiacSign;
}

export const DETRIMENT: Partial<Record<Planet, ZodiacSign[]>> = Object.fromEntries(
  (Object.entries(DOMICILE) as [Planet, ZodiacSign[]][]).map(([planet, signs]) => [
    planet,
    signs.map(oppositeSign),
  ]),
) as Partial<Record<Planet, ZodiacSign[]>>;

// ---- Fall (陷): opposite sign of exaltation ----

export const FALL: Partial<Record<Planet, ZodiacSign>> = Object.fromEntries(
  (Object.entries(EXALTATION) as [Planet, ExaltationData][]).map(([planet, data]) => [
    planet,
    oppositeSign(data.sign),
  ]),
) as Partial<Record<Planet, ZodiacSign>>;

// ---- Triplicity rulers (三分主星) ----
// classical Ptolemaic triplicities: day ruler, night ruler, participating ruler

export interface TriplicityRulers {
  day: Planet;
  night: Planet;
  participating: Planet;
}

// Triplicities keyed by element (fire/earth/air/water)
export type ElementName = 'fire' | 'earth' | 'air' | 'water';

export const TRIPLICITY_RULERS: Record<ElementName, TriplicityRulers> = {
  fire: { day: Planet.Sun, night: Planet.Jupiter, participating: Planet.Saturn },
  earth: { day: Planet.Venus, night: Planet.Moon, participating: Planet.Mars },
  air: { day: Planet.Saturn, night: Planet.Mercury, participating: Planet.Jupiter },
  water: { day: Planet.Mars, night: Planet.Venus, participating: Planet.Moon },
};

const SIGN_ELEMENT: Record<ZodiacSign, ElementName> = {
  [ZodiacSign.Aries]: 'fire',
  [ZodiacSign.Leo]: 'fire',
  [ZodiacSign.Sagittarius]: 'fire',
  [ZodiacSign.Taurus]: 'earth',
  [ZodiacSign.Virgo]: 'earth',
  [ZodiacSign.Capricorn]: 'earth',
  [ZodiacSign.Gemini]: 'air',
  [ZodiacSign.Libra]: 'air',
  [ZodiacSign.Aquarius]: 'air',
  [ZodiacSign.Cancer]: 'water',
  [ZodiacSign.Scorpio]: 'water',
  [ZodiacSign.Pisces]: 'water',
};

export function getTriplicityRulers(sign: ZodiacSign): TriplicityRulers {
  return TRIPLICITY_RULERS[SIGN_ELEMENT[sign]];
}

// ---- Egyptian Terms / Bounds (界) ----

export interface TermEntry {
  planet: Planet;
  /** Exclusive upper bound (0-based degree within sign, 0-29) */
  endDegree: number;
}

// Each sign has an array of {planet, endDegree} in ascending order
export const EGYPTIAN_TERMS: Record<ZodiacSign, TermEntry[]> = {
  [ZodiacSign.Aries]: [
    { planet: Planet.Jupiter, endDegree: 6 },
    { planet: Planet.Venus, endDegree: 14 },
    { planet: Planet.Mercury, endDegree: 21 },
    { planet: Planet.Mars, endDegree: 26 },
    { planet: Planet.Saturn, endDegree: 30 },
  ],
  [ZodiacSign.Taurus]: [
    { planet: Planet.Venus, endDegree: 8 },
    { planet: Planet.Mercury, endDegree: 15 },
    { planet: Planet.Jupiter, endDegree: 22 },
    { planet: Planet.Saturn, endDegree: 27 },
    { planet: Planet.Mars, endDegree: 30 },
  ],
  [ZodiacSign.Gemini]: [
    { planet: Planet.Mercury, endDegree: 7 },
    { planet: Planet.Jupiter, endDegree: 13 },
    { planet: Planet.Venus, endDegree: 18 },
    { planet: Planet.Mars, endDegree: 24 },
    { planet: Planet.Saturn, endDegree: 30 },
  ],
  [ZodiacSign.Cancer]: [
    { planet: Planet.Mars, endDegree: 7 },
    { planet: Planet.Jupiter, endDegree: 13 },
    { planet: Planet.Mercury, endDegree: 20 },
    { planet: Planet.Venus, endDegree: 27 },
    { planet: Planet.Saturn, endDegree: 30 },
  ],
  [ZodiacSign.Leo]: [
    { planet: Planet.Jupiter, endDegree: 6 },
    { planet: Planet.Venus, endDegree: 11 },
    { planet: Planet.Saturn, endDegree: 18 },
    { planet: Planet.Mercury, endDegree: 24 },
    { planet: Planet.Mars, endDegree: 30 },
  ],
  [ZodiacSign.Virgo]: [
    { planet: Planet.Mercury, endDegree: 7 },
    { planet: Planet.Venus, endDegree: 13 },
    { planet: Planet.Jupiter, endDegree: 18 },
    { planet: Planet.Saturn, endDegree: 21 },
    { planet: Planet.Mars, endDegree: 30 },
  ],
  [ZodiacSign.Libra]: [
    { planet: Planet.Saturn, endDegree: 6 },
    { planet: Planet.Mercury, endDegree: 14 },
    { planet: Planet.Jupiter, endDegree: 21 },
    { planet: Planet.Venus, endDegree: 28 },
    { planet: Planet.Mars, endDegree: 30 },
  ],
  [ZodiacSign.Scorpio]: [
    { planet: Planet.Mars, endDegree: 7 },
    { planet: Planet.Jupiter, endDegree: 11 },
    { planet: Planet.Venus, endDegree: 19 },
    { planet: Planet.Mercury, endDegree: 24 },
    { planet: Planet.Saturn, endDegree: 30 },
  ],
  [ZodiacSign.Sagittarius]: [
    { planet: Planet.Jupiter, endDegree: 12 },
    { planet: Planet.Venus, endDegree: 17 },
    { planet: Planet.Mercury, endDegree: 21 },
    { planet: Planet.Saturn, endDegree: 26 },
    { planet: Planet.Mars, endDegree: 30 },
  ],
  [ZodiacSign.Capricorn]: [
    { planet: Planet.Mercury, endDegree: 7 },
    { planet: Planet.Jupiter, endDegree: 14 },
    { planet: Planet.Venus, endDegree: 22 },
    { planet: Planet.Saturn, endDegree: 26 },
    { planet: Planet.Mars, endDegree: 30 },
  ],
  [ZodiacSign.Aquarius]: [
    { planet: Planet.Mercury, endDegree: 7 },
    { planet: Planet.Venus, endDegree: 13 },
    { planet: Planet.Jupiter, endDegree: 20 },
    { planet: Planet.Mars, endDegree: 25 },
    { planet: Planet.Saturn, endDegree: 30 },
  ],
  [ZodiacSign.Pisces]: [
    { planet: Planet.Venus, endDegree: 12 },
    { planet: Planet.Jupiter, endDegree: 16 },
    { planet: Planet.Mercury, endDegree: 19 },
    { planet: Planet.Mars, endDegree: 28 },
    { planet: Planet.Saturn, endDegree: 30 },
  ],
};

/** Get the term (界) ruler for a given sign and degree (0-based within sign) */
export function getTermRuler(sign: ZodiacSign, degree: number): Planet | null {
  const terms = EGYPTIAN_TERMS[sign];
  for (const term of terms) {
    if (degree < term.endDegree) return term.planet;
  }
  return null;
}

// ---- Decans / Faces (十度) ----
// Chaldean order: Mars, Sun, Venus, Mercury, Moon, Saturn, Jupiter (repeating)

const CHALDEAN_ORDER: Planet[] = [
  Planet.Mars,
  Planet.Sun,
  Planet.Venus,
  Planet.Mercury,
  Planet.Moon,
  Planet.Saturn,
  Planet.Jupiter,
];

// Starting index in CHALDEAN_ORDER for the first decan of each sign
// Aries starts at Mars (index 0), each subsequent decan advances by 1
// Each sign has 3 decans (0-9°, 10-19°, 20-29°)
// The starting planet for the first decan of each sign (Chaldean order, Aries starts at Mars):
const DECAN_START_INDEX: Record<ZodiacSign, number> = {
  [ZodiacSign.Aries]: 0,       // Mars
  [ZodiacSign.Taurus]: 3,      // Mercury
  [ZodiacSign.Gemini]: 6,      // Jupiter
  [ZodiacSign.Cancer]: 2,      // Venus
  [ZodiacSign.Leo]: 5,         // Saturn
  [ZodiacSign.Virgo]: 1,       // Sun
  [ZodiacSign.Libra]: 4,       // Moon
  [ZodiacSign.Scorpio]: 0,     // Mars
  [ZodiacSign.Sagittarius]: 3, // Mercury
  [ZodiacSign.Capricorn]: 6,   // Jupiter
  [ZodiacSign.Aquarius]: 2,    // Venus
  [ZodiacSign.Pisces]: 5,      // Saturn
};

/** Get the decan/face (十度) ruler for a given sign and degree (0-based within sign) */
export function getDecanRuler(sign: ZodiacSign, degree: number): Planet {
  const decanIndex = Math.floor(degree / 10); // 0, 1, or 2
  const startIdx = DECAN_START_INDEX[sign];
  return CHALDEAN_ORDER[(startIdx + decanIndex) % 7];
}

// ---- Dignity Score (分數) ----
// +5 domicile, +4 exaltation, +3 triplicity, +2 term, +1 face
// -5 detriment, -4 fall

export interface DignityScore {
  domicile: number;    // +5 or 0
  exaltation: number;  // +4 or 0
  triplicity: number;  // +3 or 0
  term: number;        // +2 or 0
  face: number;        // +1 or 0
  detriment: number;   // -5 or 0
  fall: number;        // -4 or 0
  total: number;
}

/**
 * Calculate the essential dignity score for a planet at a given position.
 * isDayChart: true if the Sun is above the horizon (houses 7-12).
 */
export function calculateDignityScore(
  planet: Planet,
  sign: ZodiacSign,
  degree: number,
  isDayChart: boolean,
): DignityScore {
  const domicileSigns = DOMICILE[planet] ?? [];
  const exaltData = EXALTATION[planet];
  const detrimentSigns = DETRIMENT[planet] ?? [];
  const fallSign = FALL[planet];
  const triplicityRulers = getTriplicityRulers(sign);

  const domicile = domicileSigns.includes(sign) ? 5 : 0;
  const exaltation = exaltData?.sign === sign ? 4 : 0;
  const detriment = detrimentSigns.includes(sign) ? -5 : 0;
  const fall = fallSign === sign ? -4 : 0;

  // Triplicity: +3 if planet is day or night ruler of sign's triplicity
  let triplicity = 0;
  if (isDayChart && triplicityRulers.day === planet) triplicity = 3;
  else if (!isDayChart && triplicityRulers.night === planet) triplicity = 3;

  // Term: +2 if planet rules the term at this degree
  const termRuler = getTermRuler(sign, degree);
  const term = termRuler === planet ? 2 : 0;

  // Face/decan: +1 if planet rules the decan at this degree
  const decanRuler = getDecanRuler(sign, degree);
  const face = decanRuler === planet ? 1 : 0;

  const total = domicile + exaltation + triplicity + term + face + detriment + fall;

  return { domicile, exaltation, triplicity, term, face, detriment, fall, total };
}

// ---- Innate zodiac state (先天黃道狀態) ----

export type InnateState = '廟' | '旺' | '落' | '陷' | null;

export function getInnateState(planet: Planet, sign: ZodiacSign): InnateState {
  if ((DOMICILE[planet] ?? []).includes(sign)) return '廟';
  if (EXALTATION[planet]?.sign === sign) return '旺';
  if ((DETRIMENT[planet] ?? []).includes(sign)) return '落';
  if (FALL[planet] === sign) return '陷';
  return null;
}

// ---- Sect (得時) ----

/** Diurnal planets: Sun, Jupiter, Saturn. Nocturnal: Moon, Venus, Mars. Mercury neutral. */
export type SectType = 'diurnal' | 'nocturnal' | 'neutral';

export const PLANET_SECT: Record<Planet, SectType> = {
  [Planet.Sun]: 'diurnal',
  [Planet.Jupiter]: 'diurnal',
  [Planet.Saturn]: 'diurnal',
  [Planet.Moon]: 'nocturnal',
  [Planet.Venus]: 'nocturnal',
  [Planet.Mars]: 'nocturnal',
  [Planet.Mercury]: 'neutral',
  [Planet.Uranus]: 'neutral',
  [Planet.Neptune]: 'neutral',
  [Planet.Pluto]: 'neutral',
};

/**
 * Determine if it is a day chart.
 * Day chart = Sun is in houses 7-12 (above the horizon).
 */
export function isDayChart(sunHouse: number): boolean {
  return sunHouse >= 7 && sunHouse <= 12;
}

/**
 * Check if a planet is 得時 (of the sect in favor).
 * Diurnal planet in day chart OR nocturnal planet in night chart = true.
 */
export function isSectInFavor(planet: Planet, sunHouse: number): boolean {
  const dayChart = isDayChart(sunHouse);
  const sect = PLANET_SECT[planet];
  if (sect === 'neutral') return false;
  return (dayChart && sect === 'diurnal') || (!dayChart && sect === 'nocturnal');
}

// ---- Combust / Under Sunbeams (灼傷 / 在日光下) ----

const COMBUST_ORB = 8.5;
const SUNBEAMS_ORB = 17;

function angularDistance(lon1: number, lon2: number): number {
  let diff = Math.abs(lon1 - lon2) % 360;
  if (diff > 180) diff = 360 - diff;
  return diff;
}

export type CombustState = '灼傷' | '在日光下' | null;

/**
 * Returns '灼傷' if within 8.5° of Sun, '在日光下' if within 17°, null otherwise.
 * The Sun itself is never combust.
 */
export function getCombustState(planet: Planet, planetLon: number, sunLon: number): CombustState {
  if (planet === Planet.Sun) return null;
  const dist = angularDistance(planetLon, sunLon);
  if (dist <= COMBUST_ORB) return '灼傷';
  if (dist <= SUNBEAMS_ORB) return '在日光下';
  return null;
}

// ---- Oriental / Occidental (東出 / 西沒) ----

/**
 * For Mercury and Venus (inferior planets):
 *   Oriental = rises before Sun (planet longitude is ahead of Sun in the zodiac by a small amount)
 *   Occidental = sets after Sun
 *
 * For outer planets (Mars, Jupiter, Saturn, Uranus, Neptune, Pluto):
 *   Oriental = rising before the Sun (planet longitude is ahead of Sun by 0-180°)
 *   Occidental = setting after the Sun (planet longitude is behind Sun by 0-180°)
 *
 * Returns '東出' or '西沒'.
 */
export function getOrientalOccidental(planet: Planet, planetLon: number, sunLon: number): '東出' | '西沒' {
  // Signed difference: how far planet is ahead of Sun (positive = planet is ahead)
  let diff = (planetLon - sunLon + 360) % 360;

  if (planet === Planet.Mercury || planet === Planet.Venus) {
    // Inferior planets: oriental if behind the Sun in direct motion (diff > 180 means behind)
    // Oriental = planet rises before Sun = planet is east of Sun = diff < 180
    return diff < 180 ? '東出' : '西沒';
  } else {
    // Outer planets: oriental if ahead of Sun (0 < diff < 180)
    return diff > 0 && diff < 180 ? '東出' : '西沒';
  }
}

// ---- Affiliated states (附屬狀態) aggregator ----

export interface AffiliatedStates {
  sect: boolean;        // 得時
  oriental: '東出' | '西沒';
  retrograde: boolean;  // 逆行
  combust: CombustState;
}

export function getAffiliatedStates(
  pos: PlanetPosition,
  sunPos: PlanetPosition,
): AffiliatedStates {
  return {
    sect: isSectInFavor(pos.planet, sunPos.house),
    oriental: getOrientalOccidental(pos.planet, pos.longitude, sunPos.longitude),
    retrograde: pos.retrograde,
    combust: getCombustState(pos.planet, pos.longitude, sunPos.longitude),
  };
}

// ---- House of domicile ruler ----

/**
 * Given a planet and all planet positions, find which house the domicile ruler
 * of the given sign occupies.
 * Returns the house number, or null if no classical ruler exists.
 */
export function getDomicileRulerHouse(
  sign: ZodiacSign,
  allPositions: PlanetPosition[],
): number | null {
  // Find which classical planet rules this sign
  for (const [planet, signs] of Object.entries(DOMICILE) as [Planet, ZodiacSign[]][]) {
    if (signs.includes(sign)) {
      const pos = allPositions.find((p) => p.planet === planet);
      return pos?.house ?? null;
    }
  }
  return null;
}

/**
 * Find which house the exaltation ruler of a sign occupies.
 */
export function getExaltationRulerHouse(
  sign: ZodiacSign,
  allPositions: PlanetPosition[],
): number | null {
  for (const [planet, data] of Object.entries(EXALTATION) as [Planet, ExaltationData][]) {
    if (data.sign === sign) {
      const pos = allPositions.find((p) => p.planet === planet);
      return pos?.house ?? null;
    }
  }
  return null;
}

// ---- Classical planets list ----

export const CLASSICAL_PLANETS: Planet[] = [
  Planet.Sun,
  Planet.Moon,
  Planet.Mercury,
  Planet.Venus,
  Planet.Mars,
  Planet.Jupiter,
  Planet.Saturn,
];

export const OUTER_PLANETS: Planet[] = [Planet.Uranus, Planet.Neptune, Planet.Pluto];
