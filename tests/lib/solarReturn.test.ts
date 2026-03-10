/**
 * Tests for solar return calculation.
 *
 * Key invariants:
 *  1. At the returned JDE the Sun longitude must equal the natal Sun longitude (within 0.001°)
 *  2. The returned calendar date must be within 2 days of the birthday in the target year
 *  3. jdeToGregorian must correctly invert the julian-day formula
 */

import { describe, it, expect } from 'vitest';
import { findSolarReturnJDE, jdeToGregorian, calculateSolarReturn } from '../../src/lib/solarReturn';
import { birthDataToJDE, sunLongitudeAtJDE, calculateNatalChart } from '../../src/lib/astro';
import { HouseSystem } from '../../src/types/astro';
import type { BirthData } from '../../src/types/astro';

// Known test subject: born 1990-03-20 12:00 UTC (near vernal equinox → Sun ≈ 0° Aries)
const testBirthData: BirthData = {
  year: 1990, month: 3, day: 20,
  hour: 12, minute: 0,
  latitude: 51.48, longitude: 0.0, // Greenwich
  locationName: 'Greenwich',
};

describe('jdeToGregorian', () => {
  it('correctly converts a known JDE to Gregorian date', () => {
    // JDE 2451545.0 = J2000.0 = 2000-01-01 12:00 UTC
    const result = jdeToGregorian(2451545.0);
    expect(result.year).toBe(2000);
    expect(result.month).toBe(1);
    expect(result.day).toBe(1);
    expect(result.hour).toBe(12);
    expect(result.minute).toBe(0);
  });

  it('roundtrips a birth date through JDE and back', () => {
    const jde = birthDataToJDE(testBirthData);
    const back = jdeToGregorian(jde);
    expect(back.year).toBe(1990);
    expect(back.month).toBe(3);
    expect(back.day).toBe(20);
    expect(back.hour).toBe(12);
    expect(back.minute).toBe(0);
  });
});

describe('findSolarReturnJDE', () => {
  it('converges to a JDE where Sun longitude equals the target (within 0.001°)', () => {
    const natalJDE = birthDataToJDE(testBirthData);
    const natalSunLon = sunLongitudeAtJDE(natalJDE);

    // Search for solar return in 2024
    const approxJDE = birthDataToJDE({ ...testBirthData, year: 2024 });
    const srJDE = findSolarReturnJDE(natalSunLon, approxJDE);
    const srSunLon = sunLongitudeAtJDE(srJDE);

    // Angular difference must be < 0.001°
    let diff = Math.abs(srSunLon - natalSunLon) % 360;
    if (diff > 180) diff = 360 - diff;
    expect(diff).toBeLessThan(0.001);
  });

  it('finds a solar return date within 2 days of the birthday', () => {
    const natalJDE = birthDataToJDE(testBirthData);
    const natalSunLon = sunLongitudeAtJDE(natalJDE);
    const approxJDE = birthDataToJDE({ ...testBirthData, year: 2010 });
    const srJDE = findSolarReturnJDE(natalSunLon, approxJDE);
    const srDate = jdeToGregorian(srJDE);

    expect(srDate.year).toBe(2010);
    // Born March 20; SR should be March 19–22 (within 2 days)
    expect(srDate.month).toBe(3);
    expect(srDate.day).toBeGreaterThanOrEqual(18);
    expect(srDate.day).toBeLessThanOrEqual(22);
  });
});

describe('calculateSolarReturn', () => {
  it('returns a chart whose Sun longitude matches natal Sun (within 0.01°)', () => {
    const natalChart = calculateNatalChart(testBirthData, HouseSystem.Placidus);
    const natalSunPos = natalChart.planets.find((p) => p.planet === 'Sun')!;
    const natalSunLon = natalSunPos.longitude;

    const sr = calculateSolarReturn(natalChart, 2020);
    const srSunPos = sr.chart.planets.find((p) => p.planet === 'Sun')!;

    let diff = Math.abs(srSunPos.longitude - natalSunLon) % 360;
    if (diff > 180) diff = 360 - diff;
    expect(diff).toBeLessThan(0.01);
  });

  it('SR chart has the same number of planets as the natal chart', () => {
    const natalChart = calculateNatalChart(testBirthData, HouseSystem.Placidus);
    const sr = calculateSolarReturn(natalChart, 2025);
    expect(sr.chart.planets.length).toBe(natalChart.planets.length);
  });

  it('SR utc year matches the requested target year', () => {
    const natalChart = calculateNatalChart(testBirthData, HouseSystem.Placidus);
    const sr = calculateSolarReturn(natalChart, 2030);
    expect(sr.utc.year).toBe(2030);
  });
});
