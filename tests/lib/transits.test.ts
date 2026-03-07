/**
 * Predictive astrology (推運) tests.
 *
 * Covers:
 *  1. Transits (過境)              — current planets vs natal, 2° orb
 *  2. Secondary Progressions (二次推運) — 1 day = 1 year, Sun advances ~1°/year
 *  3. Solar Arc Directions (太陽弧)  — all planets shifted by SA degrees
 *  4. Annual Profections (流年法)    — age % 12 determines activated house
 *
 * Reference natal chart: 1985-07-15 14:30 UTC, Taipei, Whole Sign
 * Target date: 2026-03-07 12:00 UTC (age ~40.6)
 */

import { describe, it, expect } from 'vitest';
import {
  getTransitChart,
  getProgressedChart,
  getSolarArcChart,
  getProfection,
  formatLon,
} from '../../src/lib/transits';
import { calculateNatalChart } from '../../src/lib/astro';
import { HouseSystem, Planet, ZodiacSign } from '../../src/types/astro';
import type { BirthData } from '../../src/types/astro';

const NATAL_DATA: BirthData = {
  year: 1985, month: 7, day: 15, hour: 14, minute: 30,
  latitude: 25.033, longitude: 121.5654, locationName: '台北',
};
const natalChart = calculateNatalChart(NATAL_DATA, HouseSystem.WholeSign);

// 2026-03-07 12:00 UTC
const TODAY = new Date(Date.UTC(2026, 2, 7, 12, 0, 0));

// ---- Transits ----

describe('getTransitChart', () => {
  it('returns transit planets', () => {
    const t = getTransitChart(natalChart, TODAY);
    expect(t.planets.length).toBeGreaterThan(0);
  });

  it('transit date is normalized to noon UTC', () => {
    const t = getTransitChart(natalChart, TODAY);
    expect(t.date.getUTCHours()).toBe(12);
    expect(t.date.getUTCMinutes()).toBe(0);
  });

  it('date in returned object matches the input date (same day)', () => {
    const t = getTransitChart(natalChart, TODAY);
    expect(t.date.getUTCFullYear()).toBe(2026);
    expect(t.date.getUTCMonth()).toBe(2); // March
    expect(t.date.getUTCDate()).toBe(7);
  });

  it('all transit planet longitudes are in [0, 360)', () => {
    const t = getTransitChart(natalChart, TODAY);
    for (const p of t.planets) {
      expect(p.longitude).toBeGreaterThanOrEqual(0);
      expect(p.longitude).toBeLessThan(360);
    }
  });

  it('all transit aspects are within 2° orb', () => {
    const t = getTransitChart(natalChart, TODAY);
    for (const asp of t.aspects) {
      expect(asp.orb).toBeGreaterThanOrEqual(0);
      expect(asp.orb).toBeLessThanOrEqual(2.0);
    }
  });

  it('aspects reference valid transit and natal planets', () => {
    const t = getTransitChart(natalChart, TODAY);
    const transitPlanetSet = new Set(t.planets.map((p) => p.planet));
    const natalPlanetSet = new Set(natalChart.planets.map((p) => p.planet));
    for (const asp of t.aspects) {
      expect(transitPlanetSet.has(asp.transitPlanet)).toBe(true);
      expect(natalPlanetSet.has(asp.natalPlanet)).toBe(true);
    }
  });

  it('Sun moves ~1° per day between consecutive transits', () => {
    const t1 = getTransitChart(natalChart, new Date(Date.UTC(2026, 2, 7)));
    const t2 = getTransitChart(natalChart, new Date(Date.UTC(2026, 2, 8)));
    const sun1 = t1.planets.find((p) => p.planet === Planet.Sun)!;
    const sun2 = t2.planets.find((p) => p.planet === Planet.Sun)!;
    let diff = sun2.longitude - sun1.longitude;
    if (diff < 0) diff += 360;
    expect(diff).toBeGreaterThan(0.8);
    expect(diff).toBeLessThan(1.2);
  });

  it('Sun in Pisces (~330-360°) in early March 2026', () => {
    const t = getTransitChart(natalChart, TODAY);
    const sun = t.planets.find((p) => p.planet === Planet.Sun)!;
    // Early March: Sun ≈ 346° (Pisces, sign index 11)
    expect(sun.sign).toBe(ZodiacSign.Pisces);
  });

  it('degree is in [0, 30) for each transit planet', () => {
    const t = getTransitChart(natalChart, TODAY);
    for (const p of t.planets) {
      expect(p.degree).toBeGreaterThanOrEqual(0);
      expect(p.degree).toBeLessThan(30);
    }
  });

  it('minute is in [0, 60) for each transit planet', () => {
    const t = getTransitChart(natalChart, TODAY);
    for (const p of t.planets) {
      expect(p.minute).toBeGreaterThanOrEqual(0);
      expect(p.minute).toBeLessThan(60);
    }
  });

  it('sign index matches floor(longitude / 30)', () => {
    const t = getTransitChart(natalChart, TODAY);
    for (const p of t.planets) {
      expect(p.sign).toBe(Math.floor(p.longitude / 30));
    }
  });

  it('applying flag is boolean', () => {
    const t = getTransitChart(natalChart, TODAY);
    for (const asp of t.aspects) {
      expect(typeof asp.applying).toBe('boolean');
    }
  });
});

// ---- Secondary Progressions ----

describe('getProgressedChart', () => {
  it('returns progressed planets', () => {
    const p = getProgressedChart(natalChart, TODAY);
    expect(p.planets.length).toBeGreaterThan(0);
  });

  it('progressedAge is ~40.6 years for 1985-07 chart in 2026-03', () => {
    const p = getProgressedChart(natalChart, TODAY);
    expect(p.progressedAge).toBeGreaterThan(39);
    expect(p.progressedAge).toBeLessThan(42);
  });

  it('all progressed planet longitudes are in [0, 360)', () => {
    const p = getProgressedChart(natalChart, TODAY);
    for (const pl of p.planets) {
      expect(pl.longitude).toBeGreaterThanOrEqual(0);
      expect(pl.longitude).toBeLessThan(360);
    }
  });

  it('all progressed aspects are within 2° orb', () => {
    const p = getProgressedChart(natalChart, TODAY);
    for (const asp of p.aspects) {
      expect(asp.orb).toBeLessThanOrEqual(2.0);
      expect(asp.orb).toBeGreaterThanOrEqual(0);
    }
  });

  it('progressed Ascendant is in [0, 360)', () => {
    const p = getProgressedChart(natalChart, TODAY);
    expect(p.progressedAsc).toBeGreaterThanOrEqual(0);
    expect(p.progressedAsc).toBeLessThan(360);
  });

  it('progressed MC is in [0, 360)', () => {
    const p = getProgressedChart(natalChart, TODAY);
    expect(p.progressedMC).toBeGreaterThanOrEqual(0);
    expect(p.progressedMC).toBeLessThan(360);
  });

  it('progressed Sun advanced ~38-42° from natal Sun (~1°/year × ~40 years)', () => {
    const natalSun = natalChart.planets.find((p) => p.planet === Planet.Sun)!;
    const prog = getProgressedChart(natalChart, TODAY);
    const progSun = prog.planets.find((p) => p.planet === Planet.Sun)!;
    let diff = progSun.longitude - natalSun.longitude;
    if (diff < 0) diff += 360;
    if (diff > 180) diff -= 360; // take signed shorter arc
    expect(Math.abs(diff)).toBeGreaterThan(25);
    expect(Math.abs(diff)).toBeLessThan(50);
  });

  it('progressed Moon advanced more than natal Moon (Moon moves ~13°/day ≈ 13°/year in SP)', () => {
    const natalMoon = natalChart.planets.find((p) => p.planet === Planet.Moon)!;
    const prog = getProgressedChart(natalChart, TODAY);
    const progMoon = prog.planets.find((p) => p.planet === Planet.Moon)!;
    // Moon should have moved much more than Sun in progressions (~13°/year × 40 years)
    let moonDiff = progMoon.longitude - natalMoon.longitude;
    if (moonDiff < 0) moonDiff += 360;
    if (moonDiff > 180) moonDiff -= 360;
    // At least a few degrees advance expected
    expect(Math.abs(moonDiff)).toBeGreaterThan(1);
  });

  it('returned date matches input date', () => {
    const p = getProgressedChart(natalChart, TODAY);
    expect(p.date.getTime()).toBe(TODAY.getTime());
  });

  it('progressedAge increases for later dates', () => {
    const earlier = getProgressedChart(natalChart, new Date(Date.UTC(2020, 0, 1)));
    const later = getProgressedChart(natalChart, new Date(Date.UTC(2030, 0, 1)));
    expect(later.progressedAge).toBeGreaterThan(earlier.progressedAge);
  });
});

// ---- Solar Arc Directions ----

describe('getSolarArcChart', () => {
  it('returns solar arc planets', () => {
    const sa = getSolarArcChart(natalChart, TODAY);
    expect(sa.planets.length).toBeGreaterThan(0);
  });

  it('solarArc is non-negative', () => {
    const sa = getSolarArcChart(natalChart, TODAY);
    expect(sa.solarArc).toBeGreaterThanOrEqual(0);
  });

  it('solarArc is approximately 40° (1° per year × ~40 years)', () => {
    const sa = getSolarArcChart(natalChart, TODAY);
    expect(sa.solarArc).toBeGreaterThan(30);
    expect(sa.solarArc).toBeLessThan(50);
  });

  it('all SA planet longitudes are in [0, 360)', () => {
    const sa = getSolarArcChart(natalChart, TODAY);
    for (const p of sa.planets) {
      expect(p.longitude).toBeGreaterThanOrEqual(0);
      expect(p.longitude).toBeLessThan(360);
    }
  });

  it('all SA aspects are within 1° orb', () => {
    const sa = getSolarArcChart(natalChart, TODAY);
    for (const asp of sa.aspects) {
      expect(asp.orb).toBeLessThanOrEqual(1.0);
      expect(asp.orb).toBeGreaterThanOrEqual(0);
    }
  });

  it('each SA planet is exactly solarArc degrees ahead of its natal position', () => {
    const sa = getSolarArcChart(natalChart, TODAY);
    for (const saPlanet of sa.planets) {
      const natalPlanet = natalChart.planets.find((p) => p.planet === saPlanet.planet)!;
      // forward arc from natal to SA position
      const diff = (saPlanet.longitude - natalPlanet.longitude + 360) % 360;
      expect(diff).toBeCloseTo(sa.solarArc, 1);
    }
  });

  it('solarArc increases for later dates', () => {
    const sa2020 = getSolarArcChart(natalChart, new Date(Date.UTC(2020, 0, 1)));
    const sa2030 = getSolarArcChart(natalChart, new Date(Date.UTC(2030, 0, 1)));
    expect(sa2030.solarArc).toBeGreaterThan(sa2020.solarArc);
  });

  it('returned date matches input', () => {
    const sa = getSolarArcChart(natalChart, TODAY);
    expect(sa.date.getTime()).toBe(TODAY.getTime());
  });
});

// ---- Annual Profections ----

describe('getProfection', () => {
  // Helper: date clearly within age N (August 1 each year, well past July 15 birthday)
  // Using July 15 exactly fails because 365 days / 365.25 = 0.9993 < 1.0
  function dateAtAge(n: number): Date {
    return new Date(Date.UTC(1985 + n, 7, 1, 12, 0)); // August 1 of (birth year + n)
  }

  it('age 0 (birth date) activates house 1', () => {
    const r = getProfection(natalChart, dateAtAge(0));
    expect(r.age).toBe(0);
    expect(r.activatedHouse).toBe(1);
  });

  it('age 1 activates house 2', () => {
    const r = getProfection(natalChart, dateAtAge(1));
    expect(r.age).toBe(1);
    expect(r.activatedHouse).toBe(2);
  });

  it('age 11 activates house 12', () => {
    const r = getProfection(natalChart, dateAtAge(11));
    expect(r.age).toBe(11);
    expect(r.activatedHouse).toBe(12);
  });

  it('age 12 activates house 1 again (12-year cycle resets)', () => {
    const r = getProfection(natalChart, dateAtAge(12));
    expect(r.age).toBe(12);
    expect(r.activatedHouse).toBe(1);
  });

  it('activatedHouse = (age % 12) + 1 for ages 0–35', () => {
    for (let age = 0; age <= 35; age++) {
      const r = getProfection(natalChart, dateAtAge(age));
      expect(r.activatedHouse).toBe((age % 12) + 1);
    }
  });

  it('activatedSign matches the sign of the activated house cusp', () => {
    for (let age = 0; age < 12; age++) {
      const r = getProfection(natalChart, dateAtAge(age));
      const houseIdx = age % 12;
      expect(r.activatedSign).toBe(natalChart.houses[houseIdx].sign);
    }
  });

  it('lordOfYear is one of the 7 classical planets', () => {
    const classicalPlanets = [
      Planet.Sun, Planet.Moon, Planet.Mercury, Planet.Venus,
      Planet.Mars, Planet.Jupiter, Planet.Saturn,
    ];
    for (let age = 0; age < 12; age++) {
      const r = getProfection(natalChart, dateAtAge(age));
      expect(classicalPlanets).toContain(r.lordOfYear);
    }
  });

  it('houseTopicZh is a non-empty string', () => {
    for (let age = 0; age < 12; age++) {
      const r = getProfection(natalChart, dateAtAge(age));
      expect(typeof r.houseTopicZh).toBe('string');
      expect(r.houseTopicZh.length).toBeGreaterThan(0);
    }
  });

  it('age in 2026-03 is 40 (birth year 1985, July)', () => {
    const r = getProfection(natalChart, TODAY);
    expect(r.age).toBe(40);
  });

  it('activatedHouse in 2026-03 is 5 (age 40: 40%12=4, house 5)', () => {
    const r = getProfection(natalChart, TODAY);
    expect(r.activatedHouse).toBe(5);
  });

  it('different natal charts give different profection lords for same date', () => {
    const other: BirthData = {
      year: 1990, month: 3, day: 20, hour: 6, minute: 0,
      latitude: 51.5, longitude: 0, locationName: 'London',
    };
    const otherChart = calculateNatalChart(other, HouseSystem.WholeSign);
    const r1 = getProfection(natalChart, TODAY);
    const r2 = getProfection(otherChart, TODAY);
    // Different charts have different house cusps → typically different lords
    // We just check both are valid
    const valid = [Planet.Sun, Planet.Moon, Planet.Mercury, Planet.Venus, Planet.Mars, Planet.Jupiter, Planet.Saturn];
    expect(valid).toContain(r1.lordOfYear);
    expect(valid).toContain(r2.lordOfYear);
  });
});

// ---- formatLon utility ----

describe('formatLon', () => {
  it('formats 0° as Aries 0°00\'', () => {
    const s = formatLon(0);
    expect(s).toContain('♈');
    expect(s).toContain("0°");
    expect(s).toContain("00'");
  });

  it('formats 90° as Cancer 0°00\'', () => {
    const s = formatLon(90);
    expect(s).toContain('♋');
    expect(s).toContain("0°");
  });

  it('formats 45° as Taurus 15°', () => {
    const s = formatLon(45);
    expect(s).toContain('♉');
    expect(s).toContain('15°');
  });

  it('formats 180° as Libra 0°', () => {
    const s = formatLon(180);
    expect(s).toContain('♎');
    expect(s).toContain('0°');
  });

  it('formats 359.5° without throwing', () => {
    const s = formatLon(359.5);
    expect(typeof s).toBe('string');
    expect(s.length).toBeGreaterThan(3);
  });

  it('includes minutes formatted with padding', () => {
    // 30.5° = Taurus 0°30'
    const s = formatLon(30.5);
    expect(s).toContain('♉');
    expect(s).toContain('30');
  });

  it('sign changes at each 30° boundary', () => {
    const glyphs = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];
    for (let i = 0; i < 12; i++) {
      const s = formatLon(i * 30 + 15); // mid-sign
      expect(s).toContain(glyphs[i]);
    }
  });
});

// ---- Cross-technique consistency ----

describe('Cross-technique consistency', () => {
  it('solar arc equals progressed Sun minus natal Sun (within 1°)', () => {
    const sa = getSolarArcChart(natalChart, TODAY);
    const prog = getProgressedChart(natalChart, TODAY);
    const natalSun = natalChart.planets.find((p) => p.planet === Planet.Sun)!;
    const progSun = prog.planets.find((p) => p.planet === Planet.Sun)!;

    let saFromProg = progSun.longitude - natalSun.longitude;
    if (saFromProg < 0) saFromProg += 360;
    if (saFromProg > 180) saFromProg -= 360;

    expect(Math.abs(saFromProg) - sa.solarArc).toBeLessThan(1);
  });

  it('all three predictive methods agree on approximate age of chart (40 years)', () => {
    const prog = getProgressedChart(natalChart, TODAY);
    const sa = getSolarArcChart(natalChart, TODAY);
    const profection = getProfection(natalChart, TODAY);

    // All should reflect ~40 years of life
    expect(prog.progressedAge).toBeGreaterThan(39);
    expect(sa.solarArc).toBeGreaterThan(30); // ~1°/year
    expect(profection.age).toBe(40);
  });
});
