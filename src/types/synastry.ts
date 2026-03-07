import type { Planet, AspectType, ZodiacSign, NatalChart, BirthData, HouseSystem } from './astro';

/** A cross-chart aspect between Person A and Person B */
export interface SynastryAspect {
  planetA: Planet;
  planetB: Planet;
  type: AspectType;
  /** Exact angular distance between the two planets */
  angle: number;
  /** Difference from the exact aspect angle */
  orb: number;
  nature: 'harmonious' | 'challenging' | 'neutral';
  interpretation: string;
}

/** A planet position in the composite chart (midpoint method) */
export interface CompositePosition {
  planet: Planet;
  longitude: number;
  sign: ZodiacSign;
  degree: number;
  minute: number;
}

/** Per-category compatibility scores and descriptions */
export interface CompatibilityScore {
  overall: number;        // 0–100
  emotional: number;      // 情感連結
  communication: number;  // 溝通默契
  attraction: number;     // 吸引力
  stability: number;      // 長期穩定性
  overallLabel: string;
  overallDesc: string;
  emotionalDesc: string;
  communicationDesc: string;
  attractionDesc: string;
  stabilityDesc: string;
}

/** Complete synastry analysis result */
export interface SynastryResult {
  nameA: string;
  nameB: string;
  chartA: NatalChart;
  chartB: NatalChart;
  aspects: SynastryAspect[];
  compositePlanets: CompositePosition[];
  compositeAscendant: number;
  compositeMidheaven: number;
  score: CompatibilityScore;
}

/** Input for computing a synastry analysis */
export interface SynastryInput {
  nameA: string;
  birthDataA: BirthData;
  houseSystemA: HouseSystem;
  nameB: string;
  birthDataB: BirthData;
  houseSystemB: HouseSystem;
}
