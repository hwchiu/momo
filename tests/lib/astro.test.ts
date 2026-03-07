import { describe, it, expect } from 'vitest';
import { calculateNatalChart } from '../../src/lib/astro';
import { Planet, ZodiacSign, HouseSystem } from '../../src/types/astro';
import type { BirthData } from '../../src/types/astro';

/**
 * Reference test case: a known birth chart to verify calculations.
 *
 * Birth data: January 1, 2000, 12:00 UTC, London (51.5074°N, -0.1278°W)
 * This is a well-documented date (J2000 epoch) which helps verify calculations.
 */
const J2000_BIRTH_DATA: BirthData = {
  year: 2000,
  month: 1,
  day: 1,
  hour: 12,
  minute: 0,
  latitude: 51.5074,
  longitude: -0.1278,
  locationName: 'London, UK',
};

const TAIPEI_BIRTH_DATA: BirthData = {
  year: 1985,
  month: 7,
  day: 15,
  hour: 14,
  minute: 30,
  latitude: 25.033,
  longitude: 121.5654,
  locationName: '台北',
};

describe('calculateNatalChart', () => {
  it('should return a valid natal chart with all required fields', () => {
    const chart = calculateNatalChart(J2000_BIRTH_DATA);

    expect(chart).toBeDefined();
    expect(chart.birthData).toEqual(J2000_BIRTH_DATA);
    expect(chart.planets).toHaveLength(10);
    expect(chart.houses).toHaveLength(12);
    expect(chart.ascendant).toBeGreaterThanOrEqual(0);
    expect(chart.ascendant).toBeLessThan(360);
    expect(chart.midheaven).toBeGreaterThanOrEqual(0);
    expect(chart.midheaven).toBeLessThan(360);
    expect(chart.houseSystem).toBe(HouseSystem.Placidus);
  });

  it('should calculate 10 planet positions', () => {
    const chart = calculateNatalChart(J2000_BIRTH_DATA);

    const expectedPlanets = [
      Planet.Sun,
      Planet.Moon,
      Planet.Mercury,
      Planet.Venus,
      Planet.Mars,
      Planet.Jupiter,
      Planet.Saturn,
      Planet.Uranus,
      Planet.Neptune,
      Planet.Pluto,
    ];

    const chartPlanets = chart.planets.map((p) => p.planet);
    expect(chartPlanets).toEqual(expectedPlanets);
  });

  it('should place the Sun in Capricorn for J2000 epoch', () => {
    const chart = calculateNatalChart(J2000_BIRTH_DATA);
    const sun = chart.planets.find((p) => p.planet === Planet.Sun);

    expect(sun).toBeDefined();
    // On Jan 1, 2000, the Sun is at ~280° ecliptic longitude (Capricorn)
    expect(sun!.sign).toBe(ZodiacSign.Capricorn);
  });

  it('should produce planet longitudes in valid range [0, 360)', () => {
    const chart = calculateNatalChart(J2000_BIRTH_DATA);

    for (const planet of chart.planets) {
      expect(planet.longitude).toBeGreaterThanOrEqual(0);
      expect(planet.longitude).toBeLessThan(360);
      expect(planet.degree).toBeGreaterThanOrEqual(0);
      expect(planet.degree).toBeLessThan(30);
      expect(planet.minute).toBeGreaterThanOrEqual(0);
      expect(planet.minute).toBeLessThan(60);
      expect(planet.house).toBeGreaterThanOrEqual(1);
      expect(planet.house).toBeLessThanOrEqual(12);
    }
  });

  it('should produce 12 house cusps in valid range', () => {
    const chart = calculateNatalChart(J2000_BIRTH_DATA);

    expect(chart.houses).toHaveLength(12);
    for (const house of chart.houses) {
      expect(house.house).toBeGreaterThanOrEqual(1);
      expect(house.house).toBeLessThanOrEqual(12);
      expect(house.longitude).toBeGreaterThanOrEqual(0);
      expect(house.longitude).toBeLessThan(360);
      expect(house.degree).toBeGreaterThanOrEqual(0);
      expect(house.degree).toBeLessThan(30);
    }
  });

  it('should detect aspects between planets', () => {
    const chart = calculateNatalChart(J2000_BIRTH_DATA);

    // There should be at least some aspects for any given chart
    expect(chart.aspects.length).toBeGreaterThan(0);

    for (const aspect of chart.aspects) {
      expect(aspect.planet1).toBeDefined();
      expect(aspect.planet2).toBeDefined();
      expect(aspect.orb).toBeGreaterThanOrEqual(0);
      expect(aspect.orb).toBeLessThanOrEqual(15); // max moiety orb (Sun moiety = 15°)
    }
  });

  it('should not have the Sun or Moon retrograde', () => {
    const chart = calculateNatalChart(J2000_BIRTH_DATA);
    const sun = chart.planets.find((p) => p.planet === Planet.Sun);
    const moon = chart.planets.find((p) => p.planet === Planet.Moon);

    expect(sun!.retrograde).toBe(false);
    expect(moon!.retrograde).toBe(false);
  });

  it('should work for a different date and location', () => {
    const chart = calculateNatalChart(TAIPEI_BIRTH_DATA);

    expect(chart).toBeDefined();
    expect(chart.planets).toHaveLength(10);
    expect(chart.houses).toHaveLength(12);

    // Sun should be in Cancer in mid-July
    const sun = chart.planets.find((p) => p.planet === Planet.Sun);
    expect(sun!.sign).toBe(ZodiacSign.Cancer);
  });
});

describe('House Systems', () => {
  const ALL_SYSTEMS = Object.values(HouseSystem);

  describe.each(ALL_SYSTEMS)('%s house system', (system) => {
    it('should produce 12 valid house cusps', () => {
      const chart = calculateNatalChart(J2000_BIRTH_DATA, system);

      expect(chart.houses).toHaveLength(12);
      expect(chart.houseSystem).toBe(system);

      for (const house of chart.houses) {
        expect(house.house).toBeGreaterThanOrEqual(1);
        expect(house.house).toBeLessThanOrEqual(12);
        expect(house.longitude).toBeGreaterThanOrEqual(0);
        expect(house.longitude).toBeLessThan(360);
        expect(house.degree).toBeGreaterThanOrEqual(0);
        expect(house.degree).toBeLessThan(30);
      }
    });

    it('should preserve ASC and MC across house systems', () => {
      const placidus = calculateNatalChart(J2000_BIRTH_DATA, HouseSystem.Placidus);
      const chart = calculateNatalChart(J2000_BIRTH_DATA, system);

      // ASC and MC are independent of house system
      expect(chart.ascendant).toBeCloseTo(placidus.ascendant, 5);
      expect(chart.midheaven).toBeCloseTo(placidus.midheaven, 5);
    });

    it('should produce the same planet positions regardless of house system', () => {
      const placidus = calculateNatalChart(J2000_BIRTH_DATA, HouseSystem.Placidus);
      const chart = calculateNatalChart(J2000_BIRTH_DATA, system);

      // Planets should have the same longitudes (houses may differ)
      for (let i = 0; i < chart.planets.length; i++) {
        expect(chart.planets[i].longitude).toBeCloseTo(placidus.planets[i].longitude, 5);
        expect(chart.planets[i].sign).toBe(placidus.planets[i].sign);
      }
    });

    it('should work for Taipei birth data', () => {
      const chart = calculateNatalChart(TAIPEI_BIRTH_DATA, system);

      expect(chart.houses).toHaveLength(12);
      expect(chart.planets).toHaveLength(10);
      expect(chart.houseSystem).toBe(system);
    });
  });

  describe('Whole Sign specific', () => {
    it('should have each cusp at exactly 0° of a sign', () => {
      const chart = calculateNatalChart(J2000_BIRTH_DATA, HouseSystem.WholeSign);

      for (const house of chart.houses) {
        // Every cusp should be at 0° of its sign (longitude is a multiple of 30)
        expect(house.longitude % 30).toBeCloseTo(0, 5);
        expect(house.degree).toBe(0);
      }
    });

    it('should have consecutive signs for consecutive houses', () => {
      const chart = calculateNatalChart(J2000_BIRTH_DATA, HouseSystem.WholeSign);

      for (let i = 0; i < 11; i++) {
        const currentSign = chart.houses[i].sign;
        const nextSign = chart.houses[i + 1].sign;
        expect(nextSign).toBe((currentSign + 1) % 12);
      }
    });
  });

  describe('Equal House specific', () => {
    it('should have exactly 30° between consecutive cusps', () => {
      const chart = calculateNatalChart(J2000_BIRTH_DATA, HouseSystem.EqualHouse);

      for (let i = 0; i < 12; i++) {
        const current = chart.houses[i].longitude;
        const next = chart.houses[(i + 1) % 12].longitude;
        let diff = next - current;
        if (diff < 0) diff += 360;
        expect(diff).toBeCloseTo(30, 5);
      }
    });

    it('should have house 1 cusp equal to the Ascendant', () => {
      const chart = calculateNatalChart(J2000_BIRTH_DATA, HouseSystem.EqualHouse);
      expect(chart.houses[0].longitude).toBeCloseTo(chart.ascendant, 5);
    });
  });

  describe('Porphyry specific', () => {
    it('should have house 1 = ASC and house 10 = MC', () => {
      const chart = calculateNatalChart(J2000_BIRTH_DATA, HouseSystem.Porphyry);
      expect(chart.houses[0].longitude).toBeCloseTo(chart.ascendant, 5);
      expect(chart.houses[9].longitude).toBeCloseTo(chart.midheaven, 5);
    });

    it('should trisect the MC-ASC arc evenly', () => {
      const chart = calculateNatalChart(J2000_BIRTH_DATA, HouseSystem.Porphyry);
      const mc = chart.houses[9].longitude;
      const asc = chart.houses[0].longitude;
      let arc = asc - mc;
      if (arc < 0) arc += 360;

      const h11 = chart.houses[10].longitude;
      let diff1 = h11 - mc;
      if (diff1 < 0) diff1 += 360;

      // House 11 should be at ~1/3 of the MC-ASC arc
      expect(diff1).toBeCloseTo(arc / 3, 1);
    });
  });

  describe('Opposite house symmetry', () => {
    const QUADRANT_SYSTEMS = [
      HouseSystem.Placidus,
      HouseSystem.Koch,
      HouseSystem.Regiomontanus,
      HouseSystem.Campanus,
      HouseSystem.Alcabitius,
      HouseSystem.Porphyry,
    ];

    it.each(QUADRANT_SYSTEMS)('%s: house 7 should be opposite house 1', (system) => {
      const chart = calculateNatalChart(J2000_BIRTH_DATA, system);
      let diff = Math.abs(chart.houses[6].longitude - chart.houses[0].longitude);
      if (diff > 180) diff = 360 - diff;
      expect(diff).toBeCloseTo(180, 1);
    });

    it.each(QUADRANT_SYSTEMS)('%s: house 4 should be opposite house 10', (system) => {
      const chart = calculateNatalChart(J2000_BIRTH_DATA, system);
      let diff = Math.abs(chart.houses[3].longitude - chart.houses[9].longitude);
      if (diff > 180) diff = 360 - diff;
      expect(diff).toBeCloseTo(180, 1);
    });
  });
});
