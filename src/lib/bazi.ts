/**
 * Bazi (Four Pillars of Destiny) calculation engine.
 *
 * Computes year/month/day/hour pillars from birth date/time using
 * solar term boundaries derived from a simplified VSOP87 Sun model.
 * All input times are treated as local standard time (no tz conversion).
 */

import type {
  BaziInput,
  BaziChart,
  Pillar,
  LuckCycle,
  TenGod,
  BranchInteraction,
  DayMasterAnalysis,
  KuaInfo,
  FlyingStarGrid,
  DayInfo,
} from '../types/bazi';
import {
  STEM_ELEMENTS,
  BRANCH_ELEMENTS,
  BRANCH_HIDDEN_STEMS,
  STAR_NAMES,
  STAR_QUALITY,
  KUA_DIRECTIONS,
  KUA_NAMES,
  TWELVE_OFFICERS,
} from '../types/bazi';

// 12 节 (solar term nodes) Sun longitudes: 寅月=315°, 卯月=345°, ..., 丑月=285°
const NODE_LONS = [315, 345, 15, 45, 75, 105, 135, 165, 195, 225, 255, 285] as const;

// ---- Julian Day Number helpers ----

/** Gregorian calendar date → Julian Day Number (integer, noon epoch) */
export function dateToJDN(y: number, m: number, d: number): number {
  const a = Math.floor((14 - m) / 12);
  const yr = y + 4800 - a;
  const mo = m + 12 * a - 3;
  return (
    d +
    Math.floor((153 * mo + 2) / 5) +
    365 * yr +
    Math.floor(yr / 4) -
    Math.floor(yr / 100) +
    Math.floor(yr / 400) -
    32045
  );
}

/** Rough calendar year from JDE */
function jdeToYear(jde: number): number {
  return Math.round(2000 + (jde - 2451545) / 365.25);
}

// ---- Solar longitude calculation ----

/**
 * Approximate Sun ecliptic longitude (degrees, 0-360) for a given Julian Ephemeris Day.
 * Accuracy: ~0.01° — sufficient for solar term boundary detection.
 */
export function sunLongitude(jde: number): number {
  const T = (jde - 2451545.0) / 36525.0;
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const Mrad = (357.52911 + 35999.05029 * T - 0.0001537 * T * T) * (Math.PI / 180);
  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mrad) +
    (0.019993 - 0.000101 * T) * Math.sin(2 * Mrad) +
    0.000289 * Math.sin(3 * Mrad);
  const omega = (125.04 - 1934.136 * T) * (Math.PI / 180);
  const lon = L0 + C - 0.00569 - 0.00478 * Math.sin(omega);
  return ((lon % 360) + 360) % 360;
}

/**
 * Find the JDE (UT) when the Sun reaches targetLon (degrees) in calendar year `year`.
 * Uses Jan 1 of the year as the initial reference, then applies Newton's method.
 */
function solarTermJDE(year: number, targetLon: number): number {
  // Start at noon Jan 1 of the given year
  let jde = dateToJDN(year, 1, 1) + 0.0; // noon
  const lonJan1 = sunLongitude(jde);

  // Estimate how many degrees ahead targetLon is from Jan 1 (going forward in time)
  let degDelta = (targetLon - lonJan1 + 360) % 360;
  // If more than ~350°, it's effectively the same term from previous year — go backward
  if (degDelta > 355) degDelta -= 360;
  jde += (degDelta / 360) * 365.2422;

  // Newton's iterations
  for (let i = 0; i < 12; i++) {
    const lon = sunLongitude(jde);
    let diff = targetLon - lon;
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;
    jde += (diff / 360) * 365.2422;
  }
  return jde;
}

/** Find the most recent 節 JDE at or before birthJDE for nodeIndex (0-11) */
function findPrevTermJDE(birthJDE: number, nodeIndex: number): number {
  const targetLon = NODE_LONS[nodeIndex];
  const year = jdeToYear(birthJDE);
  const candidates = [-1, 0, 1]
    .map((offset) => solarTermJDE(year + offset, targetLon))
    .filter((jde) => jde <= birthJDE);
  return candidates.length > 0 ? Math.max(...candidates) : solarTermJDE(year, targetLon);
}

/** Find the next 節 JDE strictly after birthJDE for nodeIndex (0-11) */
function findNextTermJDE(birthJDE: number, nodeIndex: number): number {
  const targetLon = NODE_LONS[nodeIndex];
  const year = jdeToYear(birthJDE);
  const candidates = [-1, 0, 1]
    .map((offset) => solarTermJDE(year + offset, targetLon))
    .filter((jde) => jde > birthJDE);
  return candidates.length > 0 ? Math.min(...candidates) : solarTermJDE(year + 1, targetLon);
}

// ---- Sexagenary (60-cycle) index helpers ----

/** Convert stem+branch pair to 0-59 sexagenary index */
function sexagIndex(stem: number, branch: number): number {
  for (let i = 0; i < 60; i++) {
    if (i % 10 === stem && i % 12 === branch) return i;
  }
  return 0;
}

/** Convert 0-59 sexagenary index back to { stem, branch } */
function sexagToPillar(idx: number): Pillar {
  return { stem: ((idx % 10) + 10) % 10, branch: ((idx % 12) + 12) % 12 };
}

// ---- Four Pillars ----

/** Compute year pillar. Boundary is 立春 (Sun at 315°). */
function calcYearPillar(input: BaziInput, birthJDE: number): Pillar {
  const liChunJDE = solarTermJDE(input.year, 315);
  const chineseYear = birthJDE < liChunJDE ? input.year - 1 : input.year;
  return {
    stem: (chineseYear + 6 + 400 * 10) % 10, // +400*10 ensures positive
    branch: (chineseYear + 8 + 400 * 12) % 12,
  };
}

/** Compute month pillar from Sun longitude at birth. */
function calcMonthPillar(birthJDE: number, yearStem: number): Pillar {
  const sunLon = sunLongitude(birthJDE);
  // monthIndex 0=寅(315°), 1=卯(345°), ..., 11=丑(285°)
  const monthIndex = Math.floor(((sunLon - 315 + 360) % 360) / 30);
  const branch = (monthIndex + 2) % 12; // 寅=2, 卯=3, ...
  // 五虎遁年起月: stem = (yearStem%5 * 2 + 2 + monthIndex) % 10
  const stem = ((((yearStem % 5) * 2 + 2 + monthIndex) % 10) + 10) % 10;
  return { stem, branch };
}

/** Compute day pillar from Julian Day Number. Anchor: JDN 2415021 (1900-01-01) = 甲戌 (index 10); offset +49. */
function calcDayPillar(jdn: number): Pillar {
  // Anchor: JDN 2415021 (1900-01-01) = 甲戌 (index 10) → offset +49
  // Verified against lunar-javascript and multiple Chinese almanac sources
  const dayIndex = (((jdn + 49) % 60) + 60) % 60;
  return { stem: dayIndex % 10, branch: dayIndex % 12 };
}

/** Compute hour pillar from local hour and day stem. */
function calcHourPillar(hour: number, dayStem: number): Pillar {
  const branch = Math.floor((hour + 1) / 2) % 12;
  const stem = ((((dayStem % 5) * 2 + branch) % 10) + 10) % 10;
  return { stem, branch };
}

// ---- Luck Cycles (大運) ----

function calcLuckCycles(
  input: BaziInput,
  yearStem: number,
  monthPillar: Pillar,
  birthJDE: number,
): { isForward: boolean; startYears: number; startMonths: number; cycles: LuckCycle[] } {
  // Yang year stems: 0,2,4,6,8 (甲丙戊庚壬) — even index
  const isYangYear = yearStem % 2 === 0;
  const isMale = input.gender === 'male';
  // Forward if: (male + yang) or (female + yin)
  const isForward = (isMale && isYangYear) || (!isMale && !isYangYear);

  // Determine which 節 interval birth falls in via monthIndex
  const sunLon = sunLongitude(birthJDE);
  const monthIndex = Math.floor(((sunLon - 315 + 360) % 360) / 30);

  // Find adjacent term JDE
  let termJDE: number;
  if (isForward) {
    // Next 節 after birth
    termJDE = findNextTermJDE(birthJDE, (monthIndex + 1) % 12);
  } else {
    // Previous 節 before birth
    termJDE = findPrevTermJDE(birthJDE, monthIndex);
  }

  const daysToTerm = Math.abs(birthJDE - termJDE);
  const startYears = Math.floor(daysToTerm / 3);
  const startMonths = Math.floor((daysToTerm % 3) * 4);

  const monthSexag = sexagIndex(monthPillar.stem, monthPillar.branch);
  const delta = isForward ? 1 : -1;

  const cycles: LuckCycle[] = [];
  for (let i = 0; i < 8; i++) {
    const cycleIdx = (((monthSexag + delta * (i + 1)) % 60) + 60) % 60;
    cycles.push({
      index: i,
      pillar: sexagToPillar(cycleIdx),
      startAge: startYears + i * 10,
      startYear: input.year + startYears + i * 10,
    });
  }

  return { isForward, startYears, startMonths, cycles };
}

// ---- Public API ----

/** Calculate a complete Bazi chart from birth input. */
export function calculateBazi(input: BaziInput): BaziChart {
  const jdn = dateToJDN(input.year, input.month, input.day);
  // JDE at birth (local time, no tz conversion per spec)
  const birthJDE = jdn - 0.5 + input.hour / 24 + input.minute / 1440;

  const yearPillar = calcYearPillar(input, birthJDE);
  const monthPillar = calcMonthPillar(birthJDE, yearPillar.stem);
  // The day pillar always uses the calendar day (no day-advance at 23:00).
  // 子時跨日: at 子時 (23:00–01:00) the HOUR stem is derived from the *next*
  // calendar day's stem, while the day pillar itself remains the current day.
  const dayPillar = calcDayPillar(jdn);
  const stemForHour = input.hour >= 23 ? calcDayPillar(jdn + 1).stem : dayPillar.stem;
  const hourPillar = calcHourPillar(input.hour, stemForHour);

  const { isForward, startYears, startMonths, cycles } = calcLuckCycles(
    input,
    yearPillar.stem,
    monthPillar,
    birthJDE,
  );

  return {
    input,
    yearPillar,
    monthPillar,
    dayPillar,
    hourPillar,
    isForward,
    luckStartYears: startYears,
    luckStartMonths: startMonths,
    luckCycles: cycles,
  };
}

/** Get today's year/month/day pillars (for the 今日干支 banner). */
export function getTodayGanzhi(): { yearPillar: Pillar; monthPillar: Pillar; dayPillar: Pillar } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const hour = now.getHours();

  const fakeInput: BaziInput = { year, month, day, hour, minute: 0, gender: 'male' };
  const jdn = dateToJDN(year, month, day);
  const birthJDE = jdn - 0.5 + hour / 24;

  const yearPillar = calcYearPillar(fakeInput, birthJDE);
  const monthPillar = calcMonthPillar(birthJDE, yearPillar.stem);
  const dayPillar = calcDayPillar(jdn);

  return { yearPillar, monthPillar, dayPillar };
}

/** Count Wu-xing elements across all 8 characters of a bazi chart. */
export function countElements(chart: BaziChart): Record<string, number> {
  const counts: Record<string, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  for (const pillar of [chart.yearPillar, chart.monthPillar, chart.dayPillar, chart.hourPillar]) {
    counts[STEM_ELEMENTS[pillar.stem]]++;
    counts[BRANCH_ELEMENTS[pillar.branch]]++;
  }
  return counts;
}

// ---- Ten Gods (十神) ----

// Element index: 木=0, 火=1, 土=2, 金=3, 水=4
// Generation cycle: elem generates (elem+1)%5
// Control cycle: elem controls (elem+2)%5

/** Get Ten God relationship of targetStem relative to dayStem. */
export function getTenGod(dayStem: number, targetStem: number): TenGod {
  const dayElem = Math.floor(dayStem / 2);
  const targetElem = Math.floor(targetStem / 2);
  const sameYY = dayStem % 2 === targetStem % 2;

  if (dayElem === targetElem) return sameYY ? '比肩' : '劫財';
  if ((dayElem + 1) % 5 === targetElem) return sameYY ? '食神' : '傷官'; // day generates target
  if ((dayElem + 2) % 5 === targetElem) return sameYY ? '偏財' : '正財'; // day controls target
  if ((targetElem + 2) % 5 === dayElem) return sameYY ? '七殺' : '正官'; // target controls day
  // target generates day
  return sameYY ? '偏印' : '正印';
}

// ---- Branch Interactions (刑沖合破害) ----

// 六合 pairs: [a, b]
const LIU_HE: [number, number][] = [
  [0, 1], // 子丑
  [2, 11], // 寅亥
  [3, 10], // 卯戌
  [4, 9], // 辰酉
  [5, 8], // 巳申
  [6, 7], // 午未
];
const LIU_HE_RESULTS = ['土', '木', '火', '金', '水', '火'];

// 六沖 pairs: [a, b]
const LIU_CHONG: [number, number][] = [
  [0, 6], // 子午
  [1, 7], // 丑未
  [2, 8], // 寅申
  [3, 9], // 卯酉
  [4, 10], // 辰戌
  [5, 11], // 巳亥
];

// 三合 triads: [a, b, c] + resulting element
const SAN_HE: { branches: [number, number, number]; result: string }[] = [
  { branches: [8, 0, 4], result: '水' }, // 申子辰
  { branches: [2, 6, 10], result: '火' }, // 寅午戌
  { branches: [5, 9, 1], result: '金' }, // 巳酉丑
  { branches: [11, 3, 7], result: '木' }, // 亥卯未
];

// 三刑 groups
const SAN_XING: { branches: number[]; name: string }[] = [
  { branches: [2, 5, 8], name: '恃勢之刑（寅巳申）' },
  { branches: [1, 10, 7], name: '無恩之刑（丑戌未）' },
  { branches: [0, 3], name: '無禮之刑（子卯）' },
];
const SELF_XING = [4, 6, 9, 11]; // 辰午酉亥 自刑

// 六破 pairs: [a, b]
const LIU_PO: [number, number][] = [
  [0, 9], // 子酉
  [1, 4], // 丑辰
  [2, 11], // 寅亥
  [3, 6], // 卯午
  [8, 5], // 申巳
  [10, 7], // 戌未
];

// 六害 pairs: [a, b]
const LIU_HAI: [number, number][] = [
  [0, 7], // 子未
  [1, 6], // 丑午
  [2, 5], // 寅巳
  [3, 4], // 卯辰
  [8, 11], // 申亥
  [9, 10], // 酉戌
];

const PILLAR_NAMES = ['年', '月', '日', '時'];

/** Detect all branch interactions (刑沖合破害) among the four pillars. */
export function findBranchInteractions(chart: BaziChart): BranchInteraction[] {
  const branches = [
    chart.yearPillar.branch,
    chart.monthPillar.branch,
    chart.dayPillar.branch,
    chart.hourPillar.branch,
  ];
  const result: BranchInteraction[] = [];

  // 六合
  for (let idx = 0; idx < LIU_HE.length; idx++) {
    const [a, b] = LIU_HE[idx];
    const posA = branches.indexOf(a);
    const posB = branches.indexOf(b);
    if (posA !== -1 && posB !== -1) {
      result.push({
        type: '六合',
        branches: [a, b],
        pillars: [PILLAR_NAMES[posA], PILLAR_NAMES[posB]],
        result: LIU_HE_RESULTS[idx],
      });
    }
  }

  // 三合
  for (const { branches: trio, result: el } of SAN_HE) {
    const positions = trio.map((b) => branches.indexOf(b));
    if (positions.every((p) => p !== -1)) {
      result.push({
        type: '三合',
        branches: [...trio],
        pillars: positions.map((p) => PILLAR_NAMES[p]),
        result: el,
      });
    }
  }

  // 六沖
  for (const [a, b] of LIU_CHONG) {
    const posA = branches.indexOf(a);
    const posB = branches.indexOf(b);
    if (posA !== -1 && posB !== -1) {
      result.push({
        type: '六沖',
        branches: [a, b],
        pillars: [PILLAR_NAMES[posA], PILLAR_NAMES[posB]],
      });
    }
  }

  // 三刑
  for (const { branches: group, name } of SAN_XING) {
    const positions = group.map((b) => branches.indexOf(b));
    if (positions.every((p) => p !== -1)) {
      result.push({
        type: '三刑',
        branches: group,
        pillars: positions.map((p) => PILLAR_NAMES[p]),
        result: name,
      });
    }
  }
  // 自刑
  for (const b of SELF_XING) {
    const occurrences = branches.reduce<number[]>(
      (acc, br, i) => (br === b ? [...acc, i] : acc),
      [],
    );
    if (occurrences.length >= 2) {
      result.push({
        type: '三刑',
        branches: [b, b],
        pillars: occurrences.map((p) => PILLAR_NAMES[p]),
        result: '自刑',
      });
    }
  }

  // 六破
  for (const [a, b] of LIU_PO) {
    const posA = branches.indexOf(a);
    const posB = branches.indexOf(b);
    if (posA !== -1 && posB !== -1) {
      result.push({
        type: '六破',
        branches: [a, b],
        pillars: [PILLAR_NAMES[posA], PILLAR_NAMES[posB]],
      });
    }
  }

  // 六害
  for (const [a, b] of LIU_HAI) {
    const posA = branches.indexOf(a);
    const posB = branches.indexOf(b);
    if (posA !== -1 && posB !== -1) {
      result.push({
        type: '六害',
        branches: [a, b],
        pillars: [PILLAR_NAMES[posA], PILLAR_NAMES[posB]],
      });
    }
  }

  return result;
}

// ---- Day Master Strength (日主強弱) ----

const ELEMENT_NAMES = ['木', '火', '土', '金', '水'];

/**
 * Score a stem's relationship to the day master element.
 * Positive = supportive (比劫/印), negative = draining/opposing (食傷/財/殺).
 */
function scoreStemToDay(dayElem: number, targetStem: number): number {
  const targetElem = Math.floor(targetStem / 2);
  if (targetElem === dayElem) return 1; // 比劫: same element
  if ((targetElem + 1) % 5 === dayElem) return 1; // 印: generates day
  if ((dayElem + 1) % 5 === targetElem) return -0.5; // 食傷: day generates
  if ((dayElem + 2) % 5 === targetElem) return -0.5; // 財: day controls
  return -1; // 殺: controls day
}

/** Analyze day master strength and suggest favorable element (用神). */
export function analyzeDayMaster(chart: BaziChart): DayMasterAnalysis {
  const dayElem = Math.floor(chart.dayPillar.stem / 2);

  // Month branch main hidden stem determines 月令 score (most important)
  const monthMainStem = BRANCH_HIDDEN_STEMS[chart.monthPillar.branch][0];
  const monthElem = Math.floor(monthMainStem / 2);
  let score = 0;
  if (monthElem === dayElem)
    score += 3; // 得令比劫
  else if ((monthElem + 1) % 5 === dayElem)
    score += 3; // 得令印
  else if ((dayElem + 1) % 5 === monthElem)
    score -= 1; // 泄
  else if ((dayElem + 2) % 5 === monthElem)
    score -= 1; // 財
  else score -= 2; // 官殺剋

  // Score remaining 7 characters (stems of year/month/hour + main hidden stems of 4 branches)
  const pillars = [chart.yearPillar, chart.monthPillar, chart.dayPillar, chart.hourPillar];
  for (const p of pillars) {
    // Stems (skip day stem — that's the day master itself)
    if (p !== chart.dayPillar) {
      score += scoreStemToDay(dayElem, p.stem);
    }
    // Main hidden stem of each branch
    const mainHidden = BRANCH_HIDDEN_STEMS[p.branch][0];
    score += scoreStemToDay(dayElem, mainHidden) * 0.5;
  }

  const strength: '旺' | '中和' | '弱' = score >= 5 ? '旺' : score >= 2 ? '中和' : '弱';

  // Favorable element (用神) recommendation
  let favorableElement: string;
  let avoidElement: string;
  let description: string;

  if (strength === '旺') {
    // Strong day master: use food/injury (food god, hurt officer), wealth, or official kill to drain/control
    favorableElement = ELEMENT_NAMES[(dayElem + 1) % 5]; // 食傷 element
    avoidElement = ELEMENT_NAMES[(dayElem + 4) % 5]; // 印 element
    description = '日主強旺，宜用食傷洩秀、財星耗之或官殺制衡。';
  } else if (strength === '弱') {
    // Weak day master: use resource (印) or peers (比劫) to support
    favorableElement = ELEMENT_NAMES[(dayElem + 4) % 5]; // 印 element
    avoidElement = ELEMENT_NAMES[(dayElem + 1) % 5]; // 食傷 element
    description = '日主衰弱，宜用印星生扶或比劫幫身。';
  } else {
    favorableElement = ELEMENT_NAMES[(dayElem + 4) % 5];
    avoidElement = ELEMENT_NAMES[(dayElem + 2) % 5];
    description = '日主中和，視四柱組合選取調候用神。';
  }

  return {
    score: Math.round(score * 10) / 10,
    strength,
    favorableElement,
    avoidElement,
    description,
  };
}

// ---- Kua Number (本命卦) ----

function reduceToSingle(n: number): number {
  while (n > 9) {
    n = Math.floor(n / 10) + (n % 10);
  }
  return n;
}

/** Calculate personal Kua number and Eight Mansion directions. */
export function calculateKua(year: number, gender: 'male' | 'female'): KuaInfo {
  const sum = reduceToSingle(year % 100 === 0 ? 0 : reduceToSingle(year % 100));
  let kua: number;

  if (gender === 'male') {
    kua = year < 2000 ? 10 - sum : 9 - sum;
    if (kua <= 0) kua = ((kua - 1 + 9) % 9) + 1;
    if (kua === 5) kua = 2;
  } else {
    kua = year < 2000 ? 5 + sum : 6 + sum;
    if (kua > 9) kua = kua - 9;
    if (kua === 5) kua = 8;
  }

  const group = [1, 3, 4, 9].includes(kua) ? '東四命' : '西四命';
  const dirTypes: KuaInfo['directions'][number]['type'][] = [
    '生氣',
    '天醫',
    '延年',
    '伏位',
    '禍害',
    '六煞',
    '五鬼',
    '絕命',
  ];
  const dirs = KUA_DIRECTIONS[kua] ?? KUA_DIRECTIONS[2];
  const directions = dirTypes.map((type, i) => ({
    type,
    direction: dirs[i],
    auspicious: i < 4,
  }));

  return { kua, name: KUA_NAMES[kua] ?? '坤', group, directions };
}

// ---- Annual Flying Stars (流年紫白飛星) ----

// Display order (南上北下, Chinese compass): SE,S,SW, E,C,W, NE,N,NW
const PALACE_ORDER = [
  { direction: '東南', dirShort: '巽' },
  { direction: '南', dirShort: '離' },
  { direction: '西南', dirShort: '坤' },
  { direction: '東', dirShort: '震' },
  { direction: '中', dirShort: '中' },
  { direction: '西', dirShort: '兌' },
  { direction: '東北', dirShort: '艮' },
  { direction: '北', dirShort: '坎' },
  { direction: '西北', dirShort: '乾' },
];

// Flying path offsets: C=0, NW=1, W=2, NE=3, S=4, N=5, SW=6, E=7, SE=8
// Maps display positions (SE,S,SW,E,C,W,NE,N,NW) to path offsets
const DISPLAY_TO_OFFSET = [8, 4, 6, 7, 0, 2, 3, 5, 1];

/** Calculate the annual flying star grid for a given year. */
export function getAnnualFlyingStars(year: number): FlyingStarGrid {
  // Center star formula: reference 1864=1, decreasing by 1 each year, wrapping 1-9
  const raw = (((1 - (year - 1864)) % 9) + 9) % 9;
  const centerStar = raw === 0 ? 9 : raw;

  const palaces = PALACE_ORDER.map(({ direction, dirShort }, displayIdx) => {
    const offset = DISPLAY_TO_OFFSET[displayIdx];
    const starRaw = ((centerStar - 1 + offset) % 9) + 1;
    return {
      direction,
      dirShort,
      star: starRaw,
      starName: STAR_NAMES[starRaw],
      quality: STAR_QUALITY[starRaw],
    };
  });

  return { year, centerStar, palaces };
}

/**
 * Calculate the monthly flying star grid for a given year/month.
 *
 * The monthly center star is derived from the annual center star:
 *   - Annual center groups → 寅月 (立春) start: (1,4,7)→8, (2,5,8)→5, (3,6,9)→2
 *   - Each subsequent solar month decreases by 1 (same 逆飛 direction as annual)
 *
 * The solar month index is determined from the Sun longitude at mid-month:
 *   月支月 index 0 = 寅月 (立春, Sun lon ≈315°), stepping every 30°.
 */
export function getMonthlyFlyingStars(year: number, month: number): FlyingStarGrid {
  const annualRaw = (((1 - (year - 1864)) % 9) + 9) % 9;
  const annualCenter = annualRaw === 0 ? 9 : annualRaw;

  // 寅月 starting center: annual groups (1,4,7)→8, (2,5,8)→5, (3,6,9)→2
  const yinMonthCenter = [8, 5, 2][(annualCenter - 1) % 3];

  // Determine solar month index (0=寅月 at 立春/315°)
  const midJdn = dateToJDN(year, month, 15);
  const midJde = midJdn - 0.5; // noon
  const sunLon = sunLongitude(midJde);
  const monthIdx = Math.floor(((sunLon - 315 + 360) % 360) / 30);

  // Decrement by monthIdx from 寅月 center
  const centerRaw = (yinMonthCenter - 1 - monthIdx + 900) % 9;
  const centerStar = centerRaw === 0 ? 9 : centerRaw;

  const palaces = PALACE_ORDER.map(({ direction, dirShort }, displayIdx) => {
    const offset = DISPLAY_TO_OFFSET[displayIdx];
    const starRaw = ((centerStar - 1 + offset) % 9) + 1;
    return {
      direction,
      dirShort,
      star: starRaw,
      starName: STAR_NAMES[starRaw],
      quality: STAR_QUALITY[starRaw],
    };
  });

  return { year, month, centerStar, palaces };
}

// ---- Date Selection Tool (擇日) ----

/** Get all days in a month with ganzhi and auspiciousness notes. */
export function getMonthDays(year: number, month: number, clientYearBranch?: number): DayInfo[] {
  const daysInMonth = new Date(year, month, 0).getDate();
  // Month pillar branch for 十二建星: need the month branch
  const mid = dateToJDN(year, month, 15);
  const midJDE = mid - 0.5 + 12 / 24;
  // Determine month branch from Sun longitude at mid-month
  const sunLon = sunLongitude(midJDE);
  const monthIndex = Math.floor(((sunLon - 315 + 360) % 360) / 30);
  const monthBranch = (monthIndex + 2) % 12;

  const days: DayInfo[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const jdn = dateToJDN(year, month, d);
    const dayPillar = calcDayPillar(jdn);
    const dayBranch = dayPillar.branch;

    // 十二建星: offset from month branch
    const officerIdx = (((dayBranch - monthBranch) % 12) + 12) % 12;
    const officer = TWELVE_OFFICERS[officerIdx];

    // Check clash with client's year branch (六沖: branches 6 apart)
    let clash = false;
    let clashWith: string | undefined;
    if (clientYearBranch !== undefined) {
      if ((dayBranch + 6) % 12 === clientYearBranch || (clientYearBranch + 6) % 12 === dayBranch) {
        clash = true;
        const BRANCHES_LOCAL = [
          '子',
          '丑',
          '寅',
          '卯',
          '辰',
          '巳',
          '午',
          '未',
          '申',
          '酉',
          '戌',
          '亥',
        ];
        clashWith = BRANCHES_LOCAL[clientYearBranch];
      }
    }

    // Also flag 月破 (day clashes with month branch)
    const isMonthPo = (dayBranch + 6) % 12 === monthBranch || (monthBranch + 6) % 12 === dayBranch;

    const auspiciousOfficers = ['除', '定', '成', '開'];
    const inauspiciousOfficers = ['破', '危', '閉'];
    const isGoodOfficer = auspiciousOfficers.includes(officer);
    const isBadOfficer = inauspiciousOfficers.includes(officer);

    let note = '';
    if (clash) note += '年沖 ';
    if (isMonthPo) note += '月破 ';
    if (isGoodOfficer) note += `${officer}日宜 `;
    if (isBadOfficer) note += `${officer}日忌 `;
    note = note.trim() || '一般';

    const mm = String(month).padStart(2, '0');
    const dd = String(d).padStart(2, '0');

    days.push({
      dateStr: `${year}-${mm}-${dd}`,
      day: d,
      dayPillar,
      clash: clash || isMonthPo,
      clashWith,
      officer,
      note,
    });
  }
  return days;
}
