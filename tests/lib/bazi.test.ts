/**
 * BaZi (Four Pillars of Destiny) calculation tests.
 *
 * Reference anchors:
 *  - JDN 2451545 = 2000-01-01 (J2000 epoch)
 *  - Day index on 2000-01-01: (2451545 + 5) % 60 = 10 → stem=0(甲) branch=10(戌) = 甲戌
 *  - 立春 2000: ~Feb 4; birth before it belongs to 己卯 year, after to 庚辰 year
 */

import { describe, it, expect } from 'vitest';
import {
  calculateBazi,
  getTodayGanzhi,
  dateToJDN,
  sunLongitude,
  countElements,
} from '../../src/lib/bazi';
import { STEMS, BRANCHES, STEM_ELEMENTS, BRANCH_ELEMENTS } from '../../src/types/bazi';
import type { BaziInput } from '../../src/types/bazi';

// ---- dateToJDN ----

describe('dateToJDN', () => {
  it('returns J2000 epoch for 2000-01-01', () => {
    expect(dateToJDN(2000, 1, 1)).toBe(2451545);
  });

  it('increments by 1 for each subsequent day', () => {
    expect(dateToJDN(2000, 1, 2)).toBe(2451546);
    expect(dateToJDN(2000, 1, 31)).toBe(2451575);
    expect(dateToJDN(2000, 2, 1)).toBe(2451576);
  });

  it('handles end of February in leap year 2000', () => {
    // 2000 is a leap year: Jan(31) + Feb(29) = 60 days total → Mar 1 = day 61
    expect(dateToJDN(2000, 2, 29)).toBe(2451604); // JDN 2451545 + 59
    expect(dateToJDN(2000, 3, 1)).toBe(2451605);
  });

  it('returns 2451544 for 1999-12-31 (one before J2000)', () => {
    expect(dateToJDN(1999, 12, 31)).toBe(2451544);
  });

  it('returns consistent values for non-2000 dates', () => {
    // 2020-01-01: 20 years × 365.25 avg ≈ 7305 days after J2000
    // Leap years 2000,2004,2008,2012,2016 (5 leaps) → 20×365+5 = 7305
    expect(dateToJDN(2020, 1, 1)).toBe(2451545 + 7305);
  });
});

// ---- sunLongitude ----

describe('sunLongitude', () => {
  it('returns ~280° for J2000 epoch (Sun in Capricorn)', () => {
    const lon = sunLongitude(2451545);
    expect(lon).toBeGreaterThan(278);
    expect(lon).toBeLessThan(283);
  });

  it('returns values strictly in [0, 360)', () => {
    const jdes = [2451545, 2451454, 2451636, 2451727, 2451818, 2400000, 2500000];
    for (const jde of jdes) {
      const lon = sunLongitude(jde);
      expect(lon).toBeGreaterThanOrEqual(0);
      expect(lon).toBeLessThan(360);
    }
  });

  it('advances ~1° per day (Earth orbital rate)', () => {
    const lon1 = sunLongitude(2451545);
    const lon2 = sunLongitude(2451546);
    let diff = lon2 - lon1;
    if (diff < 0) diff += 360;
    expect(diff).toBeGreaterThan(0.9);
    expect(diff).toBeLessThan(1.1);
  });

  it('completes roughly 360° over one tropical year (~365.25 days)', () => {
    const start = sunLongitude(2451545);
    const end = sunLongitude(2451545 + 365);
    let diff = end - start;
    if (diff < 0) diff += 360;
    // Expect close to 360°, allowing ~1° tolerance for non-integer year
    expect(diff).toBeGreaterThan(358);
    expect(diff).toBeLessThan(362);
  });
});

// ---- Day Pillar ----

describe('calculateBazi - day pillar', () => {
  it('2000-01-01 is 甲戌 day (stem=0 branch=10)', () => {
    // Reference: (2451545 + 5) % 60 = 10 → 10%10=0(甲), 10%12=10(戌)
    const chart = calculateBazi({ year: 2000, month: 1, day: 1, hour: 12, minute: 0, gender: 'male' });
    expect(chart.dayPillar.stem).toBe(0);    // 甲
    expect(chart.dayPillar.branch).toBe(10); // 戌
  });

  it('2000-01-02 is 乙亥 day (stem=1 branch=11)', () => {
    const chart = calculateBazi({ year: 2000, month: 1, day: 2, hour: 12, minute: 0, gender: 'male' });
    expect(chart.dayPillar.stem).toBe(1);    // 乙
    expect(chart.dayPillar.branch).toBe(11); // 亥
  });

  it('day pillar stem advances by 1 (mod 10) each day', () => {
    const ref: BaziInput = { year: 2000, month: 1, day: 1, hour: 12, minute: 0, gender: 'male' };
    const next: BaziInput = { year: 2000, month: 1, day: 2, hour: 12, minute: 0, gender: 'male' };
    const c0 = calculateBazi(ref);
    const c1 = calculateBazi(next);
    expect(c1.dayPillar.stem).toBe((c0.dayPillar.stem + 1) % 10);
    expect(c1.dayPillar.branch).toBe((c0.dayPillar.branch + 1) % 12);
  });

  it('day pillar repeats after exactly 60 days (full sexagenary cycle)', () => {
    // 2000-01-01 to 2000-03-01: 31 (Jan) + 29 (Feb, leap) = 60 days exactly
    const c0 = calculateBazi({ year: 2000, month: 1, day: 1, hour: 12, minute: 0, gender: 'male' });
    const c60 = calculateBazi({ year: 2000, month: 3, day: 1, hour: 12, minute: 0, gender: 'male' });
    expect(c60.dayPillar.stem).toBe(c0.dayPillar.stem);
    expect(c60.dayPillar.branch).toBe(c0.dayPillar.branch);
  });

  it('day pillar stem is always in [0, 9]', () => {
    const dates: BaziInput[] = [
      { year: 1970, month: 1, day: 1, hour: 12, minute: 0, gender: 'male' },
      { year: 1990, month: 6, day: 15, hour: 12, minute: 0, gender: 'female' },
      { year: 2010, month: 12, day: 31, hour: 12, minute: 0, gender: 'male' },
      { year: 2026, month: 3, day: 7, hour: 12, minute: 0, gender: 'female' },
    ];
    for (const d of dates) {
      const chart = calculateBazi(d);
      expect(chart.dayPillar.stem).toBeGreaterThanOrEqual(0);
      expect(chart.dayPillar.stem).toBeLessThanOrEqual(9);
      expect(chart.dayPillar.branch).toBeGreaterThanOrEqual(0);
      expect(chart.dayPillar.branch).toBeLessThanOrEqual(11);
    }
  });
});

// ---- Year Pillar ----

describe('calculateBazi - year pillar', () => {
  it('2000-01-01 (before 立春 ~Feb 4) is 己卯 year (stem=5, branch=3)', () => {
    // Chinese year 1999: (1999+6)%10=5(己), (1999+8)%12=3(卯)
    const chart = calculateBazi({ year: 2000, month: 1, day: 1, hour: 12, minute: 0, gender: 'male' });
    expect(chart.yearPillar.stem).toBe(5);   // 己
    expect(chart.yearPillar.branch).toBe(3); // 卯
  });

  it('2000-02-10 (after 立春) is 庚辰 year (stem=6, branch=4)', () => {
    // Chinese year 2000: (2000+6)%10=6(庚), (2000+8)%12=4(辰)
    const chart = calculateBazi({ year: 2000, month: 2, day: 10, hour: 12, minute: 0, gender: 'male' });
    expect(chart.yearPillar.stem).toBe(6);   // 庚
    expect(chart.yearPillar.branch).toBe(4); // 辰
  });

  it('1984-01-01 (before 立春) is 癸亥 year (stem=9, branch=11)', () => {
    // Chinese year 1983: (1983+6)%10=9(癸), (1983+8)%12=11(亥)
    const chart = calculateBazi({ year: 1984, month: 1, day: 1, hour: 12, minute: 0, gender: 'male' });
    expect(chart.yearPillar.stem).toBe(9);    // 癸
    expect(chart.yearPillar.branch).toBe(11); // 亥
  });

  it('1984-03-01 (after 立春) is 甲子 year (stem=0, branch=0)', () => {
    // Chinese year 1984: (1984+6)%10=0(甲), (1984+8)%12=0(子)
    const chart = calculateBazi({ year: 1984, month: 3, day: 1, hour: 12, minute: 0, gender: 'male' });
    expect(chart.yearPillar.stem).toBe(0);   // 甲
    expect(chart.yearPillar.branch).toBe(0); // 子
  });

  it('year stem and branch are always in valid ranges', () => {
    const years = [1900, 1950, 2000, 2026, 2050, 2100];
    for (const year of years) {
      const chart = calculateBazi({ year, month: 6, day: 15, hour: 12, minute: 0, gender: 'male' });
      expect(chart.yearPillar.stem).toBeGreaterThanOrEqual(0);
      expect(chart.yearPillar.stem).toBeLessThanOrEqual(9);
      expect(chart.yearPillar.branch).toBeGreaterThanOrEqual(0);
      expect(chart.yearPillar.branch).toBeLessThanOrEqual(11);
    }
  });

  it('year stem yin/yang matches expected pattern (even=yang, odd=yin)', () => {
    // 庚辰 year 2000: stem=6 (even=yang)
    const c2000 = calculateBazi({ year: 2000, month: 6, day: 1, hour: 12, minute: 0, gender: 'male' });
    expect(c2000.yearPillar.stem % 2).toBe(0); // yang (even)

    // 己卯 year 1999: stem=5 (odd=yin)
    const c1999 = calculateBazi({ year: 1999, month: 6, day: 1, hour: 12, minute: 0, gender: 'male' });
    expect(c1999.yearPillar.stem % 2).toBe(1); // yin (odd)
  });
});

// ---- Month Pillar ----

describe('calculateBazi - month pillar', () => {
  it('branch is 寅(2) in first month after 立春 (February solar term)', () => {
    // 2000-02-10: Sun is past 立春 (315°) → 寅月 → branch=2
    const chart = calculateBazi({ year: 2000, month: 2, day: 10, hour: 12, minute: 0, gender: 'male' });
    expect(chart.monthPillar.branch).toBe(2); // 寅
  });

  it('month stem follows 五虎遁年起月 rule for 庚辰 year (yearStem=6)', () => {
    // yearStem=6, 寅月(monthIndex=0): stem = (6%5 * 2 + 2 + 0) % 10 = (2+2+0)%10 = 4 (戊)
    const chart = calculateBazi({ year: 2000, month: 2, day: 10, hour: 12, minute: 0, gender: 'male' });
    expect(chart.monthPillar.stem).toBe(4); // 戊
  });

  it('month stem follows 五虎遁年起月 rule for 甲己 year (yearStem=0 or 5)', () => {
    // 1984-03-01: 甲子年(yearStem=0), 卯月(monthIndex=1)
    // stem = (0%5 * 2 + 2 + 1) % 10 = (0+2+1)%10 = 3 (丁)
    const chart = calculateBazi({ year: 1984, month: 3, day: 10, hour: 12, minute: 0, gender: 'male' });
    // Sun in early March is past 驚蟄(345°) → 卯月 (monthIndex=1, branch=3)
    expect(chart.monthPillar.branch).toBe(3); // 卯
    expect(chart.monthPillar.stem).toBe(3);   // 丁
  });

  it('month pillar stem and branch are always in valid ranges', () => {
    const dates: BaziInput[] = [
      { year: 2000, month: 1, day: 1, hour: 12, minute: 0, gender: 'male' },
      { year: 2000, month: 4, day: 15, hour: 12, minute: 0, gender: 'female' },
      { year: 2000, month: 8, day: 20, hour: 12, minute: 0, gender: 'male' },
      { year: 2000, month: 11, day: 10, hour: 12, minute: 0, gender: 'female' },
    ];
    for (const d of dates) {
      const chart = calculateBazi(d);
      expect(chart.monthPillar.stem).toBeGreaterThanOrEqual(0);
      expect(chart.monthPillar.stem).toBeLessThanOrEqual(9);
      expect(chart.monthPillar.branch).toBeGreaterThanOrEqual(0);
      expect(chart.monthPillar.branch).toBeLessThanOrEqual(11);
    }
  });
});

// ---- Hour Pillar ----

describe('calculateBazi - hour pillar', () => {
  // 時辰 boundaries: 子(0)=23-0, 丑(1)=1-2, 寅(2)=3-4, 卯(3)=5-6,
  //   辰(4)=7-8, 巳(5)=9-10, 午(6)=11-12, 未(7)=13-14,
  //   申(8)=15-16, 酉(9)=17-18, 戌(10)=19-20, 亥(11)=21-22
  const hourBranchMap: Array<[number, number]> = [
    [0, 0],   // 子
    [1, 1], [2, 1],   // 丑
    [3, 2], [4, 2],   // 寅
    [5, 3], [6, 3],   // 卯
    [7, 4], [8, 4],   // 辰
    [9, 5], [10, 5],  // 巳
    [11, 6], [12, 6], // 午
    [13, 7], [14, 7], // 未
    [15, 8], [16, 8], // 申
    [17, 9], [18, 9], // 酉
    [19, 10], [20, 10], // 戌
    [21, 11], [22, 11], // 亥
    [23, 0],  // 子 (late night)
  ];

  it.each(hourBranchMap)('hour %d maps to branch %d', (hour, expectedBranch) => {
    const chart = calculateBazi({ year: 2000, month: 1, day: 1, hour, minute: 0, gender: 'male' });
    expect(chart.hourPillar.branch).toBe(expectedBranch);
  });

  it('hour stem follows 五鼠遁日起時: 甲日(stem=0) midnight(子) → 甲子(stem=0)', () => {
    // 2000-01-01: dayPillar stem=0(甲), hour=0(子 branch=0)
    // hourStem = (0%5 * 2 + 0) % 10 = 0 → 甲
    const chart = calculateBazi({ year: 2000, month: 1, day: 1, hour: 0, minute: 0, gender: 'male' });
    expect(chart.hourPillar.stem).toBe(0); // 甲
    expect(chart.hourPillar.branch).toBe(0); // 子
  });

  it('hour stem changes correctly as hour branch changes', () => {
    // 2000-01-01: dayPillar.stem=0(甲); hourStem for branch b = (0%5*2 + b)%10 = b%10
    const base: BaziInput = { year: 2000, month: 1, day: 1, hour: 0, minute: 0, gender: 'male' };
    const chart0 = calculateBazi(base);
    // midnight 子(branch=0) stem = 0; 丑(branch=1) stem = 1; 寅(branch=2) stem = 2; ...
    for (let branch = 0; branch <= 5; branch++) {
      const hour = branch === 0 ? 0 : branch * 2 - 1;
      const c = calculateBazi({ ...base, hour });
      expect(c.hourPillar.stem).toBe((chart0.dayPillar.stem % 5 * 2 + c.hourPillar.branch) % 10);
    }
  });

  it('hour pillar stem and branch are always in valid ranges', () => {
    for (let hour = 0; hour < 24; hour++) {
      const chart = calculateBazi({ year: 2000, month: 6, day: 15, hour, minute: 0, gender: 'male' });
      expect(chart.hourPillar.stem).toBeGreaterThanOrEqual(0);
      expect(chart.hourPillar.stem).toBeLessThanOrEqual(9);
      expect(chart.hourPillar.branch).toBeGreaterThanOrEqual(0);
      expect(chart.hourPillar.branch).toBeLessThanOrEqual(11);
    }
  });
});

// ---- Luck Cycles (大運) ----

describe('calculateBazi - luck cycles', () => {
  it('produces exactly 8 luck cycles', () => {
    const chart = calculateBazi({ year: 2000, month: 6, day: 15, hour: 12, minute: 0, gender: 'male' });
    expect(chart.luckCycles).toHaveLength(8);
  });

  it('each cycle starts 10 years after the previous', () => {
    const chart = calculateBazi({ year: 2000, month: 6, day: 15, hour: 12, minute: 0, gender: 'male' });
    for (let i = 1; i < 8; i++) {
      expect(chart.luckCycles[i].startAge - chart.luckCycles[i - 1].startAge).toBe(10);
    }
  });

  it('male + yang year (庚辰) → 順行 (isForward=true)', () => {
    // 庚辰 2000-06 → yearStem=6 (even=yang), male → forward
    const chart = calculateBazi({ year: 2000, month: 6, day: 15, hour: 12, minute: 0, gender: 'male' });
    expect(chart.isForward).toBe(true);
  });

  it('male + yin year (己卯) → 逆行 (isForward=false)', () => {
    // 己卯 1999-06 → yearStem=5 (odd=yin), male → reverse
    const chart = calculateBazi({ year: 1999, month: 6, day: 15, hour: 12, minute: 0, gender: 'male' });
    expect(chart.isForward).toBe(false);
  });

  it('female + yin year (己卯) → 順行 (isForward=true)', () => {
    const chart = calculateBazi({ year: 1999, month: 6, day: 15, hour: 12, minute: 0, gender: 'female' });
    expect(chart.isForward).toBe(true);
  });

  it('female + yang year (庚辰) → 逆行 (isForward=false)', () => {
    const chart = calculateBazi({ year: 2000, month: 6, day: 15, hour: 12, minute: 0, gender: 'female' });
    expect(chart.isForward).toBe(false);
  });

  it('startYear matches input.year + startAge', () => {
    const chart = calculateBazi({ year: 2000, month: 6, day: 15, hour: 12, minute: 0, gender: 'male' });
    for (const cycle of chart.luckCycles) {
      expect(cycle.startYear).toBe(2000 + cycle.startAge);
    }
  });

  it('luck cycle pillars advance by 1 per cycle (forward)', () => {
    const chart = calculateBazi({ year: 2000, month: 6, day: 15, hour: 12, minute: 0, gender: 'male' });
    expect(chart.isForward).toBe(true);
    for (let i = 1; i < 8; i++) {
      const prev = chart.luckCycles[i - 1].pillar;
      const curr = chart.luckCycles[i].pillar;
      expect(curr.stem).toBe((prev.stem + 1) % 10);
      expect(curr.branch).toBe((prev.branch + 1) % 12);
    }
  });

  it('luck cycle pillars go backwards by 1 per cycle (reverse)', () => {
    const chart = calculateBazi({ year: 1999, month: 6, day: 15, hour: 12, minute: 0, gender: 'male' });
    expect(chart.isForward).toBe(false);
    for (let i = 1; i < 8; i++) {
      const prev = chart.luckCycles[i - 1].pillar;
      const curr = chart.luckCycles[i].pillar;
      expect(curr.stem).toBe((prev.stem - 1 + 10) % 10);
      expect(curr.branch).toBe((prev.branch - 1 + 12) % 12);
    }
  });

  it('luckStartYears is non-negative', () => {
    const chart = calculateBazi({ year: 2000, month: 6, day: 15, hour: 12, minute: 0, gender: 'male' });
    expect(chart.luckStartYears).toBeGreaterThanOrEqual(0);
  });

  it('luckStartMonths is in [0, 11]', () => {
    const chart = calculateBazi({ year: 2000, month: 6, day: 15, hour: 12, minute: 0, gender: 'male' });
    expect(chart.luckStartMonths).toBeGreaterThanOrEqual(0);
    expect(chart.luckStartMonths).toBeLessThanOrEqual(11);
  });
});

// ---- countElements ----

describe('countElements', () => {
  it('total count across all 8 characters is always 8', () => {
    const cases: BaziInput[] = [
      { year: 2000, month: 1, day: 1, hour: 0, minute: 0, gender: 'male' },
      { year: 1985, month: 7, day: 15, hour: 14, minute: 30, gender: 'female' },
      { year: 1970, month: 12, day: 31, hour: 23, minute: 0, gender: 'male' },
    ];
    for (const input of cases) {
      const chart = calculateBazi(input);
      const counts = countElements(chart);
      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      expect(total).toBe(8);
    }
  });

  it('returns counts for all five Wu-xing elements', () => {
    const chart = calculateBazi({ year: 2000, month: 6, day: 15, hour: 12, minute: 0, gender: 'male' });
    const counts = countElements(chart);
    expect(counts).toHaveProperty('木');
    expect(counts).toHaveProperty('火');
    expect(counts).toHaveProperty('土');
    expect(counts).toHaveProperty('金');
    expect(counts).toHaveProperty('水');
  });

  it('all counts are non-negative integers', () => {
    const chart = calculateBazi({ year: 2000, month: 6, day: 15, hour: 12, minute: 0, gender: 'male' });
    const counts = countElements(chart);
    for (const count of Object.values(counts)) {
      expect(count).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(count)).toBe(true);
    }
  });

  it('year stem 己(5) maps to 土 element', () => {
    // 2000-01-01: yearPillar stem=5 (己)
    const chart = calculateBazi({ year: 2000, month: 1, day: 1, hour: 12, minute: 0, gender: 'male' });
    expect(chart.yearPillar.stem).toBe(5);
    expect(STEM_ELEMENTS[chart.yearPillar.stem]).toBe('土');
  });

  it('day stem 甲(0) maps to 木 element', () => {
    // 2000-01-01: dayPillar stem=0 (甲)
    const chart = calculateBazi({ year: 2000, month: 1, day: 1, hour: 12, minute: 0, gender: 'male' });
    expect(chart.dayPillar.stem).toBe(0);
    expect(STEM_ELEMENTS[chart.dayPillar.stem]).toBe('木');
  });

  it('branch 戌(10) maps to 土 element', () => {
    // 2000-01-01: dayPillar branch=10 (戌)
    const chart = calculateBazi({ year: 2000, month: 1, day: 1, hour: 12, minute: 0, gender: 'male' });
    expect(chart.dayPillar.branch).toBe(10);
    expect(BRANCH_ELEMENTS[chart.dayPillar.branch]).toBe('土');
  });
});

// ---- getTodayGanzhi ----

describe('getTodayGanzhi', () => {
  it('returns valid stem/branch ranges for all three pillars', () => {
    const today = getTodayGanzhi();

    expect(today.yearPillar.stem).toBeGreaterThanOrEqual(0);
    expect(today.yearPillar.stem).toBeLessThanOrEqual(9);
    expect(today.yearPillar.branch).toBeGreaterThanOrEqual(0);
    expect(today.yearPillar.branch).toBeLessThanOrEqual(11);

    expect(today.monthPillar.stem).toBeGreaterThanOrEqual(0);
    expect(today.monthPillar.stem).toBeLessThanOrEqual(9);
    expect(today.monthPillar.branch).toBeGreaterThanOrEqual(0);
    expect(today.monthPillar.branch).toBeLessThanOrEqual(11);

    expect(today.dayPillar.stem).toBeGreaterThanOrEqual(0);
    expect(today.dayPillar.stem).toBeLessThanOrEqual(9);
    expect(today.dayPillar.branch).toBeGreaterThanOrEqual(0);
    expect(today.dayPillar.branch).toBeLessThanOrEqual(11);
  });

  it('stems correspond to valid STEMS entries', () => {
    const today = getTodayGanzhi();
    expect(STEMS[today.yearPillar.stem]).toBeDefined();
    expect(STEMS[today.monthPillar.stem]).toBeDefined();
    expect(STEMS[today.dayPillar.stem]).toBeDefined();
  });

  it('branches correspond to valid BRANCHES entries', () => {
    const today = getTodayGanzhi();
    expect(BRANCHES[today.yearPillar.branch]).toBeDefined();
    expect(BRANCHES[today.monthPillar.branch]).toBeDefined();
    expect(BRANCHES[today.dayPillar.branch]).toBeDefined();
  });
});

// ---- Full chart structural tests ----

describe('calculateBazi - full chart structure', () => {
  it('all four pillars are defined and in valid ranges', () => {
    const chart = calculateBazi({ year: 1990, month: 3, day: 17, hour: 4, minute: 26, gender: 'female' });
    for (const pillar of [chart.yearPillar, chart.monthPillar, chart.dayPillar, chart.hourPillar]) {
      expect(pillar.stem).toBeGreaterThanOrEqual(0);
      expect(pillar.stem).toBeLessThanOrEqual(9);
      expect(pillar.branch).toBeGreaterThanOrEqual(0);
      expect(pillar.branch).toBeLessThanOrEqual(11);
    }
  });

  it('hour stem and day stem have the correct relationship (五鼠遁)', () => {
    // For any date, hourStem = (dayStem%5*2 + hourBranch)%10
    const chart = calculateBazi({ year: 1985, month: 7, day: 15, hour: 8, minute: 0, gender: 'male' });
    const expectedHourStem = ((chart.dayPillar.stem % 5) * 2 + chart.hourPillar.branch) % 10;
    expect(chart.hourPillar.stem).toBe(expectedHourStem);
  });

  it('returns consistent chart for same input', () => {
    const input: BaziInput = { year: 1990, month: 5, day: 20, hour: 14, minute: 0, gender: 'male' };
    const chart1 = calculateBazi(input);
    const chart2 = calculateBazi(input);
    expect(chart1.yearPillar).toEqual(chart2.yearPillar);
    expect(chart1.dayPillar).toEqual(chart2.dayPillar);
    expect(chart1.isForward).toBe(chart2.isForward);
  });
});
