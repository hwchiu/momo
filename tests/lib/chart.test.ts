import { describe, it, expect } from 'vitest';
import { avoidOverlap } from '../../src/lib/chart';
import type { PlanetPosition } from '../../src/types/astro';
import { Planet, ZodiacSign } from '../../src/types/astro';

function makePlanet(lon: number): PlanetPosition {
  return {
    planet: Planet.Sun,
    longitude: lon,
    latitude: 0,
    speed: 1,
    sign: ZodiacSign.Aries,
    degree: Math.floor(lon % 30),
    minute: 0,
    retrograde: false,
  };
}

describe('avoidOverlap', () => {
  it('spreads planets clustered near 0°/360° boundary', () => {
    const planets = [makePlanet(355), makePlanet(5)];
    const result = avoidOverlap(planets, 0, 15);
    const angles = result.map((r) => r.adjustedAngle);
    const diff = Math.abs(angles[0] - angles[1]);
    const shortDiff = Math.min(diff, 360 - diff);
    expect(shortDiff).toBeGreaterThanOrEqual(14.9);
  });

  it('does not disturb planets that are already well separated', () => {
    const planets = [makePlanet(0), makePlanet(90), makePlanet(180), makePlanet(270)];
    const result = avoidOverlap(planets, 0, 8);
    for (const r of result) {
      const expected = 180 + (r.planet.longitude - 0);
      expect(Math.abs(r.adjustedAngle - expected)).toBeLessThan(2);
    }
  });
});
