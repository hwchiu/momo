/**
 * Solar Return calculation.
 *
 * A solar return (太陽回歸盤) occurs when the transiting Sun returns to its
 * exact natal ecliptic longitude. This happens approximately once per year,
 * within a day or two of the birthday.
 *
 * Algorithm: Newton-style iteration starting from the approximate birthday
 * in the target year. Convergence is typically achieved within 5 iterations.
 */

import { birthDataToJDE, calculateNatalChart, sunLongitudeAtJDE } from './astro';
import type { BirthData, NatalChart, HouseSystem } from '../types/astro';
import type { SolarReturnChart } from '../types/returns';

/** Average Sun speed in degrees per day (used as Newton step divisor). */
const SUN_SPEED_DEG_PER_DAY = 0.9856;

/**
 * Convert a Julian Ephemeris Day to a Gregorian UTC date-time.
 * Implements Meeus, "Astronomical Algorithms" (2nd ed.), chapter 7.
 */
export function jdeToGregorian(jde: number): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
} {
  const jd = jde + 0.5;
  const Z = Math.floor(jd);
  const F = jd - Z;

  let A: number;
  if (Z < 2299161) {
    A = Z;
  } else {
    const alpha = Math.floor((Z - 1867216.25) / 36524.25);
    A = Z + 1 + alpha - Math.floor(alpha / 4);
  }

  const B = A + 1524;
  const C = Math.floor((B - 122.1) / 365.25);
  const D = Math.floor(365.25 * C);
  const E = Math.floor((B - D) / 30.6001);

  const dayFrac = B - D - Math.floor(30.6001 * E) + F;
  const day = Math.floor(dayFrac);
  const timeOfDay = (dayFrac - day) * 24;
  const hour = Math.floor(timeOfDay);
  const minute = Math.floor((timeOfDay - hour) * 60);

  const month = E < 14 ? E - 1 : E - 13;
  const year = month > 2 ? C - 4716 : C - 4715;

  return { year, month, day, hour, minute };
}

/**
 * Find the JDE at which the Sun returns to a given ecliptic longitude,
 * searching forward (or backward) from a starting JDE.
 *
 * Converges to within 0.00001° (< 0.001 seconds of arc) in < 10 iterations.
 */
export function findSolarReturnJDE(natalSunLon: number, startJDE: number): number {
  let jde = startJDE;
  for (let i = 0; i < 50; i++) {
    const sunLon = sunLongitudeAtJDE(jde);
    // Shortest signed arc from current Sun to target ([-180, +180])
    let diff = ((natalSunLon - sunLon) % 360 + 360) % 360;
    if (diff > 180) diff -= 360;
    if (Math.abs(diff) < 0.00001) break;
    jde += diff / SUN_SPEED_DEG_PER_DAY;
  }
  return jde;
}

/**
 * Calculate the Solar Return chart for a given target year.
 *
 * The SR chart is computed at the natal location.  If you need a relocated
 * return chart (常用於遷居分析), pass a custom `location` override.
 *
 * @param natalChart  - The native's natal chart (provides natal Sun lon + birth data)
 * @param targetYear  - The Gregorian year of the desired solar return
 * @param houseSystem - House system to use for the SR chart (defaults to natal system)
 * @param location    - Optional: override lat/lon for relocated SR chart
 */
export function calculateSolarReturn(
  natalChart: NatalChart,
  targetYear: number,
  houseSystem: HouseSystem = natalChart.houseSystem,
  location?: { latitude: number; longitude: number; locationName: string },
): SolarReturnChart {
  const natal = natalChart;
  const natalSunPos = natal.planets.find((p) => p.planet === 'Sun');
  if (!natalSunPos) throw new Error('Natal chart missing Sun position');

  const natalSunLon = natalSunPos.longitude;

  // Start search from approximately the birthday in the target year
  const approxBD: BirthData = {
    ...natal.birthData,
    year: targetYear,
    // Start from the same month/day as the birthday — Sun will be close
  };
  const startJDE = birthDataToJDE(approxBD);

  const srJDE = findSolarReturnJDE(natalSunLon, startJDE);
  const utc = jdeToGregorian(srJDE);

  const srBirthData: BirthData = {
    year: utc.year,
    month: utc.month,
    day: utc.day,
    hour: utc.hour,
    minute: utc.minute,
    latitude: location?.latitude ?? natal.birthData.latitude,
    longitude: location?.longitude ?? natal.birthData.longitude,
    locationName: location?.locationName ?? natal.birthData.locationName,
  };

  const chart = calculateNatalChart(srBirthData, houseSystem);

  return { jde: srJDE, utc, chart };
}
