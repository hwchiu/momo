import { it, expect } from 'vitest';
// @ts-expect-error no types
import * as sidereal from 'astronomia/sidereal';
// @ts-expect-error no types
import * as nutation from 'astronomia/nutation';
// @ts-expect-error no types
import * as julian from 'astronomia/julian';

it('debug sidereal time for 1990-03-17 02:51 UTC', () => {
  // 1990-03-17 02:51 UTC
  const fractionalDay = 17 + (2 + 51 / 60) / 24;
  const cal = new julian.CalendarGregorian(1990, 3, fractionalDay);
  const jde = cal.toJDE();

  console.log('JDE:', jde);
  // expected JDE ≈ 2447936.619

  const gmst_raw = sidereal.mean(jde);
  console.log('sidereal.mean(jde) raw value:', gmst_raw);
  console.log('typeof:', typeof gmst_raw);

  // Try different conversions:
  const DEG = 180 / Math.PI;
  const RAD = Math.PI / 180;

  // If in seconds of time: /240 → degrees
  const gmst_if_seconds = (((gmst_raw / 240) % 360) + 360) % 360;
  console.log('If in seconds-of-time → degrees:', gmst_if_seconds);

  // If in radians: *DEG → degrees
  const gmst_if_radians = (((gmst_raw * DEG) % 360) + 360) % 360;
  console.log('If in radians → degrees:', gmst_if_radians);

  // If in degrees already
  const gmst_if_degrees = ((gmst_raw % 360) + 360) % 360;
  console.log('If already degrees:', gmst_if_degrees);

  // For 1990-03-17 02:51 UTC, lon=120.967°E
  // Expected LST to produce ASC = ~186° (5°52' Libra)
  // Working backward: if ASC is 186° Libra
  // ASC = atan2(-cos(RAMC), sin(ε)*tan(φ) + cos(ε)*sin(RAMC))
  // We need to find RAMC that gives ASC ≈ 186°

  const ε = nutation.meanObliquity(jde); // radians
  const φ = 24.8 * RAD;
  console.log('Obliquity (rad):', ε, '→ degrees:', ε * DEG);

  // targetAsc = atan2(-cos(RAMC), sin(ε)*tan(φ) + cos(ε)*sin(RAMC))
  // Rearranging: RAMC that gives this ASC
  // sin(ASC) * (sin(ε)*tan(φ) + cos(ε)*sin(RAMC)) = -cos(ASC)*(-1... no)
  // Let me just try different RAMC values

  for (const lon of [120.967]) {
    for (const gmstDeg of [gmst_if_seconds, gmst_if_radians, gmst_if_degrees]) {
      const lst = (((gmstDeg + lon) % 360) + 360) % 360;
      const ramc = lst * RAD;
      const asc =
        Math.atan2(-Math.cos(ramc), Math.sin(ε) * Math.tan(φ) + Math.cos(ε) * Math.sin(ramc)) * DEG;
      const normalizedAsc = ((asc % 360) + 360) % 360;
      console.log(
        `  gmst=${gmstDeg.toFixed(2)}°, LST=${lst.toFixed(2)}°, ASC=${normalizedAsc.toFixed(2)}° (expected ~185.87°)`,
      );
    }
  }

  expect(true).toBe(true);
});
