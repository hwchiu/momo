/**
 * Tests for Annual Profections (小限法).
 *
 * Key invariants:
 *  1. Age 0 → house 1, age 1 → house 2, … age 11 → house 12, age 12 → house 1
 *  2. Lord is the traditional ruler of the sign on the profected house cusp
 *  3. planetsInHouse only contains planets actually in that house
 *  4. calculateProfectionRange returns results for all ages in [from, to]
 */

import { describe, it, expect } from 'vitest';
import {
  calculateProfection,
  calculateProfectionRange,
  TRADITIONAL_RULERS,
} from '../../src/lib/profections';
import { calculateNatalChart } from '../../src/lib/astro';
import { HouseSystem, Planet, ZodiacSign } from '../../src/types/astro';
import type { BirthData } from '../../src/types/astro';

const testBirthData: BirthData = {
  year: 1985,
  month: 6,
  day: 21,
  hour: 12,
  minute: 0,
  latitude: 48.85,
  longitude: 2.35,
  locationName: 'Paris',
};

describe('TRADITIONAL_RULERS', () => {
  it('covers all 12 signs', () => {
    for (let s = 0; s <= 11; s++) {
      expect(TRADITIONAL_RULERS[s as ZodiacSign]).toBeDefined();
    }
  });

  it('assigns correct rulers for sample signs', () => {
    expect(TRADITIONAL_RULERS[ZodiacSign.Aries]).toBe(Planet.Mars);
    expect(TRADITIONAL_RULERS[ZodiacSign.Leo]).toBe(Planet.Sun);
    expect(TRADITIONAL_RULERS[ZodiacSign.Cancer]).toBe(Planet.Moon);
    expect(TRADITIONAL_RULERS[ZodiacSign.Pisces]).toBe(Planet.Jupiter);
  });
});

describe('calculateProfection', () => {
  const chart = calculateNatalChart(testBirthData, HouseSystem.WholeSign);

  it('age 0 activates house 1', () => {
    const result = calculateProfection(chart, 0);
    expect(result.house).toBe(1);
    expect(result.age).toBe(0);
  });

  it('age 11 activates house 12', () => {
    const result = calculateProfection(chart, 11);
    expect(result.house).toBe(12);
  });

  it('age 12 wraps back to house 1', () => {
    const result = calculateProfection(chart, 12);
    expect(result.house).toBe(1);
  });

  it('age 25 activates house 2 (25 mod 12 = 1 → house 2)', () => {
    const result = calculateProfection(chart, 25);
    expect(result.house).toBe(2);
  });

  it('age 36 activates house 1 (36 mod 12 = 0 → house 1)', () => {
    const result = calculateProfection(chart, 36);
    expect(result.house).toBe(1);
  });

  it('lord is the traditional ruler of the sign on the profected house cusp', () => {
    for (let age = 0; age <= 23; age++) {
      const result = calculateProfection(chart, age);
      const expectedLord = TRADITIONAL_RULERS[result.signOnCusp];
      expect(result.lord).toBe(expectedLord);
    }
  });

  it('planetsInHouse only contains planets actually in that house', () => {
    for (let age = 0; age <= 11; age++) {
      const result = calculateProfection(chart, age);
      for (const planet of result.planetsInHouse) {
        const pos = chart.planets.find((p) => p.planet === planet);
        expect(pos?.house).toBe(result.house);
      }
    }
  });

  it('throws for negative age', () => {
    expect(() => calculateProfection(chart, -1)).toThrow(RangeError);
  });
});

describe('calculateProfectionRange', () => {
  const chart = calculateNatalChart(testBirthData, HouseSystem.WholeSign);

  it('returns correct number of results', () => {
    const results = calculateProfectionRange(chart, 0, 11);
    expect(results).toHaveLength(12);
  });

  it('each result has the correct age', () => {
    const results = calculateProfectionRange(chart, 10, 20);
    results.forEach((r, i) => expect(r.age).toBe(10 + i));
  });

  it('cycles through all 12 houses over 12 years', () => {
    const results = calculateProfectionRange(chart, 0, 11);
    const houses = results.map((r) => r.house);
    for (let h = 1; h <= 12; h++) {
      expect(houses).toContain(h);
    }
  });
});
