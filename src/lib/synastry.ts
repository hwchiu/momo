/**
 * Synastry & Composite Chart engine.
 *
 * - Cross-chart aspects with orbs matching ASPECT_ORBS
 * - Midpoint composite planet positions
 * - Compatibility scoring (overall + 4 categories)
 * - Curated Traditional Chinese interpretations for 15 key planet pairs
 */

import type { NatalChart, PlanetPosition } from '../types/astro';
import { Planet, AspectType, PLANET_INFO, ZodiacSign, DEFAULT_ORB_CONFIG } from '../types/astro';
import type { OrbConfig } from '../types/astro';
import type {
  SynastryAspect,
  SynastryResult,
  CompositePosition,
  CompositeHouse,
  CompatibilityScore,
} from '../types/synastry';

// ---- Utilities ----

function norm(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/** Angular difference (always positive, 0–180) */
function angularDiff(a: number, b: number): number {
  let d = Math.abs(a - b) % 360;
  if (d > 180) d = 360 - d;
  return d;
}

/** Shorter-arc midpoint of two longitudes */
function midpointLon(a: number, b: number): number {
  let diff = (((b - a) % 360) + 360) % 360;
  if (diff > 180) diff -= 360; // signed diff in (-180, 180]
  return norm(a + diff / 2);
}

// ---- Interpretation data ----

type AspectKey = `${string}-${string}-${number}`;

const INTERPRETATIONS: Partial<Record<AspectKey, string>> = {
  // Sun (☉) - Moon (☽)
  [`Sun-Moon-${AspectType.Conjunction}`]:
    '兩人的個性與情感高度融合，彼此在靈魂深處有強烈共鳴，容易形成深刻且自然的情感紐帶。',
  [`Sun-Moon-${AspectType.Trine}`]:
    '個性與情感節奏天然契合，相處輕鬆自在，彼此能在不刻意努力下相互支持與滋養。',
  [`Sun-Moon-${AspectType.Sextile}`]:
    '兩人在日常互動中能自然協調個性與情感，共同活動帶來愉悅與滿足感。',
  [`Sun-Moon-${AspectType.Square}`]:
    '個性與情感需求有所衝突，需彼此調整與包容，但也因此能促進各自的成長與自我認識。',
  [`Sun-Moon-${AspectType.Opposition}`]:
    '個性與情感互補如陰陽，吸引力強烈，挑戰在於學習尊重並整合彼此的差異。',

  // Sun (☉) - Venus (♀)
  [`Sun-Venus-${AspectType.Conjunction}`]:
    '兩人之間充滿欣賞與喜愛，日常相處帶來美感與享受，彼此容易感受到對方帶來的溫暖。',
  [`Sun-Venus-${AspectType.Trine}`]:
    '感情流動自然和諧，對方的個性令你深感欣賞，關係充滿美好氛圍與相互滋養。',
  [`Sun-Venus-${AspectType.Sextile}`]:
    '輕鬆愉悅的情感互動，兩人能在藝術、美感、享樂等方面找到共鳴與共同興趣。',
  [`Sun-Venus-${AspectType.Square}`]:
    '欣賞與吸引中帶有張力，價值觀或生活品味上的差異需要有意識地溝通調適。',
  [`Sun-Venus-${AspectType.Opposition}`]:
    '強烈的吸引力伴隨著個性與價值觀的差異，互補的能量既令人著迷，也需耐心磨合。',

  // Sun (☉) - Mars (♂)
  [`Sun-Mars-${AspectType.Conjunction}`]:
    '充滿活力與競爭性的組合，兩人能激發彼此的行動力，但也容易在意志上形成摩擦。',
  [`Sun-Mars-${AspectType.Trine}`]:
    '行動力與個性和諧結合，彼此能在共同目標上相互鼓勵，帶來充沛的動力與能量。',
  [`Sun-Mars-${AspectType.Sextile}`]:
    '兩人能輕鬆地相互激勵，在工作或共同計畫上形成良好的行動默契。',
  [`Sun-Mars-${AspectType.Square}`]:
    '意志力的碰撞帶來強烈張力，需學習在主導與配合之間取得平衡，避免衝突演變為對立。',
  [`Sun-Mars-${AspectType.Opposition}`]:
    '強烈的能量吸引，彼此激發對方的鬥志與活力，但也容易演變為競爭或正面衝突。',

  // Sun (☉) - Jupiter (♃)
  [`Sun-Jupiter-${AspectType.Conjunction}`]:
    '樂觀與擴展的能量相互激發，在一起讓彼此感到充實與可能性無限，帶來視野的拓展。',
  [`Sun-Jupiter-${AspectType.Trine}`]:
    '相互帶來正能量與鼓勵，彼此的存在讓對方感到幸運，在精神成長上有良好的共鳴。',
  [`Sun-Jupiter-${AspectType.Sextile}`]:
    '輕鬆帶來好運與機遇，彼此在共同的事業或旅行上能找到成長的契機。',
  [`Sun-Jupiter-${AspectType.Square}`]:
    '擴展的慾望可能導致過度承諾或方向不一致，需要務實地管理彼此的期望值。',
  [`Sun-Jupiter-${AspectType.Opposition}`]:
    '哲學觀或人生目標的差異帶來張力，但也促使彼此不斷拓寬視野，相互學習成長。',

  // Sun (☉) - Saturn (♄)
  [`Sun-Saturn-${AspectType.Conjunction}`]:
    '責任感強烈的組合，Saturn方帶來結構與穩定，但也可能讓Sun方感到限制，需要平衡自由與責任。',
  [`Sun-Saturn-${AspectType.Trine}`]:
    '成熟穩定的能量流動，責任感與個性和諧結合，彼此在長遠目標上能形成可靠的夥伴關係。',
  [`Sun-Saturn-${AspectType.Sextile}`]:
    '結構與個性良好配合，彼此在實際事務上能相互協助，建立穩固的日常基礎。',
  [`Sun-Saturn-${AspectType.Square}`]:
    '責任與個性之間存在摩擦，可能感到對方過於嚴格或限制，需要坦誠溝通彼此的需求。',
  [`Sun-Saturn-${AspectType.Opposition}`]:
    '個性與責任感的對立，可能感到束縛或壓迫，但若能整合，反而能帶來長遠的穩定結構。',

  // Moon (☽) - Moon (☽)
  [`Moon-Moon-${AspectType.Conjunction}`]:
    '兩人情感節奏幾乎同步，內心世界高度相似，能直覺理解對方的情感需求，極度相互滋養。',
  [`Moon-Moon-${AspectType.Trine}`]:
    '情感流動和諧自然，彼此的內在節奏相互呼應，在家庭與日常生活中容易建立溫暖的默契。',
  [`Moon-Moon-${AspectType.Sextile}`]:
    '輕鬆愉快的情感互動，兩人在生活習慣與情感表達上能互相配合，帶來舒適感。',
  [`Moon-Moon-${AspectType.Square}`]:
    '情感需求與內心習慣有所衝突，需要學習理解彼此不同的情感表達方式，不要強求同步。',
  [`Moon-Moon-${AspectType.Opposition}`]:
    '情感節奏互補，內心世界有所不同，彼此可以從對方身上看到自己缺乏的情感特質。',

  // Moon (☽) - Venus (♀)
  [`Moon-Venus-${AspectType.Conjunction}`]:
    '溫柔與滋養的能量強烈融合，兩人在情感與愛的表達上高度一致，充滿溫暖與感性。',
  [`Moon-Venus-${AspectType.Trine}`]:
    '情感與愛自然流動，彼此感到被珍視與照顧，在關係中能創造充滿美感與溫情的空間。',
  [`Moon-Venus-${AspectType.Sextile}`]:
    '輕鬆的情感欣賞，兩人在美學、享受生活或藝術方面有共同喜好，相處愉悅。',
  [`Moon-Venus-${AspectType.Square}`]:
    '情感需求與愛的表達方式有所差異，需要學習彼此的愛語，避免因誤解而感到被忽視。',
  [`Moon-Venus-${AspectType.Opposition}`]:
    '情感與愛的方式互補，彼此能看到對方在這方面所缺乏的特質，帶來豐富而複雜的感情。',

  // Moon (☽) - Mars (♂)
  [`Moon-Mars-${AspectType.Conjunction}`]:
    '強烈的情感與慾望融合，兩人之間充滿激情與直覺反應，但也容易在情緒上相互刺激。',
  [`Moon-Mars-${AspectType.Trine}`]:
    '情感與行動力和諧，Mars方能保護並激勵Moon方，彼此在共同行動中感到有力量支撐。',
  [`Moon-Mars-${AspectType.Sextile}`]:
    '情感互動帶來行動的動力，彼此能鼓勵對方付諸行動，日常生活充滿活力。',
  [`Moon-Mars-${AspectType.Square}`]:
    '情感與衝動容易產生摩擦，需要學習控制情緒反應，避免衝突在無意間傷害了彼此。',
  [`Moon-Mars-${AspectType.Opposition}`]:
    '情感與慾望形成拉力，吸引力強烈但也容易演變為情緒上的對立，需要建立安全的溝通模式。',

  // Moon (☽) - Mercury (☿)
  [`Moon-Mercury-${AspectType.Conjunction}`]:
    '情感與思維深度融合，兩人很容易分享內心世界，情感交流透過言語變得豐富而深刻。',
  [`Moon-Mercury-${AspectType.Trine}`]:
    '情感與溝通和諧流動，彼此說話時感到被理解，在情感表達與邏輯思考上能取得平衡。',
  [`Moon-Mercury-${AspectType.Sextile}`]:
    '情感與思維互補，日常對話輕鬆自然，彼此能輕易地表達情感並獲得理解。',
  [`Moon-Mercury-${AspectType.Square}`]:
    '情感與理性之間存在張力，一方可能覺得對方太情緒化，另一方則感到過於理性，需要學習接納。',
  [`Moon-Mercury-${AspectType.Opposition}`]:
    '情感直覺與邏輯思維形成對話，彼此能從不同角度理解問題，豐富彼此的認知與感受。',

  // Venus (♀) - Mars (♂)
  [`Venus-Mars-${AspectType.Conjunction}`]:
    '浪漫吸引力強烈，兩人之間的化學反應顯而易見，充滿熱情與慾望，感情容易快速升溫。',
  [`Venus-Mars-${AspectType.Trine}`]:
    '感情與行動力和諧結合，浪漫自然流動，彼此在愛與慾望上有很好的協調，感情生活豐富。',
  [`Venus-Mars-${AspectType.Sextile}`]:
    '輕鬆愉快的浪漫能量，兩人容易找到共同享受的事物，在感情與肢體親密上有良好默契。',
  [`Venus-Mars-${AspectType.Square}`]:
    '吸引力強烈但伴隨張力，慾望與價值觀可能有衝突，需要坦誠溝通才能維繫和諧的感情。',
  [`Venus-Mars-${AspectType.Opposition}`]:
    '強烈的磁場吸引，金星與火星的對立帶來迷人的化學反應，在溫柔與激情之間需找到平衡。',

  // Venus (♀) - Venus (♀)
  [`Venus-Venus-${AspectType.Conjunction}`]:
    '兩人在美感、愛的表達與生活品味上高度一致，彼此欣賞對方對美與享受的感受力。',
  [`Venus-Venus-${AspectType.Trine}`]:
    '共同的審美觀與價值觀帶來自然的和諧，在藝術、享受生活和感情表達上志同道合。',
  [`Venus-Venus-${AspectType.Sextile}`]:
    '在喜好與生活品味上互相配合，輕鬆找到共同的興趣與享樂活動，相處愉快自在。',
  [`Venus-Venus-${AspectType.Square}`]:
    '愛的方式與生活品味有所差異，需要尊重彼此對感情、美感或金錢的不同態度。',
  [`Venus-Venus-${AspectType.Opposition}`]:
    '價值觀與審美互補，彼此能拓寬對美與愛的認識，但也可能在喜好上有明顯分歧。',

  // Mercury (☿) - Mercury (☿)
  [`Mercury-Mercury-${AspectType.Conjunction}`]:
    '思維方式高度相似，溝通無障礙，兩人在聊天時容易產生共鳴，智識上形成深度的連結。',
  [`Mercury-Mercury-${AspectType.Trine}`]:
    '思維節奏自然同步，交流流暢而愉快，彼此的觀點能互相啟發，帶來智識上的滿足感。',
  [`Mercury-Mercury-${AspectType.Sextile}`]:
    '溝通輕鬆互補，彼此能在思維上相互刺激，對話帶來新的觀點與靈感。',
  [`Mercury-Mercury-${AspectType.Square}`]:
    '思維方式有所差異，溝通上可能出現誤解或意見分歧，需要練習耐心傾聽與換位思考。',
  [`Mercury-Mercury-${AspectType.Opposition}`]:
    '截然不同的思維風格帶來挑戰，但也讓彼此能從完全不同的角度看待同一件事。',

  // Saturn (♄) - Moon (☽)
  [`Saturn-Moon-${AspectType.Conjunction}`]:
    'Saturn方帶給Moon方結構與穩定，但也可能讓Moon方感到情感受限，長期承諾感強但需注意窒息感。',
  [`Saturn-Moon-${AspectType.Trine}`]:
    '情感與責任和諧結合，Saturn方能給予Moon方安全感與可靠的支持，關係具有長遠的穩定性。',
  [`Saturn-Moon-${AspectType.Sextile}`]:
    '責任感與情感互補，彼此能在日常生活中建立穩固的常規，帶來安心感與實質的照顧。',
  [`Saturn-Moon-${AspectType.Square}`]:
    '情感需求與責任感之間存在張力，可能感到對方過於冷漠或限制，需要坦誠表達情感需求。',
  [`Saturn-Moon-${AspectType.Opposition}`]:
    '情感自由與責任結構的對立，兩人需要找到在安全感與空間之間的平衡，避免形成壓迫感。',

  // Saturn (♄) - Venus (♀)
  [`Saturn-Venus-${AspectType.Conjunction}`]:
    '愛與責任強烈結合，關係具有嚴肅的承諾感，Saturn方帶來穩定，但Venus方需要感到自由的空間。',
  [`Saturn-Venus-${AspectType.Trine}`]:
    '愛與責任和諧共存，彼此在感情上既有熱情又有穩定的承諾，適合長期發展的伴侶關係。',
  [`Saturn-Venus-${AspectType.Sextile}`]:
    '感情與責任互補良好，在日常生活中能建立實際可靠的感情基礎，逐步深化信任。',
  [`Saturn-Venus-${AspectType.Square}`]:
    '愛的表達與責任感之間存在張力，可能感到感情受到限制或不夠自由，需要設定健康的界限。',
  [`Saturn-Venus-${AspectType.Opposition}`]:
    '自由的愛與嚴肅的責任形成拉鋸，需要在熱情與承諾之間找到彼此都能接受的平衡點。',

  // Jupiter (♃) - Moon (☽)
  [`Jupiter-Moon-${AspectType.Conjunction}`]:
    '豐盛與滋養的能量融合，彼此帶來樂觀與情感上的慷慨，在一起感到充實與被支持。',
  [`Jupiter-Moon-${AspectType.Trine}`]:
    '情感與擴展和諧流動，Jupiter方帶來樂觀與大氣，讓Moon方的情感世界更加豐富開闊。',
  [`Jupiter-Moon-${AspectType.Sextile}`]:
    '樂觀的情感互動，彼此能在對方身上找到成長的支持，情感上互相鼓勵與拓展。',
  [`Jupiter-Moon-${AspectType.Square}`]:
    '過度的樂觀或情感上的放縱可能帶來挑戰，需要在慷慨與實際之間找到平衡。',
  [`Jupiter-Moon-${AspectType.Opposition}`]:
    '情感需求與哲學視野的對立，Moon方可能感到Jupiter方不夠接地氣，但也能從對方身上學到包容。',
};

/** Get the interpretation for a specific planet pair and aspect.
 *  Looks up both A-B and B-A directions. Falls back to a generic description. */
function getInterpretation(pA: Planet, pB: Planet, type: AspectType): string {
  const keyAB = `${pA}-${pB}-${type}` as AspectKey;
  const keyBA = `${pB}-${pA}-${type}` as AspectKey;

  if (INTERPRETATIONS[keyAB]) return INTERPRETATIONS[keyAB]!;
  if (INTERPRETATIONS[keyBA]) return INTERPRETATIONS[keyBA]!;

  // Generic fallback
  const pAName = PLANET_INFO[pA].name;
  const pBName = PLANET_INFO[pB].name;
  if (type === AspectType.Conjunction) {
    return `${pAName}與${pBName}強烈融合，彼此在這個面向上的能量相互滲透，帶來深刻的影響。`;
  } else if (type === AspectType.Trine || type === AspectType.Sextile) {
    return `${pAName}與${pBName}形成和諧相位，兩人在這個面向上能自然地相互支持與欣賞，流動輕鬆。`;
  } else {
    return `${pAName}與${pBName}之間存在張力，需要有意識地調整與溝通，但也因此能帶來彼此成長的動力。`;
  }
}

// ---- Aspect nature ----

function getAspectNature(type: AspectType): 'harmonious' | 'challenging' | 'neutral' {
  if (type === AspectType.Trine || type === AspectType.Sextile) return 'harmonious';
  if (type === AspectType.Square || type === AspectType.Opposition) return 'challenging';
  return 'neutral'; // conjunction
}

// ---- Cross-aspect detection ----

const ASPECT_ANGLES: AspectType[] = [
  AspectType.Conjunction,
  AspectType.Sextile,
  AspectType.Square,
  AspectType.Trine,
  AspectType.Opposition,
];

function findCrossAspects(
  planetsA: PlanetPosition[],
  planetsB: PlanetPosition[],
  orbConfig: OrbConfig = DEFAULT_ORB_CONFIG,
): SynastryAspect[] {
  const aspects: SynastryAspect[] = [];

  for (const pa of planetsA) {
    for (const pb of planetsB) {
      const diff = angularDiff(pa.longitude, pb.longitude);
      for (const aspectType of ASPECT_ANGLES) {
        const orb = Math.abs(diff - (aspectType as number));
        // Classical moiety: max orb = (planetA moiety + planetB moiety) / 2
        const maxOrb = (orbConfig[pa.planet] + orbConfig[pb.planet]) / 2;
        if (orb <= maxOrb) {
          aspects.push({
            planetA: pa.planet,
            planetB: pb.planet,
            type: aspectType,
            angle: diff,
            orb: Math.round(orb * 100) / 100,
            nature: getAspectNature(aspectType),
            interpretation: getInterpretation(pa.planet, pb.planet, aspectType),
          });
          break; // one aspect per planet pair (closest)
        }
      }
    }
  }

  return aspects.sort((a, b) => a.orb - b.orb);
}

// ---- Composite chart ----

function calculateCompositePositions(chartA: NatalChart, chartB: NatalChart): CompositePosition[] {
  return chartA.planets.map((pa) => {
    const pb = chartB.planets.find((p) => p.planet === pa.planet);
    const lon = pb ? midpointLon(pa.longitude, pb.longitude) : pa.longitude;
    const signIdx = Math.floor(lon / 30) as ZodiacSign;
    const degInSign = lon % 30;
    return {
      planet: pa.planet,
      longitude: lon,
      sign: signIdx,
      degree: Math.floor(degInSign),
      minute: Math.floor((degInSign - Math.floor(degInSign)) * 60),
    };
  });
}

function calculateCompositeHouses(chartA: NatalChart, chartB: NatalChart): CompositeHouse[] {
  return chartA.houses.map((ha) => {
    const hb = chartB.houses.find((h) => h.house === ha.house);
    const lon = hb ? midpointLon(ha.longitude, hb.longitude) : ha.longitude;
    const signIdx = Math.floor(lon / 30) as ZodiacSign;
    const degInSign = lon % 30;
    return {
      house: ha.house,
      longitude: lon,
      sign: signIdx,
      degree: Math.floor(degInSign),
      minute: Math.floor((degInSign - Math.floor(degInSign)) * 60),
    };
  });
}

// ---- Compatibility scoring ----

/** Pair weight (importance of this aspect for overall score) */
function getPairWeight(a: Planet, b: Planet): number {
  const pair = [a, b].sort().join('-');
  const weights: Record<string, number> = {
    'Moon-Sun': 10,
    'Sun-Moon': 10,
    'Moon-Venus': 9,
    'Venus-Moon': 9,
    'Mars-Venus': 9,
    'Venus-Mars': 9,
    'Sun-Venus': 8,
    'Venus-Sun': 8,
    'Moon-Moon': 8,
    'Mercury-Moon': 6,
    'Moon-Mercury': 6,
    'Mercury-Sun': 6,
    'Sun-Mercury': 6,
    'Mars-Moon': 6,
    'Moon-Mars': 6,
    'Mars-Sun': 6,
    'Sun-Mars': 6,
    'Mercury-Mercury': 6,
    'Saturn-Sun': 5,
    'Sun-Saturn': 5,
    'Moon-Saturn': 5,
    'Saturn-Moon': 5,
    'Jupiter-Moon': 5,
    'Moon-Jupiter': 5,
    'Jupiter-Sun': 5,
    'Sun-Jupiter': 5,
    'Saturn-Venus': 4,
    'Venus-Saturn': 4,
    'Venus-Venus': 6,
  };
  return weights[pair] ?? weights[[b, a].sort().join('-')] ?? 2;
}

/** Aspect score modifier */
function getAspectModifier(type: AspectType): number {
  switch (type) {
    case AspectType.Trine:
      return 1.0;
    case AspectType.Sextile:
      return 0.7;
    case AspectType.Conjunction:
      return 0.4;
    case AspectType.Opposition:
      return -0.3;
    case AspectType.Square:
      return -0.6;
  }
}

type Category = 'emotional' | 'communication' | 'attraction' | 'stability';

function getCategories(a: Planet, b: Planet): Category[] {
  const pair = new Set([a, b]);
  const cats: Category[] = [];

  if (
    pair.has(Planet.Moon) &&
    (pair.has(Planet.Sun) ||
      pair.has(Planet.Moon) ||
      pair.has(Planet.Venus) ||
      pair.has(Planet.Jupiter) ||
      pair.has(Planet.Neptune) ||
      pair.has(Planet.Mercury))
  ) {
    cats.push('emotional');
  }
  if (pair.has(Planet.Sun) && pair.has(Planet.Neptune)) cats.push('emotional');

  if (pair.has(Planet.Mercury)) cats.push('communication');

  if (
    (pair.has(Planet.Venus) && pair.has(Planet.Mars)) ||
    (pair.has(Planet.Sun) && pair.has(Planet.Venus)) ||
    (pair.has(Planet.Moon) && pair.has(Planet.Mars)) ||
    (pair.has(Planet.Sun) && pair.has(Planet.Mars)) ||
    (a === Planet.Venus && b === Planet.Venus) ||
    (a === Planet.Mars && b === Planet.Mars)
  ) {
    cats.push('attraction');
  }

  if (
    pair.has(Planet.Saturn) ||
    (pair.has(Planet.Jupiter) && (pair.has(Planet.Sun) || pair.has(Planet.Moon))) ||
    (a === Planet.Sun && b === Planet.Sun)
  ) {
    cats.push('stability');
  }

  return cats.length > 0 ? cats : ['emotional'];
}

function computeCategoryScore(aspects: SynastryAspect[], category: Category): number {
  let total = 0;
  let possible = 0;
  for (const asp of aspects) {
    const cats = getCategories(asp.planetA, asp.planetB);
    if (!cats.includes(category)) continue;
    const w = getPairWeight(asp.planetA, asp.planetB);
    const m = getAspectModifier(asp.type);
    total += w * m;
    possible += w * 1.0;
  }
  if (possible === 0) return 55; // neutral default
  return Math.max(0, Math.min(100, Math.round(50 + (total / possible) * 50)));
}

function computeOverallScore(aspects: SynastryAspect[]): number {
  let total = 0;
  let possible = 0;
  for (const asp of aspects) {
    const w = getPairWeight(asp.planetA, asp.planetB);
    const m = getAspectModifier(asp.type);
    total += w * m;
    possible += w * 1.0;
  }
  if (possible === 0) return 50;
  return Math.max(0, Math.min(100, Math.round(50 + (total / possible) * 50)));
}

function scoreLabel(score: number): string {
  if (score >= 82) return '極高度相容';
  if (score >= 68) return '高度相容';
  if (score >= 52) return '相容良好';
  if (score >= 38) return '需要用心';
  return '挑戰性關係';
}

function overallDesc(score: number): string {
  if (score >= 82)
    return '兩人天生相配，主要相位高度和諧，關係充滿活力與成長潛力，相處自然而輕鬆。';
  if (score >= 68)
    return '整體相容性良好，和諧相位占主導，偶有摩擦但能促進彼此成長，關係具有深度。';
  if (score >= 52) return '關係具有一定潛力，和諧與挑戰並存，需要用心經營與相互理解。';
  if (score >= 38) return '存在明顯差異與挑戰，但不同的能量也可帶來豐富的人生體驗，需要更多包容。';
  return '關係充滿張力，需要相當的努力與包容，但挑戰也可以是相互成長的契機。';
}

function categoryDesc(category: Category, score: number): string {
  if (category === 'emotional') {
    if (score >= 70)
      return '情感連結深厚，兩人能直覺感知彼此的需求，心靈的共鳴讓關係充滿溫暖與安全感。';
    if (score >= 50) return '情感上有一定的共鳴，需要在日常互動中持續培養信任與相互理解。';
    return '情感需求與表達方式存在差異，需要有意識地建立情感的橋梁，坦誠交流是關鍵。';
  }
  if (category === 'communication') {
    if (score >= 70)
      return '溝通默契佳，彼此能輕鬆表達想法並獲得理解，思想交流讓關係充滿智識的滿足感。';
    if (score >= 50) return '溝通基礎良好，有時需要多一點耐心和換位思考，以避免誤解。';
    return '溝通方式有較大差異，需要學習彼此的表達風格，刻意練習傾聽是改善的關鍵。';
  }
  if (category === 'attraction') {
    if (score >= 70) return '吸引力強烈，兩人之間的化學反應自然且持久，感情生活充滿熱情與活力。';
    if (score >= 50) return '吸引力存在但可能較為含蓄，需要在日常相處中持續維繫浪漫的火花。';
    return '吸引力可能以張力的形式呈現，需要將衝突的能量轉化為相互欣賞的動力。';
  }
  // stability
  if (score >= 70)
    return '關係基礎穩固，彼此對長期承諾有共識，在面對生活挑戰時能形成可靠的夥伴關係。';
  if (score >= 50) return '穩定性尚可，在建立長期關係時需要更多的溝通與努力，以鞏固信任的基礎。';
  return '長期穩定性面臨挑戰，需要雙方在目標與承諾上達成共識，耐心建立穩固的關係結構。';
}

function calculateCompatibilityScore(aspects: SynastryAspect[]): CompatibilityScore {
  const overall = computeOverallScore(aspects);
  const emotional = computeCategoryScore(aspects, 'emotional');
  const communication = computeCategoryScore(aspects, 'communication');
  const attraction = computeCategoryScore(aspects, 'attraction');
  const stability = computeCategoryScore(aspects, 'stability');

  return {
    overall,
    emotional,
    communication,
    attraction,
    stability,
    overallLabel: scoreLabel(overall),
    overallDesc: overallDesc(overall),
    emotionalDesc: categoryDesc('emotional', emotional),
    communicationDesc: categoryDesc('communication', communication),
    attractionDesc: categoryDesc('attraction', attraction),
    stabilityDesc: categoryDesc('stability', stability),
  };
}

// ---- Public API ----

/** Compute the full synastry analysis between two natal charts. */
export function calculateSynastry(
  nameA: string,
  chartA: NatalChart,
  nameB: string,
  chartB: NatalChart,
  orbConfig: OrbConfig = DEFAULT_ORB_CONFIG,
): SynastryResult {
  const aspects = findCrossAspects(chartA.planets, chartB.planets, orbConfig);
  const compositePlanets = calculateCompositePositions(chartA, chartB);
  const compositeHouses = calculateCompositeHouses(chartA, chartB);
  const compositeAscendant = midpointLon(chartA.ascendant, chartB.ascendant);
  const compositeMidheaven = midpointLon(chartA.midheaven, chartB.midheaven);
  const score = calculateCompatibilityScore(aspects);

  return {
    nameA,
    nameB,
    chartA,
    chartB,
    aspects,
    compositePlanets,
    compositeHouses,
    compositeAscendant,
    compositeMidheaven,
    score,
  };
}

export { ASPECT_ANGLES };
