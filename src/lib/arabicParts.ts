/**
 * Arabic Parts / Hellenistic Lots (阿拉伯點 / 希臘命點).
 *
 * Classical technique from Hellenistic and medieval astrology. Each lot is
 * computed as a three-body formula: (ASC + A − B) mod 360.
 *
 * Day/night (sect) reversal: the two primary lots (Fortune and Spirit) and
 * several others swap their bodies for nocturnal charts. This follows the
 * Hellenistic practice described by Paulus Alexandrinus and Vettius Valens.
 *
 * isDayChart: Sun in houses 7–12 (above the horizon).
 */

import { houseForLongitude } from './astro';
import type { NatalChart, ZodiacSign } from '../types/astro';
import { Planet } from '../types/astro';
import type { ArabicLot } from '../types/returns';

/** Normalize an angle to [0, 360). */
function norm(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/** Compute (ASC + A − B) mod 360. */
function lot(asc: number, a: number, b: number): number {
  return norm(asc + a - b);
}

/** Get the longitude of a specific planet from the chart. Throws if missing. */
function lon(chart: NatalChart, planet: Planet): number {
  const p = chart.planets.find((pp) => pp.planet === planet);
  if (!p) throw new Error(`Planet not found: ${planet}`);
  return p.longitude;
}

/** Convert decimal longitude to sign + degree + minute. */
function toSignDegMin(longitude: number): { sign: ZodiacSign; degree: number; minute: number } {
  const n = norm(longitude);
  const sign = Math.floor(n / 30) as ZodiacSign;
  const withinSign = n % 30;
  const degree = Math.floor(withinSign);
  const minute = Math.floor((withinSign - degree) * 60);
  return { sign, degree, minute };
}

interface LotDef {
  nameZh: string;
  nameEn: string;
  /** Resolve to (A, B) for the formula ASC + A − B. Passes isDayChart for sect reversal. */
  bodies: (
    isDayChart: boolean,
    chart: NatalChart,
    fortune: number,
  ) => { a: number; b: number; formulaLabel: string };
}

const LOT_DEFS: LotDef[] = [
  {
    nameZh: '福運點',
    nameEn: 'Lot of Fortune',
    bodies: (day, c) => day
      ? { a: lon(c, Planet.Moon), b: lon(c, Planet.Sun), formulaLabel: 'ASC + ☽ − ☉ (日間)' }
      : { a: lon(c, Planet.Sun), b: lon(c, Planet.Moon), formulaLabel: 'ASC + ☉ − ☽ (夜間)' },
  },
  {
    nameZh: '精神點',
    nameEn: 'Lot of Spirit',
    bodies: (day, c) => day
      ? { a: lon(c, Planet.Sun), b: lon(c, Planet.Moon), formulaLabel: 'ASC + ☉ − ☽ (日間)' }
      : { a: lon(c, Planet.Moon), b: lon(c, Planet.Sun), formulaLabel: 'ASC + ☽ − ☉ (夜間)' },
  },
  {
    nameZh: '愛情點',
    nameEn: 'Lot of Eros',
    // Day: ASC + Venus − Fortune; Night: ASC + Fortune − Venus
    bodies: (day, c, fortune) => day
      ? { a: lon(c, Planet.Venus), b: fortune, formulaLabel: 'ASC + ♀ − 福運點 (日間)' }
      : { a: fortune, b: lon(c, Planet.Venus), formulaLabel: 'ASC + 福運點 − ♀ (夜間)' },
  },
  {
    nameZh: '必要點',
    nameEn: 'Lot of Necessity',
    // ASC + Fortune − Mercury (Paulus)
    bodies: (_day, c, fortune) => ({
      a: fortune,
      b: lon(c, Planet.Mercury),
      formulaLabel: 'ASC + 福運點 − ☿',
    }),
  },
  {
    nameZh: '勇氣點',
    nameEn: 'Lot of Courage',
    // ASC + Fortune − Mars (Paulus)
    bodies: (_day, c, fortune) => ({
      a: fortune,
      b: lon(c, Planet.Mars),
      formulaLabel: 'ASC + 福運點 − ♂',
    }),
  },
  {
    nameZh: '勝利點',
    nameEn: 'Lot of Victory',
    // ASC + Jupiter − Fortune
    bodies: (_day, c, fortune) => ({
      a: lon(c, Planet.Jupiter),
      b: fortune,
      formulaLabel: 'ASC + ♃ − 福運點',
    }),
  },
  {
    nameZh: '復仇點',
    nameEn: 'Lot of Nemesis',
    // ASC + Fortune − Saturn
    bodies: (_day, c, fortune) => ({
      a: fortune,
      b: lon(c, Planet.Saturn),
      formulaLabel: 'ASC + 福運點 − ♄',
    }),
  },
  {
    nameZh: '婚姻點（男）',
    nameEn: 'Lot of Marriage (male)',
    // Day: ASC + Venus − Saturn; Night: ASC + Saturn − Venus
    bodies: (day, c) => day
      ? { a: lon(c, Planet.Venus), b: lon(c, Planet.Saturn), formulaLabel: 'ASC + ♀ − ♄ (日間)' }
      : { a: lon(c, Planet.Saturn), b: lon(c, Planet.Venus), formulaLabel: 'ASC + ♄ − ♀ (夜間)' },
  },
  {
    nameZh: '婚姻點（女）',
    nameEn: 'Lot of Marriage (female)',
    // Opposite of male
    bodies: (day, c) => day
      ? { a: lon(c, Planet.Saturn), b: lon(c, Planet.Venus), formulaLabel: 'ASC + ♄ − ♀ (日間)' }
      : { a: lon(c, Planet.Venus), b: lon(c, Planet.Saturn), formulaLabel: 'ASC + ♀ − ♄ (夜間)' },
  },
  {
    nameZh: '父親點',
    nameEn: 'Lot of Father',
    // Day: ASC + Saturn − Sun; Night: ASC + Sun − Saturn
    bodies: (day, c) => day
      ? { a: lon(c, Planet.Saturn), b: lon(c, Planet.Sun), formulaLabel: 'ASC + ♄ − ☉ (日間)' }
      : { a: lon(c, Planet.Sun), b: lon(c, Planet.Saturn), formulaLabel: 'ASC + ☉ − ♄ (夜間)' },
  },
  {
    nameZh: '母親點',
    nameEn: 'Lot of Mother',
    // ASC + Moon − Venus (no reversal)
    bodies: (_day, c) => ({
      a: lon(c, Planet.Moon),
      b: lon(c, Planet.Venus),
      formulaLabel: 'ASC + ☽ − ♀',
    }),
  },
  {
    nameZh: '事業點',
    nameEn: 'Lot of Vocation',
    // Day: ASC + Mercury − Sun; Night: ASC + Moon − Mercury (Vettius Valens)
    bodies: (day, c) => day
      ? { a: lon(c, Planet.Mercury), b: lon(c, Planet.Sun), formulaLabel: 'ASC + ☿ − ☉ (日間)' }
      : { a: lon(c, Planet.Moon), b: lon(c, Planet.Mercury), formulaLabel: 'ASC + ☽ − ☿ (夜間)' },
  },
];

/**
 * Calculate all 12 classic Arabic lots for a natal chart.
 *
 * @param chart - Fully calculated natal chart (planets + houses + ASC required)
 */
export function calculateArabicParts(chart: NatalChart): ArabicLot[] {
  const sunPos = chart.planets.find((p) => p.planet === Planet.Sun);
  if (!sunPos) throw new Error('Sun missing from chart');

  // Day chart: Sun in houses 7–12 (above the horizon)
  const isDayChart = sunPos.house >= 7;

  const asc = chart.ascendant;

  // Calculate Fortune first so other lots can reference it
  const fortuneDef = LOT_DEFS[0]; // Lot of Fortune is always first
  const fortuneBodies = fortuneDef.bodies(isDayChart, chart, 0);
  const fortuneLon = lot(asc, fortuneBodies.a, fortuneBodies.b);

  return LOT_DEFS.map((def) => {
    const bodies = def.bodies(isDayChart, chart, fortuneLon);
    const longitude = lot(asc, bodies.a, bodies.b);
    const { sign, degree, minute } = toSignDegMin(longitude);
    const house = houseForLongitude(longitude, chart.houses);

    return {
      nameZh: def.nameZh,
      nameEn: def.nameEn,
      formula: bodies.formulaLabel,
      longitude,
      sign,
      degree,
      minute,
      house,
    } satisfies ArabicLot;
  });
}
