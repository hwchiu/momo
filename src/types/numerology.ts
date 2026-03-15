// Numerology types and display constants (Traditional Chinese)

export interface PinnaclePeriod {
  number: number;
  startAge: number;
  endAge: number | null; // null = ongoing (last pinnacle)
  label: string;
}

export interface NumerologyResult {
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  // Core numbers
  lifePath: number; // 生命靈數
  birthdayNumber: number; // 生日數 (reduced birth day)
  // Personal cycles (relative to a reference date)
  personalYear: number; // 個人年數
  personalMonth: number; // 個人月數
  personalDay: number; // 個人日數
  refYear: number; // reference year used
  refMonth: number; // reference month used
  refDay: number; // reference day used
  // Challenge numbers (挑戰數)
  challenges: [number, number, number, number]; // C1–C4
  // Pinnacle cycles (頂峰期)
  pinnacles: PinnaclePeriod[];
}

export interface NumberMeaning {
  name: string;
  keywords: string[];
  description: string;
}

export const NUMBER_MEANINGS: Record<number, NumberMeaning> = {
  1: {
    name: '獨立領袖',
    keywords: ['創始', '獨立', '領導', '開拓', '自信'],
    description:
      '具有強烈的個人意志與開創精神，天生領導者，勇於走出自己的道路。挑戰在於避免過度自我中心。',
  },
  2: {
    name: '合作調和',
    keywords: ['合作', '直覺', '敏感', '外交', '和諧'],
    description:
      '善於合作與調解，情感細膩、直覺敏銳，是天生的外交家與傾聽者。挑戰在於建立自信、不過度依賴他人。',
  },
  3: {
    name: '創意表達',
    keywords: ['創意', '表達', '樂觀', '藝術', '溝通'],
    description:
      '充滿創造力與表達欲，樂觀開朗，在藝術、寫作或溝通領域發光。挑戰在於集中精力、避免分散。',
  },
  4: {
    name: '穩固務實',
    keywords: ['踏實', '勤勞', '紀律', '系統', '忠誠'],
    description:
      '重視秩序與穩定，做事有條不紊，是可靠的執行者與建造者。挑戰在於靈活應變，不過於僵化。',
  },
  5: {
    name: '自由冒險',
    keywords: ['自由', '變化', '冒險', '多才多藝', '好奇'],
    description:
      '追求自由與多元體驗，適應力強、充滿活力，生命中充滿變化與冒險。挑戰在於自律與承擔責任。',
  },
  6: {
    name: '責任關懷',
    keywords: ['責任', '關愛', '家庭', '療癒', '美感'],
    description:
      '天生的照顧者，對家庭與社區充滿責任感，具有療癒能量與對美的欣賞。挑戰在於放手與不過度干涉。',
  },
  7: {
    name: '靈性智慧',
    keywords: ['靈性', '分析', '智慧', '內省', '探索'],
    description: '深思熟慮、追求真理，擁有敏銳的分析力與靈性洞察。挑戰在於開放信任、走出孤獨。',
  },
  8: {
    name: '物質權威',
    keywords: ['權力', '財富', '成就', '組織', '判斷'],
    description:
      '具有卓越的商業頭腦與組織能力，追求物質成就與社會地位。挑戰在於平衡物質與精神、善用權力。',
  },
  9: {
    name: '人道博愛',
    keywords: ['博愛', '慈悲', '智慧', '奉獻', '寬容'],
    description:
      '心懷人道主義，有廣博的同理心與奉獻精神，是精神層面的完成與圓滿。挑戰在於放下過去，學會放手。',
  },
  11: {
    name: '直覺啟示（主宰數）',
    keywords: ['靈感', '直覺', '啟發', '靈性', '夢想'],
    description:
      '主宰數11，靈性層次最高的直覺者，具有啟發他人的使命。也帶有2的敏感特質。挑戰在於將靈感落實於行動。',
  },
  22: {
    name: '大師建造者（主宰數）',
    keywords: ['宏觀', '建造', '實現', '影響', '紀律'],
    description:
      '主宰數22，擁有將宏偉夢想付諸實現的能力，是改變世界的建造者。也帶有4的務實特質。挑戰在於承擔巨大使命。',
  },
  33: {
    name: '大師導師（主宰數）',
    keywords: ['療癒', '奉獻', '教導', '慈悲', '犧牲'],
    description:
      '主宰數33，具有無私奉獻與精神療癒的最高使命，是全人類的靈性老師。也帶有6的關愛特質。挑戰在於無私服務而不自我犧牲。',
  },
};

export const CHALLENGE_LABELS = ['第一挑戰數', '第二挑戰數', '第三挑戰數（主挑戰）', '第四挑戰數'];

export const PINNACLE_LABELS = ['第一頂峰期', '第二頂峰期', '第三頂峰期', '第四頂峰期'];

export const CHALLENGE_MEANINGS: Record<number, string> = {
  0: '幾乎無明顯挑戰，需主動尋找成長動力。',
  1: '學習自立與自信，不依賴他人認可。',
  2: '克服過度敏感與優柔寡斷，培養自信外交。',
  3: '集中注意力，克服分散與自我懷疑。',
  4: '學習紀律與踏實，面對現實的限制。',
  5: '克服衝動與不穩定，學習自律。',
  6: '在責任與自由之間取得平衡，放下完美主義。',
  7: '克服孤立與不信任，向外敞開心扉。',
  8: '學習正確使用權力與金錢，避免野心過盛。',
};
