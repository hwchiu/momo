/**
 * Astrology calculation engine using the `astronomia` library.
 *
 * Calculates planetary positions, house cusps (Placidus), and aspects
 * for a given birth date/time/location to produce a natal chart.
 */

// @ts-expect-error astronomia has no type declarations
import * as julian from 'astronomia/julian';
// @ts-expect-error astronomia has no type declarations
import * as solar from 'astronomia/solar';
// @ts-expect-error astronomia has no type declarations
import * as moonposition from 'astronomia/moonposition';
// @ts-expect-error astronomia has no type declarations
import * as sidereal from 'astronomia/sidereal';
// @ts-expect-error astronomia has no type declarations
import * as nutation from 'astronomia/nutation';
// @ts-expect-error astronomia has no type declarations
import * as planetposition from 'astronomia/planetposition';
// @ts-expect-error astronomia has no type declarations
import * as pluto from 'astronomia/pluto';
// @ts-expect-error astronomia has no type declarations
import * as base from 'astronomia/base';
// @ts-expect-error astronomia has no type declarations
import data from 'astronomia/data';

import {
  type BirthData,
  type NatalChart,
  type PlanetPosition,
  type HouseCusp,
  type Aspect,
  Planet,
  ZodiacSign,
  AspectType,
  HouseSystem,
  DEFAULT_ORB_CONFIG,
} from '../types/astro';
import type { OrbConfig } from '../types/astro';

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

/** Create VSOP87 planet objects for each planet */
function createPlanetObjects() {
  return {
    earth: new planetposition.Planet(data.earth),
    mercury: new planetposition.Planet(data.mercury),
    venus: new planetposition.Planet(data.venus),
    mars: new planetposition.Planet(data.mars),
    jupiter: new planetposition.Planet(data.jupiter),
    saturn: new planetposition.Planet(data.saturn),
    uranus: new planetposition.Planet(data.uranus),
    neptune: new planetposition.Planet(data.neptune),
  };
}

let _planets: ReturnType<typeof createPlanetObjects> | null = null;
function getPlanets() {
  if (!_planets) _planets = createPlanetObjects();
  return _planets;
}

/**
 * Convert a birth date/time to Julian Ephemeris Day (JDE).
 * The input is treated as UTC.
 */
export function birthDataToJDE(bd: BirthData): number {
  const fractionalDay = bd.day + (bd.hour + bd.minute / 60) / 24;
  const cal = new julian.CalendarGregorian(bd.year, bd.month, fractionalDay);
  return cal.toJDE();
}

/**
 * Normalize an angle to [0, 360) degrees.
 */
function normalizeDeg(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/**
 * Get the zodiac sign from ecliptic longitude in degrees.
 */
function signFromLongitude(lon: number): ZodiacSign {
  return Math.floor(normalizeDeg(lon) / 30) as ZodiacSign;
}

/**
 * Get degree and minute within a zodiac sign.
 */
function degreeInSign(lon: number): { degree: number; minute: number } {
  const withinSign = normalizeDeg(lon) % 30;
  const degree = Math.floor(withinSign);
  const minute = Math.floor((withinSign - degree) * 60);
  return { degree, minute };
}

/**
 * Calculate the geocentric ecliptic longitude of the Sun.
 * @internal Exported for solar-return calculation; prefer calculateNatalChart for full charts.
 */
export function sunLongitudeAtJDE(jde: number): number {
  return getSunLongitude(jde);
}

/**
 * Assign a house number (1–12) to an arbitrary ecliptic longitude.
 * @internal Exported for Arabic-parts house assignment.
 */
export function houseForLongitude(lon: number, houses: import('../types/astro').HouseCusp[]): number {
  return getHouseForPlanet(lon, houses);
}

/**
 * Calculate the geocentric ecliptic longitude of the Sun.
 */
function getSunLongitude(jde: number): number {
  const T = base.J2000Century(jde);
  const sunPos = solar.apparentLongitude(T);
  return normalizeDeg(sunPos * DEG);
}

/**
 * Calculate the geocentric ecliptic longitude of the Moon.
 */
function getMoonLongitude(jde: number): number {
  const pos = moonposition.position(jde);
  return normalizeDeg(pos.lon * DEG);
}

/**
 * Calculate the geocentric ecliptic longitude of a planet (Mercury through Neptune)
 * as seen from Earth.
 */
function getPlanetLongitude(
  planetName: string,
  jde: number,
): number {
  const planets = getPlanets();
  const earth = planets.earth;
  const planetObj = planets[planetName as keyof typeof planets];
  if (!planetObj || planetName === 'earth') {
    throw new Error(`Unknown planet: ${planetName}`);
  }

  // Get heliocentric positions
  const earthPos = earth.position2000(jde);
  const planetPos = planetObj.position2000(jde);

  // Convert heliocentric to geocentric ecliptic longitude
  const earthX = earthPos.range * Math.cos(earthPos.lat) * Math.cos(earthPos.lon);
  const earthY = earthPos.range * Math.cos(earthPos.lat) * Math.sin(earthPos.lon);
  const planetX = planetPos.range * Math.cos(planetPos.lat) * Math.cos(planetPos.lon);
  const planetY = planetPos.range * Math.cos(planetPos.lat) * Math.sin(planetPos.lon);

  // Geocentric rectangular coordinates
  const dx = planetX - earthX;
  const dy = planetY - earthY;
  // const dz = planetZ - earthZ; // unused — only need longitude

  // Geocentric ecliptic longitude
  const lon = Math.atan2(dy, dx);
  return normalizeDeg(lon * DEG);
}

/**
 * Calculate the ecliptic longitude of Pluto (special case — not in VSOP87).
 */
function getPlutoLongitude(jde: number): number {
  const pos = pluto.heliocentric(jde);
  const planets = getPlanets();
  const earthPos = planets.earth.position2000(jde);

  const earthX = earthPos.range * Math.cos(earthPos.lat) * Math.cos(earthPos.lon);
  const earthY = earthPos.range * Math.cos(earthPos.lat) * Math.sin(earthPos.lon);

  const plutoX = pos.range * Math.cos(pos.lat) * Math.cos(pos.lon);
  const plutoY = pos.range * Math.cos(pos.lat) * Math.sin(pos.lon);

  const dx = plutoX - earthX;
  const dy = plutoY - earthY;

  return normalizeDeg(Math.atan2(dy, dx) * DEG);
}

// Retrograde detection is done inline in calculatePlanetPositions
// by comparing positions at jde-1 and jde+1.

/**
 * Calculate the Ascendant (rising sign) longitude.
 *
 * Based on the formula:
 *   ASC = atan2(-cos(RAMC), sin(ε) * tan(φ) + cos(ε) * sin(RAMC))
 * where RAMC = local sidereal time in degrees, ε = obliquity, φ = latitude.
 *
 * atan2 has two solutions 180° apart (ASC and DSC). We apply a quadrant
 * correction using the pre-computed midheaven: the ASC must satisfy
 * (ASC - MC) mod 360 ∈ [0°, 180°]. If the raw result falls outside that
 * range it is the DSC, so we add 180° to get the true ASC.
 */
function calculateAscendant(jde: number, latitude: number, longitude: number, midheaven: number): number {
  // Get Greenwich mean sidereal time in seconds
  const gmst = sidereal.mean(jde);
  // Convert to degrees and add longitude to get local sidereal time
  const lst = normalizeDeg((gmst / 240) + longitude); // 240 = seconds per degree (86400/360)
  const ramc = lst * RAD;

  // Obliquity of the ecliptic
  const ε = nutation.meanObliquity(jde);
  const φ = latitude * RAD;

  const asc = Math.atan2(
    -Math.cos(ramc),
    Math.sin(ε) * Math.tan(φ) + Math.cos(ε) * Math.sin(ramc),
  );

  const ascDeg = normalizeDeg(asc * DEG);

  // Quadrant correction: ASC must be in the eastern hemisphere of the chart,
  // i.e. (ASC - MC) mod 360 must lie in [0°, 180°].
  // If it falls in (180°, 360°) we have picked the DSC — shift by 180°.
  const arcFromMC = ((ascDeg - midheaven) % 360 + 360) % 360;
  return arcFromMC <= 180 ? ascDeg : normalizeDeg(ascDeg + 180);
}

/**
 * Calculate the Midheaven (MC) longitude.
 *
 * MC = atan2(sin(RAMC), cos(ε) * cos(RAMC))
 * Simplified: MC = atan(tan(RAMC) / cos(ε))
 */
function calculateMidheaven(jde: number, longitude: number): number {
  const gmst = sidereal.mean(jde);
  const lst = normalizeDeg((gmst / 240) + longitude);
  const ramc = lst * RAD;

  const ε = nutation.meanObliquity(jde);

  const mc = Math.atan2(Math.sin(ramc), Math.cos(ε) * Math.cos(ramc));

  return normalizeDeg(mc * DEG);
}

// ---- House system calculation helpers ----

/**
 * Project a right-ascension offset (RAMC + H) onto the ecliptic.
 *
 * The same atan2 formula used for the Ascendant is used for every
 * intermediate house cusp.  It has two solutions 180° apart; the
 * correct one for houses in the upper hemisphere (H10→H4 arc going
 * counter-clockwise, i.e. H11, H12, H1, H2, H3) must satisfy
 * (cusp − MC) mod 360 ∈ [0°, 180°).
 */
function projectToEcliptic(
  ramcOffset: number,
  obliquity: number,
  latitude: number,
  mc: number,
): number {
  const φ = latitude * RAD;
  const raw = Math.atan2(
    -Math.cos(ramcOffset),
    Math.sin(obliquity) * Math.tan(φ) + Math.cos(obliquity) * Math.sin(ramcOffset),
  );
  const lonDeg = normalizeDeg(raw * DEG);
  // Quadrant check: upper-hemisphere cusps must lie in arc [MC, MC+180°)
  const arcFromMC = ((lonDeg - mc) % 360 + 360) % 360;
  return arcFromMC < 180 ? lonDeg : normalizeDeg(lonDeg + 180);
}

/**
 * Common astronomical parameters needed by most house systems.
 */
interface HouseCalcParams {
  ascendant: number;
  midheaven: number;
  jde: number;
  latitude: number;
  longitude: number;
  /** Obliquity of the ecliptic (radians) */
  obliquity: number;
  /** Local sidereal time (radians) — RAMC */
  ramc: number;
}

/**
 * Build common parameters from raw inputs (avoids repeating this in every function).
 */
function buildHouseCalcParams(
  ascendant: number,
  midheaven: number,
  jde: number,
  latitude: number,
  longitude: number,
): HouseCalcParams {
  const obliquity = nutation.meanObliquity(jde);
  const gmst = sidereal.mean(jde);
  const lst = normalizeDeg((gmst / 240) + longitude);
  const ramc = lst * RAD;
  return { ascendant, midheaven, jde, latitude, longitude, obliquity, ramc };
}

/**
 * Convert an array of 12 cusp longitudes into HouseCusp objects.
 */
function cuspsToHouseArray(cusps: number[]): HouseCusp[] {
  return cusps.map((lon, i) => {
    const normalized = normalizeDeg(lon);
    const sign = signFromLongitude(normalized);
    const { degree } = degreeInSign(normalized);
    return { house: i + 1, longitude: normalized, sign, degree };
  });
}

// ---- Individual house system implementations ----

/**
 * Whole Sign Houses: each zodiac sign is one house.
 * House 1 starts at 0° of the sign containing the Ascendant.
 */
function calculateWholeSignHouses(ascendant: number): HouseCusp[] {
  const firstSignStart = Math.floor(ascendant / 30) * 30;
  const cusps: number[] = [];
  for (let i = 0; i < 12; i++) {
    cusps.push(normalizeDeg(firstSignStart + i * 30));
  }
  return cuspsToHouseArray(cusps);
}

/**
 * Equal House: House 1 cusp = Ascendant, each subsequent house +30°.
 */
function calculateEqualHouses(ascendant: number): HouseCusp[] {
  const cusps: number[] = [];
  for (let i = 0; i < 12; i++) {
    cusps.push(normalizeDeg(ascendant + i * 30));
  }
  return cuspsToHouseArray(cusps);
}

/**
 * Porphyry: trisect the MC→ASC arc and the ASC→IC arc.
 *
 * The quadrants between the four angles (MC, ASC, IC, DSC) are each
 * divided into three equal parts.
 */
function calculatePorphyryHouses(ascendant: number, midheaven: number): HouseCusp[] {
  const cusps: number[] = new Array(12);
  cusps[0] = ascendant;            // House 1 = ASC
  cusps[3] = normalizeDeg(midheaven + 180); // House 4 = IC
  cusps[6] = normalizeDeg(ascendant + 180); // House 7 = DSC
  cusps[9] = midheaven;            // House 10 = MC

  // Quadrant 1: MC → ASC (houses 10, 11, 12, 1)
  let arc = normalizeDeg(ascendant - midheaven);
  cusps[10] = normalizeDeg(midheaven + arc / 3);
  cusps[11] = normalizeDeg(midheaven + (2 * arc) / 3);

  // Quadrant 2: ASC → IC (houses 1, 2, 3, 4)
  arc = normalizeDeg(cusps[3] - ascendant);
  cusps[1] = normalizeDeg(ascendant + arc / 3);
  cusps[2] = normalizeDeg(ascendant + (2 * arc) / 3);

  // Opposite houses
  cusps[4] = normalizeDeg(cusps[10] + 180);
  cusps[5] = normalizeDeg(cusps[11] + 180);
  cusps[7] = normalizeDeg(cusps[1] + 180);
  cusps[8] = normalizeDeg(cusps[2] + 180);

  return cuspsToHouseArray(cusps);
}

/**
 * Alcabitius: trisect the diurnal semi-arc of the Ascendant in right ascension,
 * then convert each RA trisection point back to ecliptic longitude.
 *
 * DSA = RA(ASC) − RAMC (equatorial arc from meridian to rising point).
 * Houses 11, 12 are at RAMC + DSA/3 and RAMC + 2·DSA/3 in RA.
 * Houses 2, 3 are at RAMC + DSA + NSA/3 and RAMC + DSA + 2·NSA/3 in RA.
 * Each RA target converts to ecliptic via: λ = atan2(sin(RA), cos(ε)·cos(RA)).
 */
function calculateAlcabitiusHouses(p: HouseCalcParams): HouseCusp[] {
  const cusps: number[] = new Array(12);
  cusps[0] = p.ascendant;
  cusps[6] = normalizeDeg(p.ascendant + 180);
  cusps[9] = p.midheaven;
  cusps[3] = normalizeDeg(p.midheaven + 180);

  // Right ascension of the ASC (pure ecliptic → equatorial, no latitude)
  const ascRad = p.ascendant * RAD;
  const raAscRad = Math.atan2(
    Math.sin(ascRad) * Math.cos(p.obliquity),
    Math.cos(ascRad),
  );

  // Diurnal semi-arc in equatorial degrees
  let dsaDeg = normalizeDeg(raAscRad * DEG - p.ramc * DEG);
  if (dsaDeg > 180) dsaDeg -= 360;
  const dsaRad = dsaDeg * RAD;
  const nsaRad = Math.PI - dsaRad;

  // Convert equatorial RA (radians) to ecliptic longitude (degrees)
  const raToEcl = (ra: number): number =>
    normalizeDeg(Math.atan2(Math.sin(ra), Math.cos(p.obliquity) * Math.cos(ra)) * DEG);

  // Houses 11, 12: trisect DSA from MC toward ASC
  for (let i = 1; i <= 2; i++) {
    cusps[9 + i] = raToEcl(p.ramc + (i * dsaRad) / 3);
  }

  // Houses 2, 3: trisect NSA from ASC toward IC
  for (let i = 1; i <= 2; i++) {
    cusps[i] = raToEcl(p.ramc + dsaRad + (i * nsaRad) / 3);
  }

  // Opposite houses
  cusps[4] = normalizeDeg(cusps[10] + 180);
  cusps[5] = normalizeDeg(cusps[11] + 180);
  cusps[7] = normalizeDeg(cusps[1] + 180);
  cusps[8] = normalizeDeg(cusps[2] + 180);

  return cuspsToHouseArray(cusps);
}

/**
 * Regiomontanus: divide the celestial equator into 30° segments starting
 * from RAMC, then project each division point to the ecliptic via the
 * meridian passing through it.
 *
 * Cusp formula:
 *   λ = atan2(-cos(RAMC + H), sin(ε) * tan(φ) + cos(ε) * sin(RAMC + H))
 * where H is the equatorial offset (30°, 60°, etc.)
 */
function calculateRegiomontanusHouses(p: HouseCalcParams): HouseCusp[] {
  const cusps: number[] = new Array(12);
  cusps[0] = p.ascendant;
  cusps[9] = p.midheaven;

  const φ = p.latitude * RAD;

  // Houses 11, 12, 2, 3 (skip ASC at 90° and IC at 270°)
  const offsets = [30, 60, 120, 150];
  const houseIndices = [10, 11, 1, 2];

  for (let k = 0; k < offsets.length; k++) {
    const H = offsets[k] * RAD;
    const ramcH = p.ramc + H;

    // Regiomontanus projection: pole of house is on the equator.
    // The tanDecl term adjusts the effective latitude for this house.
    const tanDecl = Math.tan(φ) * Math.cos(H);
    const raw = Math.atan2(
      -Math.cos(ramcH),
      Math.sin(p.obliquity) * tanDecl + Math.cos(p.obliquity) * Math.sin(ramcH),
    );
    const lonDeg = normalizeDeg(raw * DEG);
    const arcFromMC = ((lonDeg - p.midheaven) % 360 + 360) % 360;
    cusps[houseIndices[k]] = arcFromMC < 180 ? lonDeg : normalizeDeg(lonDeg + 180);
  }

  // Cardinal axes
  cusps[3] = normalizeDeg(p.midheaven + 180);
  cusps[6] = normalizeDeg(p.ascendant + 180);

  // Opposite houses
  cusps[4] = normalizeDeg(cusps[10] + 180);
  cusps[5] = normalizeDeg(cusps[11] + 180);
  cusps[7] = normalizeDeg(cusps[1] + 180);
  cusps[8] = normalizeDeg(cusps[2] + 180);

  return cuspsToHouseArray(cusps);
}

/**
 * Campanus: divide the prime vertical into 30° arcs, project each point
 * via great circles through the north and south points of the horizon
 * onto the ecliptic.
 *
 * The prime vertical passes through the zenith and the east/west points.
 * Formula:
 *   λ = atan2(
 *     sin(A) * cos(ε) - tan(φ) * sin(ε),
 *     cos(A)
 *   ) + RAMC_longitude
 * where A is the azimuthal offset on the prime vertical.
 */
function calculateCampanusHouses(p: HouseCalcParams): HouseCusp[] {
  const cusps: number[] = new Array(12);
  cusps[0] = p.ascendant;
  cusps[9] = p.midheaven;

  const φ = p.latitude * RAD;

  // Offsets on the prime vertical for cusps 11, 12, 2, 3
  const offsets = [30, 60, 120, 150];
  const houseIndices = [10, 11, 1, 2];

  for (let k = 0; k < offsets.length; k++) {
    const A = offsets[k] * RAD;
    // Campanus: azimuthal projection from prime vertical to ecliptic
    const num = Math.cos(A);
    const denom =
      Math.sin(A) * Math.cos(p.obliquity) + Math.tan(φ) * Math.sin(p.obliquity);

    const raHouse = p.ramc + Math.atan2(num, denom);
    cusps[houseIndices[k]] = projectToEcliptic(raHouse, p.obliquity, p.latitude, p.midheaven);
  }

  cusps[3] = normalizeDeg(p.midheaven + 180);
  cusps[6] = normalizeDeg(p.ascendant + 180);
  cusps[4] = normalizeDeg(cusps[10] + 180);
  cusps[5] = normalizeDeg(cusps[11] + 180);
  cusps[7] = normalizeDeg(cusps[1] + 180);
  cusps[8] = normalizeDeg(cusps[2] + 180);

  return cuspsToHouseArray(cusps);
}

/**
 * Koch: divide the time it takes for the MC degree to rise from the horizon
 * to the meridian into three equal parts.
 *
 * Koch calculates by finding the ecliptic longitude that reaches
 * the same altitude as MC at 1/3 and 2/3 of the MC's semi-arc.
 */
function calculateKochHouses(p: HouseCalcParams): HouseCusp[] {
  const cusps: number[] = new Array(12);
  cusps[0] = p.ascendant;
  cusps[9] = p.midheaven;

  const φ = p.latitude * RAD;

  // Declination of MC
  const mcRad = p.midheaven * RAD;
  const sinDecMC = Math.sin(p.obliquity) * Math.sin(mcRad);
  const decMC = Math.asin(sinDecMC);

  // Semi-arc of MC: how long it takes MC to go from horizon to meridian
  const cosH0 = -(Math.tan(φ) * Math.tan(decMC));
  // Clamp for extreme latitudes
  const samc = Math.abs(cosH0) < 1 ? Math.acos(cosH0) : (cosH0 < 0 ? Math.PI : 0);

  // Trisect the MC semi-arc for houses 11, 12
  for (let i = 1; i <= 2; i++) {
    const fraction = i / 3;
    const ramcOffset = p.ramc + fraction * samc;
    cusps[9 + i] = projectToEcliptic(ramcOffset, p.obliquity, p.latitude, p.midheaven);
  }

  // Houses 2, 3: trisect the nocturnal semi-arc of the MC
  const nsamc = Math.PI - samc;
  for (let i = 1; i <= 2; i++) {
    const fraction = i / 3;
    const ramcOffset = p.ramc + samc + fraction * nsamc;
    cusps[i] = projectToEcliptic(ramcOffset, p.obliquity, p.latitude, p.midheaven);
  }

  cusps[3] = normalizeDeg(p.midheaven + 180);
  cusps[6] = normalizeDeg(p.ascendant + 180);
  cusps[4] = normalizeDeg(cusps[10] + 180);
  cusps[5] = normalizeDeg(cusps[11] + 180);
  cusps[7] = normalizeDeg(cusps[1] + 180);
  cusps[8] = normalizeDeg(cusps[2] + 180);

  return cuspsToHouseArray(cusps);
}

/**
 * Placidus: trisect the diurnal and nocturnal semi-arcs in time.
 *
 * Uses RAMC offsets as an approximation of the Placidus semi-arc
 * trisection that works well for most latitudes.
 */
function calculatePlacidusHouses(p: HouseCalcParams): HouseCusp[] {
  const cusps: number[] = new Array(12);
  cusps[0] = p.ascendant;
  cusps[9] = p.midheaven;
  cusps[3] = normalizeDeg(p.midheaven + 180);
  cusps[6] = normalizeDeg(p.ascendant + 180);

  // Houses 11, 12 (between MC and ASC)
  for (let i = 0; i < 2; i++) {
    const offset = (i + 1) * 30;
    const ramcH = p.ramc + offset * RAD;
    cusps[10 + i] = projectToEcliptic(ramcH, p.obliquity, p.latitude, p.midheaven);
  }

  // Houses 2, 3 (between ASC and IC)
  for (let i = 0; i < 2; i++) {
    const offset = (i + 4) * 30;
    const ramcH = p.ramc + offset * RAD;
    cusps[1 + i] = projectToEcliptic(ramcH, p.obliquity, p.latitude, p.midheaven);
  }

  cusps[4] = normalizeDeg(cusps[10] + 180);
  cusps[5] = normalizeDeg(cusps[11] + 180);
  cusps[7] = normalizeDeg(cusps[1] + 180);
  cusps[8] = normalizeDeg(cusps[2] + 180);

  return cuspsToHouseArray(cusps);
}

/**
 * Dispatch function: calculate house cusps using the specified system.
 */
function calculateHouses(
  system: HouseSystem,
  ascendant: number,
  midheaven: number,
  jde: number,
  latitude: number,
  longitude: number,
): HouseCusp[] {
  switch (system) {
    case HouseSystem.WholeSign:
      return calculateWholeSignHouses(ascendant);
    case HouseSystem.EqualHouse:
      return calculateEqualHouses(ascendant);
    case HouseSystem.Porphyry:
      return calculatePorphyryHouses(ascendant, midheaven);
    case HouseSystem.Alcabitius:
      return calculateAlcabitiusHouses(
        buildHouseCalcParams(ascendant, midheaven, jde, latitude, longitude),
      );
    case HouseSystem.Regiomontanus:
      return calculateRegiomontanusHouses(
        buildHouseCalcParams(ascendant, midheaven, jde, latitude, longitude),
      );
    case HouseSystem.Campanus:
      return calculateCampanusHouses(
        buildHouseCalcParams(ascendant, midheaven, jde, latitude, longitude),
      );
    case HouseSystem.Koch:
      return calculateKochHouses(
        buildHouseCalcParams(ascendant, midheaven, jde, latitude, longitude),
      );
    case HouseSystem.Placidus:
    default:
      return calculatePlacidusHouses(
        buildHouseCalcParams(ascendant, midheaven, jde, latitude, longitude),
      );
  }
}

/**
 * Determine which house a planet falls in, given the house cusps.
 */
function getHouseForPlanet(planetLon: number, houses: HouseCusp[]): number {
  for (let i = 0; i < 12; i++) {
    const start = houses[i].longitude;
    const end = houses[(i + 1) % 12].longitude;

    let inHouse: boolean;
    if (start < end) {
      inHouse = planetLon >= start && planetLon < end;
    } else {
      // House spans 0° Aries
      inHouse = planetLon >= start || planetLon < end;
    }

    if (inHouse) return i + 1;
  }
  return 1; // fallback
}

/**
 * Calculate all planet positions for the given JDE.
 */
function calculatePlanetPositions(jde: number, houses: HouseCusp[]): PlanetPosition[] {
  const positions: PlanetPosition[] = [];

  const planetCalculators: Array<{
    planet: Planet;
    getLon: (j: number) => number;
    canRetrograde: boolean;
  }> = [
    { planet: Planet.Sun, getLon: getSunLongitude, canRetrograde: false },
    { planet: Planet.Moon, getLon: getMoonLongitude, canRetrograde: false },
    {
      planet: Planet.Mercury,
      getLon: (j) => getPlanetLongitude('mercury', j),
      canRetrograde: true,
    },
    {
      planet: Planet.Venus,
      getLon: (j) => getPlanetLongitude('venus', j),
      canRetrograde: true,
    },
    {
      planet: Planet.Mars,
      getLon: (j) => getPlanetLongitude('mars', j),
      canRetrograde: true,
    },
    {
      planet: Planet.Jupiter,
      getLon: (j) => getPlanetLongitude('jupiter', j),
      canRetrograde: true,
    },
    {
      planet: Planet.Saturn,
      getLon: (j) => getPlanetLongitude('saturn', j),
      canRetrograde: true,
    },
    {
      planet: Planet.Uranus,
      getLon: (j) => getPlanetLongitude('uranus', j),
      canRetrograde: true,
    },
    {
      planet: Planet.Neptune,
      getLon: (j) => getPlanetLongitude('neptune', j),
      canRetrograde: true,
    },
    { planet: Planet.Pluto, getLon: getPlutoLongitude, canRetrograde: true },
  ];

  for (const calc of planetCalculators) {
    const lon = calc.getLon(jde);

    let retrograde = false;
    if (calc.canRetrograde) {
      const step = 1;
      const lonBefore = calc.getLon(jde - step);
      const lonAfter = calc.getLon(jde + step);
      let diff = lonAfter - lonBefore;
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;
      retrograde = diff < 0;
    }

    const sign = signFromLongitude(lon);
    const { degree, minute } = degreeInSign(lon);
    const house = getHouseForPlanet(lon, houses);

    positions.push({
      planet: calc.planet,
      longitude: lon,
      sign,
      degree,
      minute,
      house,
      retrograde,
    });
  }

  return positions;
}

/**
 * Calculate aspects between all pairs of planets.
 */
function calculateAspects(planets: PlanetPosition[], orbConfig: OrbConfig = DEFAULT_ORB_CONFIG): Aspect[] {
  const aspects: Aspect[] = [];
  const aspectTypes = [
    AspectType.Conjunction,
    AspectType.Sextile,
    AspectType.Square,
    AspectType.Trine,
    AspectType.Opposition,
  ];

  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      let angle = Math.abs(planets[i].longitude - planets[j].longitude);
      if (angle > 180) angle = 360 - angle;

      for (const type of aspectTypes) {
        const exactAngle = type as number;
        const orb = Math.abs(angle - exactAngle);
        // Classical moiety: max orb = (planet1 moiety + planet2 moiety) / 2
        const maxOrb = (orbConfig[planets[i].planet] + orbConfig[planets[j].planet]) / 2;

        if (orb <= maxOrb) {
          aspects.push({
            planet1: planets[i].planet,
            planet2: planets[j].planet,
            type,
            angle,
            orb: Math.round(orb * 100) / 100,
          });
          break; // Only one aspect per pair
        }
      }
    }
  }

  return aspects;
}

/**
 * Main entry point: calculate a complete natal chart from birth data.
 *
 * @param birthData - User-provided birth date, time, and location
 * @param houseSystem - House system to use (defaults to Placidus)
 */
export function calculateNatalChart(
  birthData: BirthData,
  houseSystem: HouseSystem = HouseSystem.Placidus,
  orbConfig: OrbConfig = DEFAULT_ORB_CONFIG,
): NatalChart {
  const jde = birthDataToJDE(birthData);

  const midheaven = calculateMidheaven(jde, birthData.longitude);
  const ascendant = calculateAscendant(jde, birthData.latitude, birthData.longitude, midheaven);

  const houses = calculateHouses(
    houseSystem,
    ascendant,
    midheaven,
    jde,
    birthData.latitude,
    birthData.longitude,
  );

  const planets = calculatePlanetPositions(jde, houses);
  const aspects = calculateAspects(planets, orbConfig);

  return {
    birthData,
    planets,
    houses,
    aspects,
    ascendant,
    midheaven,
    houseSystem,
  };
}
