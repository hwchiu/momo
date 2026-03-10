/**
 * Types for Sprint 1 classical techniques:
 *   - Solar / Lunar returns
 *   - Arabic lots (parts)
 *   - Annual profections
 */

import type { NatalChart, ZodiacSign, Planet } from './astro';

// ── Solar Return ──────────────────────────────────────────────────────────────

export interface SolarReturnChart {
  /** Julian Ephemeris Day of the exact solar return moment (UTC). */
  jde: number;
  /** UTC date/time of the solar return. */
  utc: { year: number; month: number; day: number; hour: number; minute: number };
  /** Full chart calculated for the SR moment at the natal location. */
  chart: NatalChart;
}

// ── Arabic Lots ───────────────────────────────────────────────────────────────

export interface ArabicLot {
  nameZh: string;
  nameEn: string;
  /** Human-readable formula, e.g. "ASC + ☽ − ☉ (日間)" */
  formula: string;
  /** Ecliptic longitude in degrees [0, 360). */
  longitude: number;
  sign: ZodiacSign;
  degree: number;
  minute: number;
  /** House number (1–12) in the natal chart. */
  house: number;
}

// ── Annual Profections ────────────────────────────────────────────────────────

export interface ProfectionResult {
  /** The age of the native in the profection year. */
  age: number;
  /** Active house (1–12). */
  house: number;
  /** Sign on the cusp of the profected house. */
  signOnCusp: ZodiacSign;
  /** Traditional (Chaldean) ruler of the profected house's sign. */
  lord: Planet;
  /** Natal planets located in the profected house. */
  planetsInHouse: Planet[];
}
