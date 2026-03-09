import type { NumerologyMeaning, NumerologyResult } from '../types/numerology';

export const MASTER_NUMBERS = new Set([11, 22, 33]);

export function reduceToSingleDigit(n: number): number {
  let num = Math.abs(n);
  while (num > 9 && !MASTER_NUMBERS.has(num)) {
    num = String(num)
      .split('')
      .reduce((acc, d) => acc + parseInt(d, 10), 0);
  }
  return num;
}

export function calculateLifePath(year: number, month: number, day: number): number {
  const digits = `${year}${month}${day}`.split('').map(Number);
  const sum = digits.reduce((a, b) => a + b, 0);
  return reduceToSingleDigit(sum);
}

export function letterToNumber(char: string): number {
  const c = char.toUpperCase();
  if (c < 'A' || c > 'Z') return 0;
  const val = c.charCodeAt(0) - 64; // A=1..Z=26
  return reduceToSingleDigit(val);
}

export function calculateExpressionNumber(fullName: string): number {
  const sum = fullName
    .split('')
    .map(letterToNumber)
    .reduce((a, b) => a + b, 0);
  return reduceToSingleDigit(sum);
}

const VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);

export function calculateSoulUrgeNumber(fullName: string): number {
  const sum = fullName
    .toUpperCase()
    .split('')
    .filter((c) => VOWELS.has(c))
    .map(letterToNumber)
    .reduce((a, b) => a + b, 0);
  return reduceToSingleDigit(sum);
}

export function calculatePersonalityNumber(fullName: string): number {
  const sum = fullName
    .toUpperCase()
    .split('')
    .filter((c) => c >= 'A' && c <= 'Z' && !VOWELS.has(c))
    .map(letterToNumber)
    .reduce((a, b) => a + b, 0);
  return reduceToSingleDigit(sum);
}

export function calculatePersonalYear(
  birthMonth: number,
  birthDay: number,
  currentYear: number,
): number {
  const yearDigits = String(currentYear)
    .split('')
    .map(Number)
    .reduce((a, b) => a + b, 0);
  const sum = birthMonth + birthDay + yearDigits;
  return reduceToSingleDigit(sum);
}

export function calculateNumerology(
  birthData: { year: number; month: number; day: number },
  fullName?: string,
  currentYear?: number,
): NumerologyResult {
  const cy = currentYear ?? new Date().getFullYear();
  const cm = new Date().getMonth() + 1;
  const lifePath = calculateLifePath(birthData.year, birthData.month, birthData.day);
  const personalYear = calculatePersonalYear(birthData.month, birthData.day, cy);
  const personalMonth = reduceToSingleDigit(personalYear + cm);

  const expressionNumber = fullName ? calculateExpressionNumber(fullName) : 0;
  const soulUrgeNumber = fullName ? calculateSoulUrgeNumber(fullName) : 0;
  const personalityNumber = fullName ? calculatePersonalityNumber(fullName) : 0;
  const birthDayNumber = reduceToSingleDigit(birthData.day);

  return {
    lifePathNumber: lifePath,
    expressionNumber,
    soulUrgeNumber,
    personalityNumber,
    birthDayNumber,
    personalYear,
    personalMonth,
  };
}

export const NUMEROLOGY_MEANINGS: Record<number, NumerologyMeaning> = {
  1: {
    number: 1,
    title: '獨立先行者',
    keywords: ['領導力', '獨立', '創新', '原創性', '勇氣'],
    description:
      '數字1代表開創與領導。具有強烈的獨立精神和自信心，喜歡走在時代前端。有創新能力，但需注意避免過於自我中心。',
  },
  2: {
    number: 2,
    title: '和諧協調者',
    keywords: ['合作', '外交', '敏感', '平衡', '直覺'],
    description:
      '數字2代表合作與平衡。天生的外交官，善於在衝突中尋求和解。情感豐富、直覺敏銳，但有時過於依賴他人肯定。',
  },
  3: {
    number: 3,
    title: '創意表達者',
    keywords: ['創意', '溝通', '樂觀', '藝術', '社交'],
    description:
      '數字3充滿創意與表達欲。擅長藝術、寫作或演說，樂觀開朗、社交活躍。挑戰在於保持專注，避免精力分散。',
  },
  4: {
    number: 4,
    title: '實務建造者',
    keywords: ['穩定', '勤奮', '紀律', '實際', '可靠'],
    description:
      '數字4象徵踏實與建設。重視秩序和紀律，是可靠的建造者。擅長系統性工作，但需學習靈活應對變化。',
  },
  5: {
    number: 5,
    title: '自由探索者',
    keywords: ['自由', '冒險', '適應力', '多才多藝', '變化'],
    description:
      '數字5代表自由與變化。渴望冒險和新體驗，適應力強、多才多藝。需注意避免過於衝動或難以持久。',
  },
  6: {
    number: 6,
    title: '責任守護者',
    keywords: ['責任', '愛護', '家庭', '服務', '和諧'],
    description:
      '數字6象徵愛與責任。天生的照顧者，重視家庭和社群。有強烈的服務精神，但需避免干涉他人或過度犧牲。',
  },
  7: {
    number: 7,
    title: '智慧探求者',
    keywords: ['智慧', '分析', '靈性', '神秘', '內省'],
    description:
      '數字7代表智慧與靈性。喜歡深入研究，具有哲學思辨能力。傾向內省，需在孤獨與連結之間取得平衡。',
  },
  8: {
    number: 8,
    title: '力量成就者',
    keywords: ['力量', '成就', '物質', '權威', '豐盛'],
    description:
      '數字8象徵物質力量與成就。具有商業頭腦和領導魄力，追求成功與豐盛。需注意平衡物質與靈性追求。',
  },
  9: {
    number: 9,
    title: '人道主義者',
    keywords: ['慈悲', '人道', '智慧', '完成', '奉獻'],
    description:
      '數字9代表完成與人道主義。具有廣大的同情心和大愛精神，洞察力深邃。挑戰在於學會放下和接受結束。',
  },
  11: {
    number: 11,
    title: '靈性啟示者',
    keywords: ['直覺', '靈感', '啟示', '理想主義', '靈性'],
    description:
      '主數11是靈性數字，代表超自然直覺與啟示。具有強烈的感知能力和理想主義，是天生的精神導師。需要接地氣，避免焦慮。',
  },
  22: {
    number: 22,
    title: '宏大建造者',
    keywords: ['遠見', '實踐', '宏大', '領導', '建設'],
    description:
      '主數22結合了遠見與實踐能力，是所有數字中潛力最大的。能將宏大的夢想化為現實，是世代性的建造者。',
  },
};
