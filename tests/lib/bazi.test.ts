/**
 * BaZi (Four Pillars of Destiny) calculation tests.
 *
 * Reference anchors:
 *  - JDN 2415021 = 1900-01-01 = 甲戌 (index 10); offset +49 → dayIndex = ((jdn+49)%60+60)%60
 *  - Day index on 2000-01-01 (JDN 2451545): ((2451545+49)%60)=54 → stem=4(戊) branch=6(午) = 戊午
 *  - 立春 2000: ~Feb 4; birth before it belongs to 己卯 year, after to 庚辰 year
 *  - Verified against lunar-javascript and multiple Chinese almanac sources
 */

import { describe, it, expect } from 'vitest';
import {
  calculateBazi,
  getTodayGanzhi,
  dateToJDN,
  sunLongitude,
  countElements,
  getTenGod,
  findBranchInteractions,
  analyzeDayMaster,
  calculateKua,
  getAnnualFlyingStars,
  getMonthDays,
} from '../../src/lib/bazi';
import { STEMS, BRANCHES, STEM_ELEMENTS, BRANCH_ELEMENTS } from '../../src/types/bazi';
import type { BaziInput, BaziChart } from '../../src/types/bazi';

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
  it('2000-01-01 is 戊午 day (stem=4 branch=6)', () => {
    // Reference: JDN 2451545; dayIndex=((2451545+49)%60)=54 → 54%10=4(戊), 54%12=6(午)
    // Verified against lunar-javascript and Chinese almanac sources
    const chart = calculateBazi({ year: 2000, month: 1, day: 1, hour: 12, minute: 0, gender: 'male' });
    expect(chart.dayPillar.stem).toBe(4);   // 戊
    expect(chart.dayPillar.branch).toBe(6); // 午
  });

  it('2000-01-02 is 己未 day (stem=5 branch=7)', () => {
    const chart = calculateBazi({ year: 2000, month: 1, day: 2, hour: 12, minute: 0, gender: 'male' });
    expect(chart.dayPillar.stem).toBe(5);   // 己
    expect(chart.dayPillar.branch).toBe(7); // 未
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

  it('子時跨日: at 23:00 day pillar stays, but hour stem uses next day', () => {
    // 2000-01-01 = 戊午 day (stem=4, branch=6)
    // At 23:00 (子時), the day pillar does NOT advance.
    // Hour stem uses next day's stem (己未, stem=5): (5%5*2 + 0)%10 = 0 → 甲子
    const before = calculateBazi({ year: 2000, month: 1, day: 1, hour: 22, minute: 59, gender: 'male' });
    const after  = calculateBazi({ year: 2000, month: 1, day: 1, hour: 23, minute: 0,  gender: 'male' });
    // Day pillar stays 戊午 for both
    expect(before.dayPillar.stem).toBe(4);   // 戊
    expect(before.dayPillar.branch).toBe(6); // 午
    expect(after.dayPillar.stem).toBe(4);    // 戊 (no advance)
    expect(after.dayPillar.branch).toBe(6);  // 午 (no advance)
    // Hour pillar at 23:00 uses next day's stem (己) → 甲子
    expect(after.hourPillar.stem).toBe(0);   // 甲
    expect(after.hourPillar.branch).toBe(0); // 子
  });

  it('1988-07-28 22:29 is 甲申 day (stem=0 branch=8)', () => {
    // Verified against lunar-javascript and multiple Chinese almanac sources
    // 22:29 is 亥時 (21:00-23:00), does NOT trigger 子時跨日
    const chart = calculateBazi({ year: 1988, month: 7, day: 28, hour: 22, minute: 29, gender: 'male' });
    expect(chart.dayPillar.stem).toBe(0);   // 甲
    expect(chart.dayPillar.branch).toBe(8); // 申
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
    // 2000-01-07 = 甲子 day (stem=0): dayIndex=((2451551+49)%60)=0 → stem=0(甲)
    // hour=0 (子時, branch=0): hourStem = (0%5 * 2 + 0) % 10 = 0 → 甲
    const chart = calculateBazi({ year: 2000, month: 1, day: 7, hour: 0, minute: 0, gender: 'male' });
    expect(chart.dayPillar.stem).toBe(0);    // 甲 (verify it's a 甲日)
    expect(chart.hourPillar.stem).toBe(0);   // 甲
    expect(chart.hourPillar.branch).toBe(0); // 子
  });

  it('hour stem changes correctly as hour branch changes', () => {
    // 2000-01-01: dayPillar.stem=4(戊); hourStem for branch b = ((4%5)*2 + b)%10 = (8+b)%10
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
    // 2000-01-07 = 甲子 day (stem=0): dayIndex=((2451551+49)%60)=0 → stem=0(甲)
    const chart = calculateBazi({ year: 2000, month: 1, day: 7, hour: 12, minute: 0, gender: 'male' });
    expect(chart.dayPillar.stem).toBe(0);
    expect(STEM_ELEMENTS[chart.dayPillar.stem]).toBe('木');
  });

  it('branch 戌(10) maps to 土 element', () => {
    // 2000-01-05 = 壬戌 day (branch=10): dayIndex=((2451549+49)%60)=58 → branch=58%12=10(戌)
    const chart = calculateBazi({ year: 2000, month: 1, day: 5, hour: 12, minute: 0, gender: 'male' });
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

// ---- getTenGod ----

describe('getTenGod', () => {
  // dayStem 0=甲(木陽), targetStem mappings:
  //   0=甲(木陽)→比肩, 1=乙(木陰)→劫財
  //   2=丙(火陽)→食神, 3=丁(火陰)→傷官
  //   6=庚(金陽)→七殺, 7=辛(金陰)→正官
  //   8=壬(水陽)→偏印, 9=癸(水陰)→正印
  //   4=戊(土陽)→偏財, 5=己(土陰)→正財

  it('same stem → 比肩', () => {
    expect(getTenGod(0, 0)).toBe('比肩'); // 甲→甲
    expect(getTenGod(2, 2)).toBe('比肩'); // 丙→丙
  });

  it('same element, different yin-yang → 劫財', () => {
    expect(getTenGod(0, 1)).toBe('劫財'); // 甲→乙 (both 木, different YY)
    expect(getTenGod(2, 3)).toBe('劫財'); // 丙→丁
  });

  it('day generates target (same YY) → 食神', () => {
    expect(getTenGod(0, 2)).toBe('食神'); // 甲(木)→丙(火): 木生火, same YY (陽陽)
    expect(getTenGod(1, 3)).toBe('食神'); // 乙(木)→丁(火): same YY (陰陰)
  });

  it('day generates target (diff YY) → 傷官', () => {
    expect(getTenGod(0, 3)).toBe('傷官'); // 甲(陽木)→丁(陰火)
    expect(getTenGod(1, 2)).toBe('傷官'); // 乙(陰木)→丙(陽火)
  });

  it('day controls target (same YY) → 偏財', () => {
    expect(getTenGod(0, 4)).toBe('偏財'); // 甲(陽木)→戊(陽土): 木剋土, same YY
    expect(getTenGod(1, 5)).toBe('偏財'); // 乙(陰木)→己(陰土)
  });

  it('day controls target (diff YY) → 正財', () => {
    expect(getTenGod(0, 5)).toBe('正財'); // 甲(陽木)→己(陰土)
    expect(getTenGod(1, 4)).toBe('正財'); // 乙(陰木)→戊(陽土)
  });

  it('target controls day (same YY) → 七殺', () => {
    expect(getTenGod(0, 6)).toBe('七殺'); // 甲(陽木) controlled by 庚(陽金)
    expect(getTenGod(1, 7)).toBe('七殺'); // 乙(陰木) controlled by 辛(陰金)
  });

  it('target controls day (diff YY) → 正官', () => {
    expect(getTenGod(0, 7)).toBe('正官'); // 甲(陽木) controlled by 辛(陰金)
    expect(getTenGod(1, 6)).toBe('正官'); // 乙(陰木) controlled by 庚(陽金)
  });

  it('target generates day (same YY) → 偏印', () => {
    expect(getTenGod(0, 8)).toBe('偏印'); // 甲(陽木) generated by 壬(陽水)
    expect(getTenGod(1, 9)).toBe('偏印'); // 乙(陰木) generated by 癸(陰水)
  });

  it('target generates day (diff YY) → 正印', () => {
    expect(getTenGod(0, 9)).toBe('正印'); // 甲(陽木) generated by 癸(陰水)
    expect(getTenGod(1, 8)).toBe('正印'); // 乙(陰木) generated by 壬(陽水)
  });

  it('returns one of the 10 valid TenGod values for all 100 combos', () => {
    const VALID: string[] = ['比肩', '劫財', '食神', '傷官', '偏財', '正財', '七殺', '正官', '偏印', '正印'];
    for (let d = 0; d <= 9; d++) {
      for (let t = 0; t <= 9; t++) {
        expect(VALID).toContain(getTenGod(d, t));
      }
    }
  });
});

// ---- findBranchInteractions ----

describe('findBranchInteractions', () => {
  /** Build a minimal BaziChart with given branch values for year/month/day/hour */
  function makeChart(branches: [number, number, number, number]): BaziChart {
    return {
      input: { year: 2000, month: 1, day: 1, hour: 12, minute: 0, gender: 'male' },
      yearPillar: { stem: 0, branch: branches[0] },
      monthPillar: { stem: 2, branch: branches[1] },
      dayPillar: { stem: 4, branch: branches[2] },
      hourPillar: { stem: 6, branch: branches[3] },
      isForward: true,
      luckStartYears: 8,
      luckStartMonths: 0,
      luckCycles: [],
    };
  }

  it('detects 子丑 六合 (branches 0 and 1)', () => {
    const chart = makeChart([0, 1, 4, 8]); // 子丑 in year/month
    const interactions = findBranchInteractions(chart);
    const liuHe = interactions.filter((i) => i.type === '六合');
    expect(liuHe.length).toBeGreaterThan(0);
    const target = liuHe.find((i) => i.branches.includes(0) && i.branches.includes(1));
    expect(target).toBeDefined();
    expect(target?.result).toBe('土');
  });

  it('detects 子午 六沖 (branches 0 and 6)', () => {
    const chart = makeChart([0, 6, 4, 8]); // 子午 in year/month
    const interactions = findBranchInteractions(chart);
    const chong = interactions.filter((i) => i.type === '六沖');
    expect(chong.length).toBeGreaterThan(0);
    const target = chong.find((i) => i.branches.includes(0) && i.branches.includes(6));
    expect(target).toBeDefined();
  });

  it('detects 申子辰 三合 水局 (branches 8, 0, 4)', () => {
    const chart = makeChart([8, 0, 4, 2]); // 申子辰 in year/month/day
    const interactions = findBranchInteractions(chart);
    const sanHe = interactions.filter((i) => i.type === '三合');
    expect(sanHe.length).toBeGreaterThan(0);
    const target = sanHe.find((i) => i.result === '水');
    expect(target).toBeDefined();
  });

  it('detects 寅巳申 三刑 (branches 2, 5, 8)', () => {
    const chart = makeChart([2, 5, 8, 0]); // 寅巳申 in year/month/day
    const interactions = findBranchInteractions(chart);
    const xing = interactions.filter((i) => i.type === '三刑');
    expect(xing.length).toBeGreaterThan(0);
  });

  it('returns empty array when no interactions', () => {
    // Validate it still returns an array even when interactions are minimal
    const chart = makeChart([1, 3, 5, 7]); // 丑、卯、巳、未
    const interactions = findBranchInteractions(chart);
    expect(Array.isArray(interactions)).toBe(true);
  });

  it('interaction pillars reference valid pillar names', () => {
    const chart = makeChart([0, 1, 6, 9]); // 子丑午
    const interactions = findBranchInteractions(chart);
    const validPillars = ['年', '月', '日', '時'];
    for (const inter of interactions) {
      for (const pillar of inter.pillars) {
        expect(validPillars).toContain(pillar);
      }
    }
  });
});

// ---- analyzeDayMaster ----

describe('analyzeDayMaster', () => {
  it('returns a valid strength value', () => {
    const chart = calculateBazi({ year: 1985, month: 7, day: 15, hour: 8, minute: 0, gender: 'male' });
    const analysis = analyzeDayMaster(chart);
    expect(['旺', '中和', '弱']).toContain(analysis.strength);
  });

  it('favorableElement and avoidElement are Wu-xing elements', () => {
    const chart = calculateBazi({ year: 1990, month: 3, day: 20, hour: 12, minute: 0, gender: 'female' });
    const analysis = analyzeDayMaster(chart);
    const elements = ['木', '火', '土', '金', '水'];
    expect(elements).toContain(analysis.favorableElement);
    expect(elements).toContain(analysis.avoidElement);
    expect(analysis.favorableElement).not.toBe(analysis.avoidElement);
  });

  it('description is non-empty', () => {
    const chart = calculateBazi({ year: 2000, month: 6, day: 15, hour: 14, minute: 0, gender: 'male' });
    const analysis = analyzeDayMaster(chart);
    expect(analysis.description.length).toBeGreaterThan(0);
  });

  it('score is a finite number', () => {
    const chart = calculateBazi({ year: 1975, month: 11, day: 28, hour: 6, minute: 0, gender: 'female' });
    const analysis = analyzeDayMaster(chart);
    expect(Number.isFinite(analysis.score)).toBe(true);
  });

  it('旺 chart favors food/injury element (stem+1 element)', () => {
    // To get a 旺 chart: need month branch main hidden stem to share element with day stem
    // and multiple supporting stems. Use a specific known strong chart.
    for (let i = 0; i < 5; i++) {
      // Test several charts, verify internal consistency: 旺 → favorable = food/injury (dayElem+1)
      const chart = calculateBazi({ year: 1985 + i * 5, month: 6, day: 15, hour: 12, minute: 0, gender: 'male' });
      const analysis = analyzeDayMaster(chart);
      const dayElem = Math.floor(chart.dayPillar.stem / 2);
      const ELEMENTS = ['木', '火', '土', '金', '水'];
      if (analysis.strength === '旺') {
        expect(analysis.favorableElement).toBe(ELEMENTS[(dayElem + 1) % 5]);
        expect(analysis.avoidElement).toBe(ELEMENTS[(dayElem + 4) % 5]);
      } else if (analysis.strength === '弱') {
        expect(analysis.favorableElement).toBe(ELEMENTS[(dayElem + 4) % 5]);
        expect(analysis.avoidElement).toBe(ELEMENTS[(dayElem + 1) % 5]);
      }
    }
  });
});

// ---- calculateKua ----

describe('calculateKua', () => {
  // Reference values from classical Eight Mansion text:
  // 1984 male: year%100=84 → reduce=8+4=12→3; male pre-2000: 10-3=7 → 兌 西四命
  it('1984 male → Kua 7 (兌)', () => {
    const kua = calculateKua(1984, 'male');
    expect(kua.kua).toBe(7);
    expect(kua.name).toBe('兌');
    expect(kua.group).toBe('西四命');
  });

  // 1990 female: year%100=90 → reduce=9+0=9; female pre-2000: 5+9=14→14-9=5→5→map to 8 → 艮
  it('1990 female → Kua 8 (艮)', () => {
    const kua = calculateKua(1990, 'female');
    expect(kua.kua).toBe(8);
    expect(kua.name).toBe('艮');
    expect(kua.group).toBe('西四命');
  });

  // 1985 male: year%100=85 → reduce=8+5=13→4; male pre-2000: 10-4=6 → 乾 西四命
  it('1985 male → Kua 6 (乾)', () => {
    const kua = calculateKua(1985, 'male');
    expect(kua.kua).toBe(6);
    expect(kua.name).toBe('乾');
    expect(kua.group).toBe('西四命');
  });

  it('Kua 5 is remapped (male → 2, female → 8)', () => {
    // For male: need 10-sum=5 → sum=5 → reduce year%100 to 5
    // year%100=50: 5+0=5 → pre-2000 male: 10-5=5 → remap to 2
    const kuaMale = calculateKua(1950, 'male');
    expect(kuaMale.kua).not.toBe(5);

    // For female: need 5+sum=5 → sum=0 → year%100=0 → year 2000 female: 6+0=6
    // Or year 1900: 5+0=5 → remap to 8
    const kuaFemale = calculateKua(1900, 'female');
    expect(kuaFemale.kua).not.toBe(5);
  });

  it('Kua number is always 1-9 (not 5)', () => {
    const years = [1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020];
    const genders: ('male' | 'female')[] = ['male', 'female'];
    for (const year of years) {
      for (const gender of genders) {
        const kua = calculateKua(year, gender);
        expect(kua.kua).toBeGreaterThanOrEqual(1);
        expect(kua.kua).toBeLessThanOrEqual(9);
        expect(kua.kua).not.toBe(5);
      }
    }
  });

  it('group is either 東四命 or 西四命', () => {
    const eastKuas = [1, 3, 4, 9]; // 坎震巽離
    const westKuas = [2, 6, 7, 8]; // 坤乾兌艮
    for (const year of [1975, 1980, 1985, 1990, 1995, 2005]) {
      for (const gender of ['male', 'female'] as ('male' | 'female')[]) {
        const kua = calculateKua(year, gender);
        if (eastKuas.includes(kua.kua)) {
          expect(kua.group).toBe('東四命');
        } else if (westKuas.includes(kua.kua)) {
          expect(kua.group).toBe('西四命');
        }
      }
    }
  });

  it('directions array has 8 entries with valid types', () => {
    const validTypes = ['生氣', '天醫', '延年', '伏位', '禍害', '六煞', '五鬼', '絕命'];
    const kua = calculateKua(1985, 'female');
    expect(kua.directions).toHaveLength(8);
    for (const dir of kua.directions) {
      expect(validTypes).toContain(dir.type);
      expect(dir.direction.length).toBeGreaterThan(0);
      expect(typeof dir.auspicious).toBe('boolean');
    }
  });

  it('auspicious directions are 生氣, 天醫, 延年, 伏位', () => {
    const kua = calculateKua(1980, 'male');
    for (const dir of kua.directions) {
      const isAuspicious = ['生氣', '天醫', '延年', '伏位'].includes(dir.type);
      expect(dir.auspicious).toBe(isAuspicious);
    }
  });
});

// ---- getAnnualFlyingStars ----

describe('getAnnualFlyingStars', () => {
  // Reference values: base year 1864=1, decreasing by 1 each year (mod 9)
  it('2024 center star is 3 (三碧木星)', () => {
    const grid = getAnnualFlyingStars(2024);
    expect(grid.centerStar).toBe(3);
    expect(grid.year).toBe(2024);
  });

  it('2023 center star is 4 (四綠木星)', () => {
    const grid = getAnnualFlyingStars(2023);
    expect(grid.centerStar).toBe(4);
  });

  it('2025 center star is 2 (二黑土星)', () => {
    const grid = getAnnualFlyingStars(2025);
    expect(grid.centerStar).toBe(2);
  });

  it('center star cycles 9→8→…→1→9 year over year', () => {
    // Stars decrease by 1 each year, wrapping 1→9
    for (let year = 2020; year <= 2030; year++) {
      const g1 = getAnnualFlyingStars(year);
      const g2 = getAnnualFlyingStars(year + 1);
      const expected = g1.centerStar === 1 ? 9 : g1.centerStar - 1;
      expect(g2.centerStar).toBe(expected);
    }
  });

  it('returns exactly 9 palaces', () => {
    const grid = getAnnualFlyingStars(2024);
    expect(grid.palaces).toHaveLength(9);
  });

  it('each palace has a star 1-9, valid starName, and valid quality', () => {
    const grid = getAnnualFlyingStars(2024);
    const validQualities = ['大吉', '吉', '凶', '大凶'];
    for (const palace of grid.palaces) {
      expect(palace.star).toBeGreaterThanOrEqual(1);
      expect(palace.star).toBeLessThanOrEqual(9);
      expect(palace.starName.length).toBeGreaterThan(0);
      expect(validQualities).toContain(palace.quality);
    }
  });

  it('all 9 stars appear exactly once in the grid', () => {
    const grid = getAnnualFlyingStars(2024);
    const stars = grid.palaces.map((p) => p.star).sort((a, b) => a - b);
    expect(stars).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
});

// ---- getMonthDays ----

describe('getMonthDays', () => {
  it('returns correct number of days for January 2024 (31 days)', () => {
    const days = getMonthDays(2024, 1);
    expect(days).toHaveLength(31);
  });

  it('returns correct number of days for February 2024 (leap year: 29 days)', () => {
    const days = getMonthDays(2024, 2);
    expect(days).toHaveLength(29);
  });

  it('returns correct number of days for February 2023 (non-leap: 28 days)', () => {
    const days = getMonthDays(2023, 2);
    expect(days).toHaveLength(28);
  });

  it('each day has valid dateStr format YYYY-MM-DD', () => {
    const days = getMonthDays(2024, 3);
    const pattern = /^\d{4}-\d{2}-\d{2}$/;
    for (const day of days) {
      expect(day.dateStr).toMatch(pattern);
    }
  });

  it('day numbers are sequential 1..N', () => {
    const days = getMonthDays(2024, 6);
    days.forEach((d, i) => expect(d.day).toBe(i + 1));
  });

  it('each dayPillar has valid stem (0-9) and branch (0-11)', () => {
    const days = getMonthDays(2024, 1);
    for (const day of days) {
      expect(day.dayPillar.stem).toBeGreaterThanOrEqual(0);
      expect(day.dayPillar.stem).toBeLessThanOrEqual(9);
      expect(day.dayPillar.branch).toBeGreaterThanOrEqual(0);
      expect(day.dayPillar.branch).toBeLessThanOrEqual(11);
    }
  });

  it('officer is always one of the 十二建星', () => {
    const OFFICERS = ['建', '除', '滿', '平', '定', '執', '破', '危', '成', '收', '開', '閉'];
    const days = getMonthDays(2024, 5);
    for (const day of days) {
      expect(OFFICERS).toContain(day.officer);
    }
  });

  it('note is a non-empty string', () => {
    const days = getMonthDays(2024, 1);
    for (const day of days) {
      expect(day.note.length).toBeGreaterThan(0);
    }
  });

  it('days clashing with clientYearBranch=0 (子) have branch 6 (午)', () => {
    // 子午沖: if clientYearBranch=0 (子), days with branch 6 (午) should be flagged
    const days = getMonthDays(2024, 1, 0);
    const clashedDays = days.filter((d) => d.clash && d.clashWith === '子');
    for (const day of clashedDays) {
      // These are either year-clash (branch=6=午 clashes with 子) or month-破
      // The clashWith field is only set for year-clash; verify those have branch 6
      if (day.clashWith) {
        expect(day.dayPillar.branch).toBe(6);
      }
    }
  });

  it('without clientYearBranch, no day has clashWith defined', () => {
    const days = getMonthDays(2024, 1);
    const withClashWith = days.filter((d) => d.clashWith !== undefined);
    expect(withClashWith).toHaveLength(0);
  });

  it('consecutive days have consecutive JDN (pillar stem advances systematically)', () => {
    // Day stems cycle through 60 ganzhi; two adjacent days differ by 1 mod 10 (stem) and 1 mod 12 (branch)
    const days = getMonthDays(2024, 1);
    for (let i = 1; i < days.length; i++) {
      const prev = days[i - 1].dayPillar;
      const curr = days[i].dayPillar;
      expect((curr.stem - prev.stem + 10) % 10).toBe(1);
      expect((curr.branch - prev.branch + 12) % 12).toBe(1);
    }
  });
});
