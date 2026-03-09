/** Ayanamsha correction system for Sidereal zodiac */
export type VedicAyanamsha = 'lahiri' | 'raman' | 'krishnamurti';

/** Input for Vedic chart calculation */
export interface VedicInput {
  year: number;
  month: number;
  day: number;
  hour: number; // UTC
  minute: number; // UTC
  latitude: number;
  longitude: number;
  locationName: string;
  ayanamsha: VedicAyanamsha;
}

/** One of the 9 Jyotish planets */
export interface VedicPlanet {
  name: string; // 'Sun', 'Moon', ...
  nameZh: string; // '太陽', ...
  abbr: string; // 'Su', 'Mo', ...
  tropicalLon: number;
  siderealLon: number;
  rashi: number; // 0-11, Aries=0
  degreeInRashi: number; // 0-29.99
  nakshatra: number; // 0-26
  pada: number; // 1-4
  house: number; // 1-12
  retrograde: boolean;
  dignity: 'exalted' | 'debilitated' | null;
}

/** Antardasā (sub-period) within a Mahādasā */
export interface AntarDasha {
  lord: string;
  lordZh: string;
  startDate: Date;
  endDate: Date;
  isCurrent: boolean;
}

/** Mahādasā (major period) in Vimshottari system */
export interface MahaDasha {
  lord: string;
  lordZh: string;
  startDate: Date;
  endDate: Date;
  durationYears: number;
  antardasha: AntarDasha[];
  isCurrent: boolean;
}

/** Complete Vedic natal chart */
export interface VedicChart {
  input: VedicInput;
  ayanamshaValue: number; // degrees
  lagna: number; // sidereal Lagna longitude
  lagnaRashi: number; // 0-11
  planets: VedicPlanet[];
  dashas: MahaDasha[];
}

// ---- Display constants ----

export const RASHIS_ZH = [
  '牡羊',
  '金牛',
  '雙子',
  '巨蟹',
  '獅子',
  '處女',
  '天秤',
  '天蠍',
  '射手',
  '摩羯',
  '水瓶',
  '雙魚',
];

export const RASHI_SHORT = ['Ar', 'Ta', 'Ge', 'Ca', 'Le', 'Vi', 'Li', 'Sc', 'Sg', 'Cp', 'Aq', 'Pi'];

export const NAKSHATRAS = [
  'Ashwini',
  'Bharani',
  'Krittika',
  'Rohini',
  'Mrigashira',
  'Ardra',
  'Punarvasu',
  'Pushya',
  'Ashlesha',
  'Magha',
  'Purva Phalguni',
  'Uttara Phalguni',
  'Hasta',
  'Chitra',
  'Swati',
  'Vishakha',
  'Anuradha',
  'Jyeshtha',
  'Mula',
  'Purva Ashadha',
  'Uttara Ashadha',
  'Shravana',
  'Dhanishta',
  'Shatabhisha',
  'Purva Bhadrapada',
  'Uttara Bhadrapada',
  'Revati',
];

/** Vimshottari order: Ketu → Venus → Sun → Moon → Mars → Rahu → Jupiter → Saturn → Mercury */
export const DASHA_ORDER = [
  'Ketu',
  'Venus',
  'Sun',
  'Moon',
  'Mars',
  'Rahu',
  'Jupiter',
  'Saturn',
  'Mercury',
];
export const DASHA_ORDER_ZH = [
  '計都',
  '金星',
  '太陽',
  '月亮',
  '火星',
  '羅睺',
  '木星',
  '土星',
  '水星',
];
export const DASHA_YEARS = [7, 20, 6, 10, 7, 18, 16, 19, 17];

export const PLANET_COLORS: Record<string, string> = {
  Sun: '#FF8C00',
  Moon: '#909090',
  Mars: '#DC143C',
  Mercury: '#228B22',
  Jupiter: '#DAA520',
  Venus: '#FF69B4',
  Saturn: '#4169E1',
  Rahu: '#696969',
  Ketu: '#8B4513',
};

export const BENEFIC_PLANETS = new Set(['Jupiter', 'Venus']);
export const MALEFIC_PLANETS = new Set(['Sun', 'Mars', 'Saturn', 'Rahu', 'Ketu']);

export const AYANAMSHA_NAMES: Record<VedicAyanamsha, string> = {
  lahiri: 'Lahiri（拉希里）',
  raman: 'Raman（拉曼）',
  krishnamurti: 'Krishnamurti（KP）',
};
