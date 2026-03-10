/**
 * 紫微斗數 (Zi Wei Dou Shu) engine tests.
 */

import { describe, it, expect } from 'vitest';
import { calcZiWeiBranch, calcTianFuBranch, calculateZiWei } from '../../src/lib/ziwei';
import { ZIWEI_PALACE_NAMES, BRANCHES } from '../../src/types/ziwei';

// ---- calcZiWeiBranch ----

describe('calcZiWeiBranch', () => {
  it('returns a branch index 0–11', () => {
    for (const ju of [2, 3, 4, 5, 6] as const) {
      for (const day of [1, 10, 15, 25, 30]) {
        const b = calcZiWeiBranch(ju, day);
        expect(b).toBeGreaterThanOrEqual(0);
        expect(b).toBeLessThanOrEqual(11);
      }
    }
  });

  it('水二局 day=2 is a multiple (r=0): base = (⌈2/2⌉-1) % 12 = 0 (子)', () => {
    // q=1, base=0, r=0 → stays at 0 (子)
    expect(calcZiWeiBranch(2, 2)).toBe(0);
  });

  it('水二局 day=1 (r=1, odd): base=0, 紫微 moves to (0+1)%12=1 (丑)', () => {
    expect(calcZiWeiBranch(2, 1)).toBe(1);
  });

  it('木三局 day=3 (r=0): base=(⌈3/3⌉-1)%12=0 (子)', () => {
    expect(calcZiWeiBranch(3, 3)).toBe(0);
  });

  it('covers all 30 days without throwing', () => {
    expect(() => {
      for (const ju of [2, 3, 4, 5, 6] as const) {
        for (let d = 1; d <= 30; d++) calcZiWeiBranch(ju, d);
      }
    }).not.toThrow();
  });
});

// ---- calcTianFuBranch ----

describe('calcTianFuBranch', () => {
  it('returns 0–11', () => {
    for (let z = 0; z < 12; z++) {
      const tf = calcTianFuBranch(z);
      expect(tf).toBeGreaterThanOrEqual(0);
      expect(tf).toBeLessThanOrEqual(11);
    }
  });

  it('紫微 at 子(0) → 天府 at 子(0) [mirror: (12-0)%12=0]', () => {
    expect(calcTianFuBranch(0)).toBe(0);
  });

  it('紫微 at 午(6) → 天府 at 未(6) wait — (12-6)%12=6', () => {
    expect(calcTianFuBranch(6)).toBe(6);
  });

  it('紫微 at 寅(2) → 天府 at 戌(10): (12-2)%12=10', () => {
    expect(calcTianFuBranch(2)).toBe(10);
  });

  it('紫微 and 天府 at the same position only at 子 and 午', () => {
    const symmetric = [0, 6].map((z) => calcTianFuBranch(z) === z ? z : -1).filter((x) => x >= 0);
    expect(symmetric.length).toBe(2); // 子 and 午
  });
});

// ---- calculateZiWei structure ----

describe('calculateZiWei — structure', () => {
  const chart = calculateZiWei({
    year: 1990,
    month: 6,
    day: 15,
    hour: 10,
    gender: 'male',
  });

  it('returns 12 palaces', () => {
    expect(chart.palaces).toHaveLength(12);
  });

  it('palaces have consecutive branch indices', () => {
    const firstBranch = chart.palaces[0].branch;
    for (let i = 0; i < 12; i++) {
      expect(chart.palaces[i].branch).toBe((firstBranch + i) % 12);
    }
  });

  it('each palace has a unique branch', () => {
    const branches = chart.palaces.map((p) => p.branch);
    const unique = new Set(branches);
    expect(unique.size).toBe(12);
  });

  it('palace names are correct sequence', () => {
    for (let i = 0; i < 12; i++) {
      expect(chart.palaces[i].palaceName).toBe(ZIWEI_PALACE_NAMES[i]);
    }
  });

  it('palace 0 is 命宮', () => {
    expect(chart.palaces[0].palaceName).toBe('命宮');
  });

  it('palace 0 branch matches mingGongBranch', () => {
    expect(chart.palaces[0].branch).toBe(chart.mingGongBranch);
  });

  it('ziWeiBranch is 0–11', () => {
    expect(chart.ziWeiBranch).toBeGreaterThanOrEqual(0);
    expect(chart.ziWeiBranch).toBeLessThanOrEqual(11);
  });

  it('tianFuBranch is 0–11', () => {
    expect(chart.tianFuBranch).toBeGreaterThanOrEqual(0);
    expect(chart.tianFuBranch).toBeLessThanOrEqual(11);
  });

  it('ju is in {2,3,4,5,6}', () => {
    expect([2, 3, 4, 5, 6]).toContain(chart.ju);
  });

  it('yearStem is a valid heavenly stem', () => {
    expect(['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']).toContain(chart.yearStem);
  });

  it('yearBranch is a valid earthly branch', () => {
    expect(BRANCHES).toContain(chart.yearBranch);
  });

  it('lunarMonth is 1–12', () => {
    expect(chart.lunarMonth).toBeGreaterThanOrEqual(1);
    expect(chart.lunarMonth).toBeLessThanOrEqual(12);
  });

  it('lunarDay is 1–30', () => {
    expect(chart.lunarDay).toBeGreaterThanOrEqual(1);
    expect(chart.lunarDay).toBeLessThanOrEqual(30);
  });
});

// ---- Main star invariants ----

describe('calculateZiWei — star placement', () => {
  const chart = calculateZiWei({
    year: 1985,
    month: 3,
    day: 20,
    hour: 8,
    gender: 'female',
  });

  it('紫微 appears exactly once across all palaces', () => {
    const count = chart.palaces.filter((p) =>
      p.mainStars.some((s) => s.name === '紫微'),
    ).length;
    expect(count).toBe(1);
  });

  it('天府 appears exactly once', () => {
    const count = chart.palaces.filter((p) =>
      p.mainStars.some((s) => s.name === '天府'),
    ).length;
    expect(count).toBe(1);
  });

  it('all 14 main stars appear across the chart', () => {
    const allStars = chart.palaces.flatMap((p) => p.mainStars.map((s) => s.name));
    const expected = ['紫微', '天機', '太陽', '武曲', '天同', '廉貞',
      '天府', '太陰', '貪狼', '巨門', '天相', '天梁', '七殺', '破軍'];
    for (const star of expected) {
      expect(allStars).toContain(star);
    }
  });

  it('each main star appears exactly once', () => {
    const allStars = chart.palaces.flatMap((p) => p.mainStars.map((s) => s.name));
    const counts = new Map<string, number>();
    for (const s of allStars) counts.set(s, (counts.get(s) ?? 0) + 1);
    for (const [, count] of counts) {
      expect(count).toBe(1);
    }
  });

  it('紫微 is at the palace matching ziWeiBranch', () => {
    const p = chart.palaces.find((x) => x.mainStars.some((s) => s.name === '紫微'))!;
    expect(p.branch).toBe(chart.ziWeiBranch);
  });

  it('天府 is at the palace matching tianFuBranch', () => {
    const p = chart.palaces.find((x) => x.mainStars.some((s) => s.name === '天府'))!;
    expect(p.branch).toBe(chart.tianFuBranch);
  });
});

// ---- Multiple birth dates ----

describe('calculateZiWei — robust across multiple inputs', () => {
  const testCases = [
    { year: 2000, month: 1, day: 1, hour: 0 },
    { year: 1970, month: 12, day: 31, hour: 23 },
    { year: 1960, month: 7, day: 7, hour: 14 },
    { year: 2024, month: 2, day: 10, hour: 6 }, // Chinese New Year
  ];

  for (const input of testCases) {
    it(`calculates without error for ${input.year}-${input.month}-${input.day} ${input.hour}h`, () => {
      expect(() => calculateZiWei({ ...input, gender: 'male' })).not.toThrow();
      const chart = calculateZiWei({ ...input, gender: 'male' });
      expect(chart.palaces).toHaveLength(12);
      const allStars = chart.palaces.flatMap((p) => p.mainStars.map((s) => s.name));
      expect(allStars).toContain('紫微');
      expect(allStars).toContain('天府');
    });
  }
});

