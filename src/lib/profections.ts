/**
 * Annual Profections (小限法).
 *
 * One of the oldest and simplest Hellenistic time-lord techniques.
 * At birth (age 0) the 1st house is activated. Each subsequent birthday
 * advances the profected house by one, cycling through all 12 houses every
 * 12 years.
 *
 * The lord of the profected year is the traditional (Chaldean) ruler of the
 * sign on the cusp of the activated house.  This planet becomes the "Year Lord"
 * (年主星) and is the most sensitive planet for transits, solar arc, and returns
 * during that year.
 */

import type { NatalChart, ZodiacSign } from '../types/astro';
import { Planet } from '../types/astro';
import type { ProfectionResult } from '../types/returns';

/**
 * Traditional Chaldean rulers for each zodiac sign (0 = Aries … 11 = Pisces).
 * Outer planets (Uranus, Neptune, Pluto) are not used in classical profections.
 */
export const TRADITIONAL_RULERS: Record<ZodiacSign, Planet> = {
  0: Planet.Mars,    // Aries
  1: Planet.Venus,   // Taurus
  2: Planet.Mercury, // Gemini
  3: Planet.Moon,    // Cancer
  4: Planet.Sun,     // Leo
  5: Planet.Mercury, // Virgo
  6: Planet.Venus,   // Libra
  7: Planet.Mars,    // Scorpio
  8: Planet.Jupiter, // Sagittarius
  9: Planet.Saturn,  // Capricorn
  10: Planet.Saturn, // Aquarius
  11: Planet.Jupiter,// Pisces
};

/**
 * Calculate the annual profection for a given age.
 *
 * @param chart     - The native's natal chart (provides house cusps and planets)
 * @param age       - The native's age at the start of the profection year (integer ≥ 0)
 */
export function calculateProfection(chart: NatalChart, age: number): ProfectionResult {
  if (age < 0) throw new RangeError('Age must be ≥ 0');

  // House activates by cycling 1→12 every 12 years
  const house = (age % 12) + 1;  // 1-indexed

  // Find the sign on the cusp of the profected house
  const houseIndex = house - 1;  // 0-indexed
  const cusp = chart.houses[houseIndex];
  if (!cusp) throw new Error(`House ${house} cusp not found in chart`);

  const signOnCusp = cusp.sign;
  const lord = TRADITIONAL_RULERS[signOnCusp];

  // Natal planets located in the profected house
  const planetsInHouse = chart.planets
    .filter((p) => p.house === house)
    .map((p) => p.planet);

  return { age, house, signOnCusp, lord, planetsInHouse };
}

/**
 * Calculate profections for a range of ages (useful for timeline display).
 *
 * @param chart    - Natal chart
 * @param fromAge  - Start age (inclusive)
 * @param toAge    - End age (inclusive)
 */
export function calculateProfectionRange(
  chart: NatalChart,
  fromAge: number,
  toAge: number,
): ProfectionResult[] {
  const results: ProfectionResult[] = [];
  for (let age = fromAge; age <= toAge; age++) {
    results.push(calculateProfection(chart, age));
  }
  return results;
}
