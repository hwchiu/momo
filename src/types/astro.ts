/** Zodiac sign enumeration (0-11) */
export enum ZodiacSign {
  Aries = 0, // 牡羊座
  Taurus = 1, // 金牛座
  Gemini = 2, // 雙子座
  Cancer = 3, // 巨蟹座
  Leo = 4, // 獅子座
  Virgo = 5, // 處女座
  Libra = 6, // 天秤座
  Scorpio = 7, // 天蠍座
  Sagittarius = 8, // 射手座
  Capricorn = 9, // 摩羯座
  Aquarius = 10, // 水瓶座
  Pisces = 11, // 雙魚座
}

/** Planet enumeration */
export enum Planet {
  Sun = 'Sun',
  Moon = 'Moon',
  Mercury = 'Mercury',
  Venus = 'Venus',
  Mars = 'Mars',
  Jupiter = 'Jupiter',
  Saturn = 'Saturn',
  Uranus = 'Uranus',
  Neptune = 'Neptune',
  Pluto = 'Pluto',
}

/** House system enumeration */
export enum HouseSystem {
  Placidus = 'Placidus', // 普拉西德斯制
  WholeSign = 'WholeSign', // 整個星座宮位制
  EqualHouse = 'EqualHouse', // 等宮制
  Porphyry = 'Porphyry', // 波菲利制
  Alcabitius = 'Alcabitius', // 阿卡比特制
  Regiomontanus = 'Regiomontanus', // 雷喬蒙塔努斯制
  Campanus = 'Campanus', // 坎帕努斯制
  Koch = 'Koch', // 科赫制
}

/** House system display info */
export const HOUSE_SYSTEM_INFO: Record<HouseSystem, { name: string; description: string }> = {
  [HouseSystem.Placidus]: { name: 'Placidus 普拉西德斯制', description: '最常用的現代制度' },
  [HouseSystem.WholeSign]: { name: '整個星座宮位制', description: '最古老的制度' },
  [HouseSystem.EqualHouse]: { name: '等宮制', description: '以上升點為起點，每宮 30°' },
  [HouseSystem.Porphyry]: { name: 'Porphyry 波菲利制', description: '象限三等分' },
  [HouseSystem.Alcabitius]: {
    name: 'Alcabitius 阿卡比特制',
    description: '中世紀常用，日弧三等分',
  },
  [HouseSystem.Regiomontanus]: {
    name: 'Regiomontanus 雷喬蒙塔努斯制',
    description: '赤道三等分',
  },
  [HouseSystem.Campanus]: { name: 'Campanus 坎帕努斯制', description: '主垂圈三等分' },
  [HouseSystem.Koch]: { name: 'Koch 科赫制', description: '基於出生地的時間系統' },
};

/** Aspect type between two planets */
export enum AspectType {
  Conjunction = 0, // 合 (0°)
  Sextile = 60, // 六分相 (60°)
  Square = 90, // 四分相 (90°)
  Trine = 120, // 三分相 (120°)
  Opposition = 180, // 對分相 (180°)
}

/** User input birth data */
export interface BirthData {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hour: number; // 0-23
  minute: number; // 0-59
  latitude: number;
  longitude: number;
  locationName: string;
}

/** Position of a planet in the chart */
export interface PlanetPosition {
  planet: Planet;
  /** Ecliptic longitude in degrees (0-360) */
  longitude: number;
  /** Zodiac sign the planet occupies */
  sign: ZodiacSign;
  /** Degree within the sign (0-29) */
  degree: number;
  /** Arc minute within the degree */
  minute: number;
  /** House number (1-12) */
  house: number;
  /** Whether the planet is in retrograde */
  retrograde: boolean;
}

/** A house cusp */
export interface HouseCusp {
  /** House number (1-12) */
  house: number;
  /** Ecliptic longitude of cusp in degrees */
  longitude: number;
  /** Zodiac sign at the cusp */
  sign: ZodiacSign;
  /** Degree within the sign */
  degree: number;
}

/** An aspect between two planets */
export interface Aspect {
  planet1: Planet;
  planet2: Planet;
  type: AspectType;
  /** Actual angular distance */
  angle: number;
  /** Difference from exact aspect angle */
  orb: number;
}

/** Complete natal chart data */
export interface NatalChart {
  birthData: BirthData;
  planets: PlanetPosition[];
  houses: HouseCusp[];
  aspects: Aspect[];
  /** Ascendant longitude in degrees */
  ascendant: number;
  /** Midheaven (MC) longitude in degrees */
  midheaven: number;
  /** House system used for calculation */
  houseSystem: HouseSystem;
}

/** Zodiac sign display info */
export const ZODIAC_SIGNS: Record<ZodiacSign, { name: string; glyph: string; element: string }> = {
  [ZodiacSign.Aries]: { name: '牡羊座', glyph: '\u2648', element: '火' },
  [ZodiacSign.Taurus]: { name: '金牛座', glyph: '\u2649', element: '土' },
  [ZodiacSign.Gemini]: { name: '雙子座', glyph: '\u264A', element: '風' },
  [ZodiacSign.Cancer]: { name: '巨蟹座', glyph: '\u264B', element: '水' },
  [ZodiacSign.Leo]: { name: '獅子座', glyph: '\u264C', element: '火' },
  [ZodiacSign.Virgo]: { name: '處女座', glyph: '\u264D', element: '土' },
  [ZodiacSign.Libra]: { name: '天秤座', glyph: '\u264E', element: '風' },
  [ZodiacSign.Scorpio]: { name: '天蠍座', glyph: '\u264F', element: '水' },
  [ZodiacSign.Sagittarius]: { name: '射手座', glyph: '\u2650', element: '火' },
  [ZodiacSign.Capricorn]: { name: '摩羯座', glyph: '\u2651', element: '土' },
  [ZodiacSign.Aquarius]: { name: '水瓶座', glyph: '\u2652', element: '風' },
  [ZodiacSign.Pisces]: { name: '雙魚座', glyph: '\u2653', element: '水' },
};

/** Planet display info */
export const PLANET_INFO: Record<Planet, { name: string; glyph: string }> = {
  [Planet.Sun]: { name: '太陽', glyph: '\u2609' },
  [Planet.Moon]: { name: '月亮', glyph: '\u263D' },
  [Planet.Mercury]: { name: '水星', glyph: '\u263F' },
  [Planet.Venus]: { name: '金星', glyph: '\u2640' },
  [Planet.Mars]: { name: '火星', glyph: '\u2642' },
  [Planet.Jupiter]: { name: '木星', glyph: '\u2643' },
  [Planet.Saturn]: { name: '土星', glyph: '\u2644' },
  [Planet.Uranus]: { name: '天王星', glyph: '\u2645' },
  [Planet.Neptune]: { name: '海王星', glyph: '\u2646' },
  [Planet.Pluto]: { name: '冥王星', glyph: '\u2647' },
};

/** Aspect display info */
export const ASPECT_INFO: Record<AspectType, { name: string; symbol: string; color: string }> = {
  [AspectType.Conjunction]: { name: '合', symbol: '\u260C', color: '#FFD700' },
  [AspectType.Sextile]: { name: '六分相', symbol: '\u26B9', color: '#4CAF50' },
  [AspectType.Square]: { name: '四分相', symbol: '\u25A1', color: '#F44336' },
  [AspectType.Trine]: { name: '三分相', symbol: '\u25B3', color: '#2196F3' },
  [AspectType.Opposition]: { name: '對分相', symbol: '\u260D', color: '#F44336' },
};

/** Standard orbs for aspect detection (in degrees) */
export const ASPECT_ORBS: Record<AspectType, number> = {
  [AspectType.Conjunction]: 8,
  [AspectType.Sextile]: 6,
  [AspectType.Square]: 7,
  [AspectType.Trine]: 8,
  [AspectType.Opposition]: 8,
};

/**
 * User-configurable orb settings per planet (classical moiety system).
 * The max allowed orb between two planets = (planetA_orb + planetB_orb) / 2.
 */
export interface OrbConfig {
  [Planet.Sun]: number;
  [Planet.Moon]: number;
  [Planet.Mercury]: number;
  [Planet.Venus]: number;
  [Planet.Mars]: number;
  [Planet.Jupiter]: number;
  [Planet.Saturn]: number;
  [Planet.Uranus]: number;
  [Planet.Neptune]: number;
  [Planet.Pluto]: number;
}

/** Classical moiety values (Ptolemaic tradition) */
export const DEFAULT_ORB_CONFIG: OrbConfig = {
  [Planet.Sun]: 15,
  [Planet.Moon]: 12,
  [Planet.Mercury]: 7,
  [Planet.Venus]: 7,
  [Planet.Mars]: 8,
  [Planet.Jupiter]: 9,
  [Planet.Saturn]: 9,
  [Planet.Uranus]: 5,
  [Planet.Neptune]: 5,
  [Planet.Pluto]: 5,
};
