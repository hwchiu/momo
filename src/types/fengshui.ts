// Lo Shu palace positions (1–9, matching the Lo Shu magic square numbers)
// 4 9 2
// 3 5 7
// 8 1 6
// Position mapping: 1=N, 2=SW, 3=E, 4=SE, 5=C, 6=NW, 7=W, 8=NE, 9=S

export type LoShuPosition = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export interface Palace {
  loShuPosition: LoShuPosition; // native Lo Shu number
  annualStar: number; // year flying star (1-9)
  monthlyStar: number; // month flying star (1-9)
  mountainStar?: number; // 山星 from Xuan Kong chart (optional)
  facingStar?: number; // 向星 from Xuan Kong chart (optional)
}

export interface FlyingStarsChart {
  palaces: Palace[]; // 9 palaces
  yearCenter: number; // star at center for the year
  monthCenter: number; // star at center for the month
}

// 24 mountains (二十四山) - 15 degrees each
export type TwentyFourMountain =
  | '壬'
  | '子'
  | '癸' // N sector (337.5–22.5°)
  | '丑'
  | '艮'
  | '寅' // NE sector (22.5–67.5°)
  | '甲'
  | '卯'
  | '乙' // E sector (67.5–112.5°)
  | '辰'
  | '巽'
  | '巳' // SE sector (112.5–157.5°)
  | '丙'
  | '午'
  | '丁' // S sector (157.5–202.5°)
  | '未'
  | '坤'
  | '申' // SW sector (202.5–247.5°)
  | '庚'
  | '酉'
  | '辛' // W sector (247.5–292.5°)
  | '戌'
  | '乾'
  | '亥'; // NW sector (292.5–337.5°)

export type Period = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export interface XuanKongInput {
  period: Period; // 元運 (e.g., 9 for 2024–2043)
  facing: TwentyFourMountain; // 向首 (facing direction)
}

// Star descriptions (紫白九星)
export interface StarInfo {
  number: number;
  name: string; // e.g., '一白水星'
  element: string; // e.g., '水'
  trigram: string; // e.g., '坎'
  quality: 'auspicious' | 'inauspicious' | 'neutral';
  description: string; // short Chinese description
  color: string; // for display
}
