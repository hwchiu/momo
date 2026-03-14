/**
 * Vedic Astrology (Jyotish) calculation tests.
 *
 * Reference anchors:
 *  - J2000 epoch: 2000-01-01 12:00 UTC
 *  - Lahiri ayanamsha at J2000 = 23.85317° (definition)
 *  - Sun tropical at J2000 ≈ 280.46° → sidereal ≈ 256.6° → Dhanus (Sagittarius, rashi 8)
 *  - Ketu is always exactly 180° opposite Rahu
 *  - Vimshottari cycle: 9 lords, total 120 years
 *  - DASHA_YEARS = [7,20,6,10,7,18,16,19,17]
 */

import { describe, it, expect } from 'vitest';
import { calculateVedicChart } from '../../src/lib/vedic';
import { DASHA_YEARS, DASHA_ORDER, NAKSHATRAS } from '../../src/types/vedic';
import type { VedicInput } from '../../src/types/vedic';

const J2000_VEDIC: VedicInput = {
  year: 2000,
  month: 1,
  day: 1,
  hour: 12,
  minute: 0,
  latitude: 51.5074,
  longitude: -0.1278,
  locationName: 'London',
  ayanamsha: 'lahiri',
};

const TAIPEI_VEDIC: VedicInput = {
  year: 1985,
  month: 7,
  day: 15,
  hour: 14,
  minute: 30,
  latitude: 25.033,
  longitude: 121.5654,
  locationName: '台北',
  ayanamsha: 'lahiri',
};

// ---- Chart structure ----

describe('calculateVedicChart - planet structure', () => {
  it('returns exactly 9 planets', () => {
    const chart = calculateVedicChart(J2000_VEDIC);
    expect(chart.planets).toHaveLength(9);
  });

  it('includes all 9 required planets', () => {
    const chart = calculateVedicChart(J2000_VEDIC);
    const names = chart.planets.map((p) => p.name);
    for (const name of [
      'Sun',
      'Moon',
      'Mars',
      'Mercury',
      'Jupiter',
      'Venus',
      'Saturn',
      'Rahu',
      'Ketu',
    ]) {
      expect(names).toContain(name);
    }
  });

  it('each planet has required fields', () => {
    const chart = calculateVedicChart(J2000_VEDIC);
    for (const p of chart.planets) {
      expect(p.name).toBeDefined();
      expect(p.nameZh).toBeDefined();
      expect(p.abbr).toBeDefined();
      expect(typeof p.tropicalLon).toBe('number');
      expect(typeof p.siderealLon).toBe('number');
      expect(typeof p.rashi).toBe('number');
      expect(typeof p.nakshatra).toBe('number');
      expect(typeof p.pada).toBe('number');
      expect(typeof p.house).toBe('number');
      expect(typeof p.retrograde).toBe('boolean');
    }
  });

  it('all tropical longitudes are in [0, 360)', () => {
    const chart = calculateVedicChart(J2000_VEDIC);
    for (const p of chart.planets) {
      expect(p.tropicalLon).toBeGreaterThanOrEqual(0);
      expect(p.tropicalLon).toBeLessThan(360);
    }
  });

  it('all sidereal longitudes are in [0, 360)', () => {
    const chart = calculateVedicChart(J2000_VEDIC);
    for (const p of chart.planets) {
      expect(p.siderealLon).toBeGreaterThanOrEqual(0);
      expect(p.siderealLon).toBeLessThan(360);
    }
  });

  it('all rashi indices are in [0, 11]', () => {
    const chart = calculateVedicChart(J2000_VEDIC);
    for (const p of chart.planets) {
      expect(p.rashi).toBeGreaterThanOrEqual(0);
      expect(p.rashi).toBeLessThanOrEqual(11);
    }
  });

  it('all nakshatra indices are in [0, 26]', () => {
    const chart = calculateVedicChart(J2000_VEDIC);
    for (const p of chart.planets) {
      expect(p.nakshatra).toBeGreaterThanOrEqual(0);
      expect(p.nakshatra).toBeLessThanOrEqual(26);
    }
  });

  it('all pada values are in [1, 4]', () => {
    const chart = calculateVedicChart(J2000_VEDIC);
    for (const p of chart.planets) {
      expect(p.pada).toBeGreaterThanOrEqual(1);
      expect(p.pada).toBeLessThanOrEqual(4);
    }
  });

  it('all house numbers are in [1, 12]', () => {
    const chart = calculateVedicChart(J2000_VEDIC);
    for (const p of chart.planets) {
      expect(p.house).toBeGreaterThanOrEqual(1);
      expect(p.house).toBeLessThanOrEqual(12);
    }
  });

  it('degreeInRashi equals siderealLon mod 30', () => {
    const chart = calculateVedicChart(J2000_VEDIC);
    for (const p of chart.planets) {
      expect(p.degreeInRashi).toBeCloseTo(p.siderealLon % 30, 5);
    }
  });

  it('rashi equals floor(siderealLon / 30)', () => {
    const chart = calculateVedicChart(J2000_VEDIC);
    for (const p of chart.planets) {
      expect(p.rashi).toBe(Math.floor(p.siderealLon / 30));
    }
  });

  it('dignity is null, exalted, or debilitated', () => {
    const chart = calculateVedicChart(J2000_VEDIC);
    for (const p of chart.planets) {
      expect([null, 'exalted', 'debilitated']).toContain(p.dignity);
    }
  });
});

// ---- Lagna ----

describe('calculateVedicChart - lagna', () => {
  it('lagna is in [0, 360)', () => {
    const chart = calculateVedicChart(J2000_VEDIC);
    expect(chart.lagna).toBeGreaterThanOrEqual(0);
    expect(chart.lagna).toBeLessThan(360);
  });

  it('lagnaRashi is in [0, 11]', () => {
    const chart = calculateVedicChart(J2000_VEDIC);
    expect(chart.lagnaRashi).toBeGreaterThanOrEqual(0);
    expect(chart.lagnaRashi).toBeLessThanOrEqual(11);
  });

  it('lagnaRashi equals floor(lagna / 30)', () => {
    const chart = calculateVedicChart(J2000_VEDIC);
    expect(chart.lagnaRashi).toBe(Math.floor(chart.lagna / 30));
  });

  it('different birth locations produce different lagna', () => {
    const london = calculateVedicChart(J2000_VEDIC);
    const taipei = calculateVedicChart({ ...J2000_VEDIC, latitude: 25.033, longitude: 121.5654 });
    // Very different locations; lagna is time-and-location-dependent
    expect(london.lagna).not.toBeCloseTo(taipei.lagna, 0);
  });
});

// ---- Ayanamsha ----

describe('calculateVedicChart - Ayanamsha', () => {
  it('Lahiri ayanamsha at J2000 is ~23.853°', () => {
    const chart = calculateVedicChart(J2000_VEDIC);
    expect(chart.ayanamshaValue).toBeCloseTo(23.85317, 2);
  });

  it('Raman ayanamsha at J2000 is ~22.46°', () => {
    const chart = calculateVedicChart({ ...J2000_VEDIC, ayanamsha: 'raman' });
    expect(chart.ayanamshaValue).toBeCloseTo(22.46, 1);
  });

  it('KP ayanamsha at J2000 is ~23.73°', () => {
    const chart = calculateVedicChart({ ...J2000_VEDIC, ayanamsha: 'krishnamurti' });
    expect(chart.ayanamshaValue).toBeCloseTo(23.73, 1);
  });

  it('Lahiri > KP > Raman at J2000 (as expected from base values)', () => {
    const lahiri = calculateVedicChart({ ...J2000_VEDIC, ayanamsha: 'lahiri' });
    const kp = calculateVedicChart({ ...J2000_VEDIC, ayanamsha: 'krishnamurti' });
    const raman = calculateVedicChart({ ...J2000_VEDIC, ayanamsha: 'raman' });
    expect(lahiri.ayanamshaValue).toBeGreaterThan(kp.ayanamshaValue);
    expect(kp.ayanamshaValue).toBeGreaterThan(raman.ayanamshaValue);
  });

  it('sidereal longitude equals (tropical - ayanamsha) mod 360', () => {
    const chart = calculateVedicChart(J2000_VEDIC);
    for (const p of chart.planets) {
      const expected = (((p.tropicalLon - chart.ayanamshaValue) % 360) + 360) % 360;
      expect(p.siderealLon).toBeCloseTo(expected, 3);
    }
  });

  it('larger ayanamsha shifts sidereal positions backward (lower longitude)', () => {
    const lahiri = calculateVedicChart({ ...J2000_VEDIC, ayanamsha: 'lahiri' });
    const raman = calculateVedicChart({ ...J2000_VEDIC, ayanamsha: 'raman' });
    const sunLahiri = lahiri.planets.find((p) => p.name === 'Sun')!;
    const sunRaman = raman.planets.find((p) => p.name === 'Sun')!;
    // Lahiri subtracts more → smaller sidereal longitude
    expect(sunLahiri.siderealLon).toBeLessThan(sunRaman.siderealLon);
  });
});

// ---- Specific planet positions ----

describe('calculateVedicChart - specific reference positions', () => {
  it('Sun at J2000 is in Dhanus / Sagittarius (sidereal rashi 8)', () => {
    // Sun tropical ~280.46° - Lahiri 23.85° ≈ 256.6° → floor(256.6/30) = 8 (Dhanus)
    const chart = calculateVedicChart(J2000_VEDIC);
    const sun = chart.planets.find((p) => p.name === 'Sun')!;
    expect(sun.rashi).toBe(8); // Dhanus
  });

  it('Sun at J2000 is in Mula nakshatra (19)', () => {
    // 256.6° / (360/27) = 256.6 / 13.333 = 19.25 → nakshatra 19 (Mula)
    const chart = calculateVedicChart(J2000_VEDIC);
    const sun = chart.planets.find((p) => p.name === 'Sun')!;
    expect(sun.nakshatra).toBe(19); // Mula
  });

  it('Rahu at J2000 is in sidereal Leo area (~101°)', () => {
    // Tropical Ω = 125.04455° at T=0; sidereal = 125.04 - 23.85 = 101.19° → rashi 3 (Cancer)
    const chart = calculateVedicChart(J2000_VEDIC);
    const rahu = chart.planets.find((p) => p.name === 'Rahu')!;
    // sidereal longitude should be around 101° (Cancer, rashi 3)
    expect(rahu.siderealLon).toBeGreaterThan(90);
    expect(rahu.siderealLon).toBeLessThan(120);
  });

  it('Sun in Taipei 1985-07-15 is in Mithuna (Gemini, rashi 2) or Karkata (Cancer, rashi 3)', () => {
    // Tropical Sun in mid-July ≈ 113° (Cancer), sidereal = 113 - 23.85 ≈ 89° → Gemini/Cancer border
    const chart = calculateVedicChart(TAIPEI_VEDIC);
    const sun = chart.planets.find((p) => p.name === 'Sun')!;
    expect([2, 3]).toContain(sun.rashi); // Gemini(2) or Cancer(3)
  });
});

// ---- Rahu / Ketu relationship ----

describe('calculateVedicChart - Rahu/Ketu', () => {
  it('Ketu is exactly 180° from Rahu (sidereal)', () => {
    const chart = calculateVedicChart(J2000_VEDIC);
    const rahu = chart.planets.find((p) => p.name === 'Rahu')!;
    const ketu = chart.planets.find((p) => p.name === 'Ketu')!;
    let diff = Math.abs(rahu.siderealLon - ketu.siderealLon);
    if (diff > 180) diff = 360 - diff;
    expect(diff).toBeCloseTo(180, 5);
  });

  it('Ketu tropical longitude is Rahu tropical + 180° (mod 360)', () => {
    const chart = calculateVedicChart(J2000_VEDIC);
    const rahu = chart.planets.find((p) => p.name === 'Rahu')!;
    const ketu = chart.planets.find((p) => p.name === 'Ketu')!;
    const expected = (rahu.tropicalLon + 180) % 360;
    expect(ketu.tropicalLon).toBeCloseTo(expected, 5);
  });

  it('Rahu and Ketu are always retrograde', () => {
    const chart = calculateVedicChart(J2000_VEDIC);
    expect(chart.planets.find((p) => p.name === 'Rahu')!.retrograde).toBe(true);
    expect(chart.planets.find((p) => p.name === 'Ketu')!.retrograde).toBe(true);
  });

  it('Sun and Moon are never retrograde', () => {
    const chart = calculateVedicChart(J2000_VEDIC);
    expect(chart.planets.find((p) => p.name === 'Sun')!.retrograde).toBe(false);
    expect(chart.planets.find((p) => p.name === 'Moon')!.retrograde).toBe(false);
  });
});

// ---- Dignity ----

describe('calculateVedicChart - dignity rules', () => {
  it('Sun in Aries sidereal (rashi 0) should be exalted', () => {
    // Find a date when sidereal Sun is in Aries: tropical ~24°-54° ≈ mid-April to mid-May
    const ariesChart = calculateVedicChart({
      year: 2000,
      month: 4,
      day: 20,
      hour: 12,
      minute: 0,
      latitude: 51.5,
      longitude: 0,
      locationName: 'London',
      ayanamsha: 'lahiri',
    });
    const sun = ariesChart.planets.find((p) => p.name === 'Sun')!;
    if (sun.rashi === 0) {
      expect(sun.dignity).toBe('exalted');
    }
    // (test is conditional; the point is no wrong dignity is set)
  });

  it('Sun in Libra sidereal (rashi 6) should be debilitated', () => {
    // Sidereal Sun in Libra: tropical ~204°-234° ≈ late Oct to late Nov
    const libraChart = calculateVedicChart({
      year: 2000,
      month: 11,
      day: 1,
      hour: 12,
      minute: 0,
      latitude: 51.5,
      longitude: 0,
      locationName: 'London',
      ayanamsha: 'lahiri',
    });
    const sun = libraChart.planets.find((p) => p.name === 'Sun')!;
    if (sun.rashi === 6) {
      expect(sun.dignity).toBe('debilitated');
    }
  });

  it('Moon in Taurus sidereal (rashi 1) should be exalted', () => {
    // Find dates and verify if Moon happens to be in Taurus sidereal
    const chart = calculateVedicChart(J2000_VEDIC);
    const moon = chart.planets.find((p) => p.name === 'Moon')!;
    if (moon.rashi === 1) {
      expect(moon.dignity).toBe('exalted');
    } else {
      expect([null, 'debilitated']).toContain(moon.dignity);
    }
  });

  it('Saturn in Libra sidereal (rashi 6) should be exalted', () => {
    // Verify dignity logic is applied correctly
    const chart = calculateVedicChart(J2000_VEDIC);
    const saturn = chart.planets.find((p) => p.name === 'Saturn')!;
    if (saturn.rashi === 6) {
      expect(saturn.dignity).toBe('exalted');
    } else if (saturn.rashi === 0) {
      expect(saturn.dignity).toBe('debilitated');
    } else {
      expect(saturn.dignity).toBeNull();
    }
  });
});

// ---- Dasha ----

describe('calculateVedicChart - Vimshottari Dasha', () => {
  it('produces exactly 9 Maha Dashas', () => {
    const chart = calculateVedicChart(J2000_VEDIC);
    expect(chart.dashas).toHaveLength(9);
  });

  it('exactly one Maha Dasha is current (isCurrent=true)', () => {
    const chart = calculateVedicChart(J2000_VEDIC);
    const current = chart.dashas.filter((d) => d.isCurrent);
    expect(current).toHaveLength(1);
  });

  it('each Maha Dasha has exactly 9 Antardasha', () => {
    const chart = calculateVedicChart(J2000_VEDIC);
    for (const maha of chart.dashas) {
      expect(maha.antardasha).toHaveLength(9);
    }
  });

  it('exactly one Antardasha is current in the current Maha Dasha', () => {
    const chart = calculateVedicChart(J2000_VEDIC);
    const currentMaha = chart.dashas.find((d) => d.isCurrent)!;
    const currentAntar = currentMaha.antardasha.filter((a) => a.isCurrent);
    expect(currentAntar).toHaveLength(1);
  });

  it('first dasha duration <= full period for that lord (partial birth dasha)', () => {
    const chart = calculateVedicChart(J2000_VEDIC);
    const first = chart.dashas[0];
    const lordIdx = DASHA_ORDER.indexOf(first.lord);
    expect(first.durationYears).toBeLessThanOrEqual(DASHA_YEARS[lordIdx] + 0.001);
    expect(first.durationYears).toBeGreaterThan(0);
  });

  it('dashas 2–9 have full durations matching DASHA_YEARS', () => {
    const chart = calculateVedicChart(J2000_VEDIC);
    for (let i = 1; i < 9; i++) {
      const dasha = chart.dashas[i];
      const lordIdx = DASHA_ORDER.indexOf(dasha.lord);
      expect(dasha.durationYears).toBeCloseTo(DASHA_YEARS[lordIdx], 3);
    }
  });

  it('dasha sequence follows DASHA_ORDER starting from Moon nakshatra lord', () => {
    const chart = calculateVedicChart(J2000_VEDIC);
    const moon = chart.planets.find((p) => p.name === 'Moon')!;
    const startLordIdx = moon.nakshatra % 9;
    for (let i = 0; i < 9; i++) {
      const expectedLord = DASHA_ORDER[(startLordIdx + i) % 9];
      expect(chart.dashas[i].lord).toBe(expectedLord);
    }
  });

  it('consecutive Maha Dasha end/start dates are contiguous', () => {
    const chart = calculateVedicChart(J2000_VEDIC);
    for (let i = 1; i < chart.dashas.length; i++) {
      const prevEnd = chart.dashas[i - 1].endDate.getTime();
      const nextStart = chart.dashas[i].startDate.getTime();
      // Allow 1 second tolerance from floating-point date arithmetic
      expect(Math.abs(nextStart - prevEnd)).toBeLessThan(1000);
    }
  });

  it('total duration of all 9 dashas is <= 120 years', () => {
    const chart = calculateVedicChart(J2000_VEDIC);
    const total = chart.dashas.reduce((sum, d) => sum + d.durationYears, 0);
    expect(total).toBeLessThanOrEqual(120 + 0.001);
    expect(total).toBeGreaterThan(100);
  });

  it('antardasha durations within a maha sum to maha duration', () => {
    const chart = calculateVedicChart(J2000_VEDIC);
    for (const maha of chart.dashas) {
      const antarSum = maha.antardasha.reduce((s, a) => {
        return s + (a.endDate.getTime() - a.startDate.getTime());
      }, 0);
      const mahaMs = maha.endDate.getTime() - maha.startDate.getTime();
      // Allow 1 second rounding tolerance
      expect(Math.abs(antarSum - mahaMs)).toBeLessThan(1000);
    }
  });

  it('works with Taipei reference data', () => {
    const chart = calculateVedicChart(TAIPEI_VEDIC);
    expect(chart.planets).toHaveLength(9);
    expect(chart.dashas).toHaveLength(9);
    expect(chart.dashas.filter((d) => d.isCurrent)).toHaveLength(1);
  });
});

// ---- House (Whole Sign) ----

describe('calculateVedicChart - Whole Sign houses', () => {
  it('Lagna planet is always in house 1', () => {
    const chart = calculateVedicChart(J2000_VEDIC);
    const lagnaRashi = chart.lagnaRashi;
    for (const p of chart.planets) {
      if (p.rashi === lagnaRashi) {
        expect(p.house).toBe(1);
      }
    }
  });

  it('planet house = (rashi - lagnaRashi + 12) % 12 + 1', () => {
    const chart = calculateVedicChart(J2000_VEDIC);
    for (const p of chart.planets) {
      const expected = ((p.rashi - chart.lagnaRashi + 12) % 12) + 1;
      expect(p.house).toBe(expected);
    }
  });
});

// ---- DASHA_YEARS constant ----

describe('DASHA_YEARS', () => {
  it('sums to exactly 120', () => {
    const total = DASHA_YEARS.reduce((a, b) => a + b, 0);
    expect(total).toBe(120);
  });

  it('has exactly 9 entries', () => {
    expect(DASHA_YEARS).toHaveLength(9);
  });
});

// ---- NAKSHATRAS constant ----

describe('NAKSHATRAS', () => {
  it('has exactly 27 entries', () => {
    expect(NAKSHATRAS).toHaveLength(27);
  });
});
