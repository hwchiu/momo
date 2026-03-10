/**
 * Tests for Arabic lots (Arabic parts / Hellenistic lots).
 *
 * Key invariants:
 *  1. 12 lots are returned with correct field structure
 *  2. Fortune formula is (ASC + Moon − Sun) for day charts, reversed for night
 *  3. Spirit formula is the inverse of Fortune's body order
 *  4. Lot longitude matches derived sign + degree + minute
 *  5. house is always 1–12
 */

import { describe, it, expect } from 'vitest';
import { calculateArabicParts } from '../../src/lib/arabicParts';
import { calculateNatalChart } from '../../src/lib/astro';
import { HouseSystem, Planet } from '../../src/types/astro';
import type { BirthData } from '../../src/types/astro';

// Test data: we derive sect from the computed chart, not from assumptions
const birthData: BirthData = {
  year: 1985, month: 6, day: 21,
  hour: 12, minute: 0,
  latitude: 48.85, longitude: 2.35, // Paris
  locationName: 'Paris',
};

function norm(d: number) { return ((d % 360) + 360) % 360; }

describe('calculateArabicParts', () => {
  const chart = calculateNatalChart(birthData, HouseSystem.Placidus);
  const lots = calculateArabicParts(chart);

  it('returns exactly 12 lots', () => {
    expect(lots).toHaveLength(12);
  });

  it('every lot has valid sign (0–11), house (1–12), degree (0–29), minute (0–59)', () => {
    for (const lot of lots) {
      expect(lot.sign).toBeGreaterThanOrEqual(0);
      expect(lot.sign).toBeLessThanOrEqual(11);
      expect(lot.house).toBeGreaterThanOrEqual(1);
      expect(lot.house).toBeLessThanOrEqual(12);
      expect(lot.degree).toBeGreaterThanOrEqual(0);
      expect(lot.degree).toBeLessThanOrEqual(29);
      expect(lot.minute).toBeGreaterThanOrEqual(0);
      expect(lot.minute).toBeLessThanOrEqual(59);
    }
  });

  it('lot longitude matches derived sign + degree + minute (within 1 arcminute)', () => {
    for (const lot of lots) {
      const reconstructed = lot.sign * 30 + lot.degree + lot.minute / 60;
      expect(Math.abs(reconstructed - lot.longitude)).toBeLessThan(1 / 60);
    }
  });

  it('Fortune formula matches sect: day = ASC + Moon − Sun, night = ASC + Sun − Moon', () => {
    const sun = chart.planets.find((p) => p.planet === Planet.Sun)!;
    const moon = chart.planets.find((p) => p.planet === Planet.Moon)!;
    const isDayChart = sun.house >= 7;

    const expectedFortune = isDayChart
      ? norm(chart.ascendant + moon.longitude - sun.longitude)
      : norm(chart.ascendant + sun.longitude - moon.longitude);

    const fortune = lots.find((l) => l.nameEn === 'Lot of Fortune')!;
    expect(Math.abs(fortune.longitude - expectedFortune)).toBeLessThan(0.001);
  });

  it('Spirit formula is the exact inverse of Fortune formula for the same chart', () => {
    const sun = chart.planets.find((p) => p.planet === Planet.Sun)!;
    const moon = chart.planets.find((p) => p.planet === Planet.Moon)!;
    const isDayChart = sun.house >= 7;

    const expectedSpirit = isDayChart
      ? norm(chart.ascendant + sun.longitude - moon.longitude)
      : norm(chart.ascendant + moon.longitude - sun.longitude);

    const spirit = lots.find((l) => l.nameEn === 'Lot of Spirit')!;
    expect(Math.abs(spirit.longitude - expectedSpirit)).toBeLessThan(0.001);
  });

  it('Fortune + Spirit sum = 2 × ASC (mod 360), regardless of sect', () => {
    // Fortune(day) = ASC + Moon − Sun;  Spirit(day) = ASC + Sun − Moon
    // Fortune + Spirit = 2·ASC − Sun + Moon + Sun − Moon = 2·ASC ✓
    const fortune = lots.find((l) => l.nameEn === 'Lot of Fortune')!;
    const spirit = lots.find((l) => l.nameEn === 'Lot of Spirit')!;
    const sumMod = norm(fortune.longitude + spirit.longitude);
    const expected = norm(2 * chart.ascendant);
    let diff = Math.abs(sumMod - expected) % 360;
    if (diff > 180) diff = 360 - diff;
    expect(diff).toBeLessThan(0.01);
  });

  it('all lots have a non-empty nameZh and nameEn', () => {
    for (const lot of lots) {
      expect(lot.nameZh.length).toBeGreaterThan(0);
      expect(lot.nameEn.length).toBeGreaterThan(0);
    }
  });
});

// Smoke test: second chart to ensure no crashes on different input
describe('calculateArabicParts (second chart — winter / Tokyo)', () => {
  it('works for a winter chart (Sun in Sagittarius) and returns 12 lots', () => {
    const winter: BirthData = {
      year: 1990, month: 12, day: 1,
      hour: 0, minute: 0,
      latitude: 35.68, longitude: 139.69, // Tokyo
      locationName: 'Tokyo',
    };
    const chart2 = calculateNatalChart(winter, HouseSystem.Placidus);
    const lots = calculateArabicParts(chart2);
    expect(lots).toHaveLength(12);
  });
});
