/**
 * 互融與接納系統核心計算邏輯
 * Reception Calculation Engine
 *
 * 古典占星中，互融是判斷相位能否被執行的關鍵。
 * 被良好接納的行星能夠更有效地表達其能量。
 */

import { Planet, ZodiacSign, AspectType } from '../types/astro';
import type { NatalChart, Aspect } from '../types/astro';
import type {
  Reception,
  MutualReception,
  ReceptionMatrix,
  AspectEnhancement,
  DifficultyAnalysis,
  PlanetaryDignity,
} from '../types/reception';
import { ReceptionLevel } from '../types/reception';

/**
 * 行星尊嚴規則（現代占星派）
 * 基於傳統古典占星的規則
 */
const PLANETARY_DIGNITIES: Record<Planet, PlanetaryDignity> = {
  [Planet.Sun]: {
    planet: Planet.Sun,
    domicile: [ZodiacSign.Leo],
    exaltation: [ZodiacSign.Aries],
    detriment: [ZodiacSign.Aquarius],
    fall: [ZodiacSign.Libra],
    triplicity: { day: Planet.Sun, night: Planet.Jupiter, shared: Planet.Sun },
    terms: [],
    face: [],
  },
  [Planet.Moon]: {
    planet: Planet.Moon,
    domicile: [ZodiacSign.Cancer],
    exaltation: [ZodiacSign.Taurus],
    detriment: [ZodiacSign.Capricorn],
    fall: [],
    triplicity: { day: Planet.Venus, night: Planet.Venus, shared: Planet.Mercury },
    terms: [],
    face: [],
  },
  [Planet.Mercury]: {
    planet: Planet.Mercury,
    domicile: [ZodiacSign.Gemini, ZodiacSign.Virgo],
    exaltation: [ZodiacSign.Virgo],
    detriment: [ZodiacSign.Sagittarius, ZodiacSign.Pisces],
    fall: [ZodiacSign.Pisces],
    triplicity: { day: Planet.Saturn, night: Planet.Mercury, shared: Planet.Venus },
    terms: [],
    face: [],
  },
  [Planet.Venus]: {
    planet: Planet.Venus,
    domicile: [ZodiacSign.Taurus, ZodiacSign.Libra],
    exaltation: [ZodiacSign.Pisces],
    detriment: [ZodiacSign.Aries, ZodiacSign.Scorpio],
    fall: [ZodiacSign.Virgo],
    triplicity: { day: Planet.Venus, night: Planet.Venus, shared: Planet.Mercury },
    terms: [],
    face: [],
  },
  [Planet.Mars]: {
    planet: Planet.Mars,
    domicile: [ZodiacSign.Aries, ZodiacSign.Scorpio],
    exaltation: [ZodiacSign.Capricorn],
    detriment: [ZodiacSign.Libra, ZodiacSign.Taurus],
    fall: [ZodiacSign.Cancer],
    triplicity: { day: Planet.Mars, night: Planet.Venus, shared: Planet.Mercury },
    terms: [],
    face: [],
  },
  [Planet.Jupiter]: {
    planet: Planet.Jupiter,
    domicile: [ZodiacSign.Sagittarius, ZodiacSign.Pisces],
    exaltation: [ZodiacSign.Cancer],
    detriment: [ZodiacSign.Gemini, ZodiacSign.Virgo],
    fall: [ZodiacSign.Capricorn],
    triplicity: { day: Planet.Jupiter, night: Planet.Mars, shared: Planet.Sun },
    terms: [],
    face: [],
  },
  [Planet.Saturn]: {
    planet: Planet.Saturn,
    domicile: [ZodiacSign.Capricorn, ZodiacSign.Aquarius],
    exaltation: [ZodiacSign.Libra],
    detriment: [ZodiacSign.Cancer, ZodiacSign.Leo],
    fall: [ZodiacSign.Aries],
    triplicity: { day: Planet.Saturn, night: Planet.Mercury, shared: Planet.Venus },
    terms: [],
    face: [],
  },
  [Planet.Uranus]: {
    planet: Planet.Uranus,
    domicile: [ZodiacSign.Aquarius],
    exaltation: [ZodiacSign.Scorpio],
    detriment: [ZodiacSign.Leo],
    fall: [ZodiacSign.Taurus],
    triplicity: { day: Planet.Saturn, night: Planet.Saturn, shared: Planet.Saturn },
    terms: [],
    face: [],
  },
  [Planet.Neptune]: {
    planet: Planet.Neptune,
    domicile: [ZodiacSign.Pisces],
    exaltation: [ZodiacSign.Cancer],
    detriment: [ZodiacSign.Virgo],
    fall: [ZodiacSign.Capricorn],
    triplicity: { day: Planet.Venus, night: Planet.Venus, shared: Planet.Mercury },
    terms: [],
    face: [],
  },
  [Planet.Pluto]: {
    planet: Planet.Pluto,
    domicile: [ZodiacSign.Scorpio],
    exaltation: [ZodiacSign.Aries],
    detriment: [ZodiacSign.Taurus],
    fall: [ZodiacSign.Libra],
    triplicity: { day: Planet.Mars, night: Planet.Mars, shared: Planet.Venus },
    terms: [],
    face: [],
  },
} as const satisfies Record<Planet, PlanetaryDignity>;

/**
 * 計算行星位置對應的星座
 */
function getLongitudeZodiacSign(longitude: number): ZodiacSign {
  const signs = [
    ZodiacSign.Aries,
    ZodiacSign.Taurus,
    ZodiacSign.Gemini,
    ZodiacSign.Cancer,
    ZodiacSign.Leo,
    ZodiacSign.Virgo,
    ZodiacSign.Libra,
    ZodiacSign.Scorpio,
    ZodiacSign.Sagittarius,
    ZodiacSign.Capricorn,
    ZodiacSign.Aquarius,
    ZodiacSign.Pisces,
  ];
  const normalized = longitude % 360;
  const signIndex = Math.floor(normalized / 30);
  return signs[signIndex];
}

/**
 * 檢查行星 A 是否在行星 B 的尊嚴中
 * 返回互融等級，如果沒有互融則返回 'none'
 */
function checkReceptionLevel(
  planetA: Planet,
  lonA: number,
  planetB: Planet,
  isDaytime: boolean,
): ReceptionLevel {
  const signOfA = getLongitudeZodiacSign(lonA);
  const dignities = PLANETARY_DIGNITIES[planetB];

  if (!dignities) return ReceptionLevel.None;

  // 1. 檢查守護星座（最高優先級）
  if (dignities.domicile.includes(signOfA)) {
    return ReceptionLevel.Domicile;
  }

  // 2. 檢查貴客星座
  if (dignities.exaltation.includes(signOfA)) {
    return ReceptionLevel.Exaltation;
  }

  // 3. 檢查三分群
  // 簡化版：根據星座元素判斷
  const triplicityRuler =
    dignities.triplicity[isDaytime ? 'day' : 'night'] || dignities.triplicity['shared'];
  if (triplicityRuler === planetA) {
    return ReceptionLevel.Triplicity;
  }

  // 注：界（Terms）和面（Face）的完整實現需要詳細的度數規則
  // 這裡簡化為只支援前 3 級，可後續擴展

  return ReceptionLevel.None;
}

/**
 * 根據互融等級計算力量強度
 */
function getLevelStrength(level: ReceptionLevel): number {
  const strengths: Record<ReceptionLevel, number> = {
    [ReceptionLevel.Domicile]: 100,
    [ReceptionLevel.Exaltation]: 80,
    [ReceptionLevel.Triplicity]: 60,
    [ReceptionLevel.Terms]: 40,
    [ReceptionLevel.Face]: 20,
    [ReceptionLevel.None]: 0,
  };
  return strengths[level];
}

/**
 * 計算相位力量的增強係數
 * 基於互融等級計算
 */
function calculateReceptionEnhancement(level: ReceptionLevel, isRetrograde: boolean): number {
  let enhancement = 0;

  // 基礎增強係數
  switch (level) {
    case 'domicile':
      enhancement = 0.35; // +35%
      break;
    case 'exaltation':
      enhancement = 0.28; // +28%
      break;
    case 'triplicity':
      enhancement = 0.18; // +18%
      break;
    case 'terms':
      enhancement = 0.1; // +10%
      break;
    case 'face':
      enhancement = 0.05; // +5%
      break;
    default:
      enhancement = 0;
  }

  // 逆行行星衰減互融力量 -20~30%
  if (isRetrograde) {
    enhancement *= 0.75; // 衰減至 75%
  }

  return enhancement;
}

/**
 * 計算單個互融關係
 */
export function calculateSingleReception(
  planetA: Planet,
  lonA: number,
  _isRetrogradA: boolean,
  planetB: Planet,
  isDaytime: boolean,
): Reception | null {
  const level = checkReceptionLevel(planetA, lonA, planetB, isDaytime);

  if (level === ReceptionLevel.None) {
    return null;
  }

  const signOfA = getLongitudeZodiacSign(lonA);
  const strength = getLevelStrength(level);
  // TODO: enhancement 將在 calculateAspectEnhancement 中使用

  return {
    planet: planetA,
    dispositor: planetB,
    level,
    zodiacSign: signOfA,
    strength,
  };
}

/**
 * 計算完整的互融矩陣
 */
export function calculateReceptionMatrix(chart: NatalChart): ReceptionMatrix {
  const receptions = new Map<string, Reception>();
  const mutualReceptions: MutualReception[] = [];
  const dispositorMap = new Map<Planet, Planet[]>();
  const receivedByMap = new Map<Planet, Reception[]>();

  const planets: Planet[] = [
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

  // 計算所有行星間的互融關係
  for (const planetA of planets) {
    const posA = chart.planets.find((p) => p.planet === planetA);
    if (!posA) continue;

    for (const planetB of planets) {
      if (planetA === planetB) continue;

      const reception = calculateSingleReception(
        planetA,
        posA.longitude,
        posA.retrograde,
        planetB,
        true, // isDaytime 簡化，待後續基於太陽計算
      );

      if (reception) {
        const key = `${planetA}->${planetB}`;
        receptions.set(key, reception);

        // 構建 dispositor 映射
        if (!dispositorMap.has(planetB)) {
          dispositorMap.set(planetB, []);
        }
        dispositorMap.get(planetB)!.push(planetA);

        // 構建被接納者映射
        if (!receivedByMap.has(planetB)) {
          receivedByMap.set(planetB, []);
        }
        receivedByMap.get(planetB)!.push(reception);
      }
    }
  }

  // 偵測相互互融
  for (const [, receptionAB] of receptions) {
    const keyBA = `${receptionAB.dispositor}->${receptionAB.planet}`;
    const receptionBA = receptions.get(keyBA);

    if (receptionBA) {
      // 避免重複
      const existing = mutualReceptions.find(
        (mr) =>
          (mr.planetA === receptionAB.planet && mr.planetB === receptionAB.dispositor) ||
          (mr.planetA === receptionAB.dispositor && mr.planetB === receptionAB.planet),
      );

      if (!existing) {
        mutualReceptions.push({
          planetA: receptionAB.planet,
          planetB: receptionAB.dispositor,
          levelAtoB: receptionAB.level,
          levelBtoA: receptionBA.level,
          combinedStrength:
            (getLevelStrength(receptionAB.level) + getLevelStrength(receptionBA.level)) / 2,
          isSymmetrical: receptionAB.level === receptionBA.level,
        });
      }
    }
  }

  return {
    receptions,
    mutualReceptions,
    dispositorMap,
    receivedByMap,
  };
}

/**
 * 檢查兩顆行星之間的互融
 */
export function getReceptionBetween(
  planetA: Planet,
  planetB: Planet,
  matrix: ReceptionMatrix,
): Reception | null {
  return matrix.receptions.get(`${planetA}->${planetB}`) || null;
}

/**
 * 計算相位的增強效果
 */
export function calculateAspectEnhancement(
  planetA: Planet,
  _lonA: number,
  _isRetrogradA: boolean,
  planetB: Planet,
  _lonB: number,
  _isRetrogradB: boolean,
  aspect: Aspect,
  matrix: ReceptionMatrix,
): AspectEnhancement {
  const baseStrength = Math.max(0, 100 - aspect.orb * 2); // 簡化計算

  let receptionEnhancementA = 0;
  let receptionEnhancementB = 0;

  // 檢查 A 是否被 B 接納
  const receptionAB = getReceptionBetween(planetA, planetB, matrix);
  if (receptionAB) {
    receptionEnhancementA = calculateReceptionEnhancement(receptionAB.level, false) * 100;
  }

  // 檢查 B 是否被 A 接納
  const receptionBA = getReceptionBetween(planetB, planetA, matrix);
  if (receptionBA) {
    receptionEnhancementB = calculateReceptionEnhancement(receptionBA.level, false) * 100;
  }

  // 相互互融額外加成
  const mutualReception = matrix.mutualReceptions.find(
    (mr) =>
      (mr.planetA === planetA && mr.planetB === planetB) ||
      (mr.planetA === planetB && mr.planetB === planetA),
  );
  const mutualBonus = mutualReception ? (mutualReception.combinedStrength / 100) * 15 : 0; // 額外 15% 加成

  // 簡化：無逆行資訊直接設為 0
  const retrogradeReduction = 0;

  // 計算最終力量
  const finalStrength = Math.min(
    100,
    Math.max(
      0,
      baseStrength +
        (receptionEnhancementA + receptionEnhancementB) / 2 +
        mutualBonus -
        retrogradeReduction,
    ),
  );

  // 判斷可執行性
  let executability: 'high' | 'medium' | 'low' | 'blocked' = 'medium';
  if (aspect.type === AspectType.Square || aspect.type === AspectType.Opposition) {
    // 困難相位
    if (mutualReception) {
      executability = 'high';
    } else if (receptionAB || receptionBA) {
      executability = 'medium';
    } else {
      executability = 'blocked';
    }
  } else {
    // 和諧相位
    if (finalStrength > 75) {
      executability = 'high';
    } else if (finalStrength > 50) {
      executability = 'medium';
    } else {
      executability = 'low';
    }
  }

  return {
    baseStrength,
    receptionEnhancement: (receptionEnhancementA + receptionEnhancementB) / 2,
    mutualBonus,
    retrogradeReduction,
    finalStrength,
    executability,
  };
}

/**
 * 分析困難相位的可解性
 */
export function analyzeDifficultyResolvability(
  planetA: Planet,
  _lonA: number,
  _isRetrogradA: boolean,
  planetB: Planet,
  _lonB: number,
  _isRetrogradB: boolean,
  aspect: Aspect,
  matrix: ReceptionMatrix,
): DifficultyAnalysis {
  // 困難相位：square (90) 和 opposition (180)
  const isDifficult = aspect.type === AspectType.Square || aspect.type === AspectType.Opposition;

  if (!isDifficult) {
    return {
      isDifficult: false,
      hasReception: false,
      hasMutualReception: false,
      receptionQuality: 'none',
      resolvability: '可完全化解',
      explanation: '這是和諧相位，不需要化解。',
    };
  }

  const receptionAB = getReceptionBetween(planetA, planetB, matrix);
  const receptionBA = getReceptionBetween(planetB, planetA, matrix);
  const hasReception = !!(receptionAB || receptionBA);

  const mutualReception = matrix.mutualReceptions.find(
    (mr) =>
      (mr.planetA === planetA && mr.planetB === planetB) ||
      (mr.planetA === planetB && mr.planetB === planetA),
  );
  const hasMutualReception = !!mutualReception;

  let receptionQuality: 'excellent' | 'good' | 'fair' | 'poor' | 'none' = 'none';
  let resolvability: '可完全化解' | '可部分改善' | '有緩解' | '無解' = '無解';
  let explanation = '';

  if (hasMutualReception) {
    receptionQuality = 'excellent';
    resolvability = '可完全化解';
    explanation = `${planetA} 和 ${planetB} 相互接納（${mutualReception.levelAtoB} 和 ${mutualReception.levelBtoA}），困難相位可大幅改善。`;
  } else if (receptionAB && receptionBA) {
    receptionQuality = 'good';
    resolvability = '可部分改善';
    explanation = `${planetA} 被 ${planetB} 接納（${receptionAB.level}），${planetB} 也被 ${planetA} 接納（${receptionBA.level}），問題有解決空間。`;
  } else if (receptionAB || receptionBA) {
    receptionQuality = 'fair';
    resolvability = '有緩解';
    const receptor = receptionAB ? planetB : planetA;
    const level = receptionAB ? receptionAB.level : (receptionBA?.level ?? ReceptionLevel.None);
    explanation = `${receptor} 通過 ${level} 接納了對方，提供了一定的支持。`;
  } else {
    receptionQuality = 'none';
    resolvability = '無解';
    explanation = `${planetA} 和 ${planetB} 之間沒有互融，困難相位難以化解。`;
  }

  return {
    isDifficult,
    hasReception,
    hasMutualReception,
    receptionQuality,
    resolvability,
    explanation,
  };
}
