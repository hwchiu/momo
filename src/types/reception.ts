/**
 * 古典占星互融與接納系統
 * Reception - 行星互融的完整型別定義
 */

import type { Planet, ZodiacSign } from './astro';

/**
 * 互融等級（優先級排序）
 * 從高到低：守護 > 貴客 > 三分群 > 界 > 面
 */
export enum ReceptionLevel {
  /** 守護星座（Domicile） - 最強 */
  Domicile = 'domicile',
  /** 貴客星座（Exaltation） */
  Exaltation = 'exaltation',
  /** 三分群主星（Triplicity） */
  Triplicity = 'triplicity',
  /** 界（Terms / Bounds） */
  Terms = 'terms',
  /** 面（Face / Decan） */
  Face = 'face',
  /** 無互融 */
  None = 'none',
}

/**
 * 互融關係（單向）
 */
export interface Reception {
  /** 被接納的行星 */
  planet: Planet;
  /** 接納者行星 */
  dispositor: Planet;
  /** 互融等級 */
  level: ReceptionLevel;
  /** 互融的星座 */
  zodiacSign: ZodiacSign;
  /** 互融力量強度（%） - 用於相位增強計算 */
  strength: number;
}

/**
 * 相互互融（Mutual Reception）
 * 兩顆行星互相在對方的尊嚴中
 */
export interface MutualReception {
  /** 行星 A */
  planetA: Planet;
  /** 行星 B */
  planetB: Planet;
  /** A 接納 B 的等級 */
  levelAtoB: ReceptionLevel;
  /** B 接納 A 的等級 */
  levelBtoA: ReceptionLevel;
  /** 綜合強度（0-100） */
  combinedStrength: number;
  /** 是否對稱（兩邊等級相同） */
  isSymmetrical: boolean;
}

/**
 * 互融矩陣
 * 所有行星之間的互融關係
 */
export interface ReceptionMatrix {
  /** 行星對及其互融關係 */
  receptions: Map<string, Reception>;
  /** 相互互融列表 */
  mutualReceptions: MutualReception[];
  /** 按行星的 dispositor 映射 */
  dispositorMap: Map<Planet, Planet[]>;
  /** 按行星的被接納者列表 */
  receivedByMap: Map<Planet, Reception[]>;
}

/**
 * 相位增強效果
 */
export interface AspectEnhancement {
  /** 相位基礎力量 */
  baseStrength: number;
  /** 互融增強係數 */
  receptionEnhancement: number;
  /** 相互互融額外加成 */
  mutualBonus: number;
  /** 逆行行星衰減 */
  retrogradeReduction: number;
  /** 最終力量 */
  finalStrength: number;
  /** 相位可執行性評估 */
  executability: 'high' | 'medium' | 'low' | 'blocked';
}

/**
 * 困難相位的可解性分析
 */
export interface DifficultyAnalysis {
  /** 是否是困難相位（四分、對分等） */
  isDifficult: boolean;
  /** 是否有互融 */
  hasReception: boolean;
  /** 是否相互互融 */
  hasMutualReception: boolean;
  /** 互融品質 */
  receptionQuality: 'excellent' | 'good' | 'fair' | 'poor' | 'none';
  /** 問題解決性評估 */
  resolvability: '可完全化解' | '可部分改善' | '有緩解' | '無解';
  /** 詳細說明 */
  explanation: string;
}

/**
 * 行星尊嚴數據
 */
export interface PlanetaryDignity {
  planet: Planet;
  domicile: ZodiacSign[];
  exaltation: ZodiacSign[];
  detriment: ZodiacSign[];
  fall: ZodiacSign[];
  triplicity: {
    [key: string]: Planet; // 日間/夜間/共通
  };
  terms: {
    [degree: number]: Planet;
  }[];
  face: {
    [degree: number]: Planet;
  }[];
}

/**
 * 互融計算參數
 */
export interface ReceptionCalculationParams {
  /** 行星位置（經度 0-360） */
  planetLongitude: number;
  /** 行星是否逆行 */
  isRetrograde: boolean;
  /** 是否日間盤 */
  isDaytime: boolean;
  /** 月光位置（用於三分群判斷） */
  moonLongitude?: number;
}
