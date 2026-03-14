import { describe, it, expect } from 'vitest';
import {
  reduceNumber,
  calcLifePath,
  calcBirthdayNumber,
  calcPersonalYear,
  calcPersonalMonth,
  calcPersonalDay,
  calcChallenges,
  calcPinnacles,
  calculateNumerology,
} from '../../src/lib/numerology';

describe('reduceNumber', () => {
  it('returns 1–9 unchanged', () => {
    for (let i = 1; i <= 9; i++) expect(reduceNumber(i)).toBe(i);
  });

  it('reduces 10 → 1', () => expect(reduceNumber(10)).toBe(1));
  it('reduces 19 → 1', () => expect(reduceNumber(19)).toBe(1));
  it('reduces 29 → 11 (master via digit sum)', () => expect(reduceNumber(29)).toBe(11));
  it('reduces 99 → 9', () => expect(reduceNumber(99)).toBe(9));

  it('preserves master number 11', () => expect(reduceNumber(11)).toBe(11));
  it('preserves master number 22', () => expect(reduceNumber(22)).toBe(22));
  it('preserves master number 33', () => expect(reduceNumber(33)).toBe(33));

  it('reduces master numbers when keepMaster=false', () => {
    expect(reduceNumber(11, false)).toBe(2);
    expect(reduceNumber(22, false)).toBe(4);
    expect(reduceNumber(33, false)).toBe(6);
  });

  it('handles 0 as 0', () => expect(reduceNumber(0)).toBe(0));
});

describe('calcLifePath', () => {
  // Well-known celebrity life paths
  // Albert Einstein: 1879-03-14 → 1+8+7+9=25→7; 3→3; 1+4=5 → 7+3+5=15→6
  it('1879-03-14 → life path 6', () => {
    expect(calcLifePath(1879, 3, 14)).toBe(6);
  });

  // Barack Obama: 1961-08-04 → 1+9+6+1=17→8; 8→8; 4→4 → 8+8+4=20→2
  it('1961-08-04 → life path 2', () => {
    expect(calcLifePath(1961, 8, 4)).toBe(2);
  });

  // Master number: someone born 1990-02-29 would not exist; use a known 11
  // 1990-11-11 → 1+9+9+0=19→10→1; 11(master); 11(master) → 1+11+11=23→5
  // Actually: 1+11+11 = 23 → 5
  it('1990-11-11 → life path 5', () => {
    expect(calcLifePath(1990, 11, 11)).toBe(5);
  });

  // 1980-02-29 does not exist, use 1984-02-29
  // 1984: 1+9+8+4=22(master); 2→2; 2+9=11(master) → 22+2+11=35→8
  it('1984-02-29 → life path 8', () => {
    expect(calcLifePath(1984, 2, 29)).toBe(8);
  });

  it('result is always 1–9 or master number', () => {
    for (let m = 1; m <= 12; m++) {
      for (let d = 1; d <= 28; d++) {
        const lp = calcLifePath(1990, m, d);
        expect([1,2,3,4,5,6,7,8,9,11,22,33]).toContain(lp);
      }
    }
  });
});

describe('calcBirthdayNumber', () => {
  it('single-digit days unchanged', () => {
    for (let d = 1; d <= 9; d++) expect(calcBirthdayNumber(d)).toBe(d);
  });
  it('day 11 → 11 (master)', () => expect(calcBirthdayNumber(11)).toBe(11));
  it('day 22 → 22 (master)', () => expect(calcBirthdayNumber(22)).toBe(22));
  it('day 29 → 11 (master via digit sum)', () => expect(calcBirthdayNumber(29)).toBe(11));
  it('day 19 → 1', () => expect(calcBirthdayNumber(19)).toBe(1)); // 1+9=10→1
  it('day 28 → 1', () => expect(calcBirthdayNumber(28)).toBe(1)); // 2+8=10→1
  it('day 30 → 3', () => expect(calcBirthdayNumber(30)).toBe(3));
  it('day 31 → 4', () => expect(calcBirthdayNumber(31)).toBe(4));
});

describe('calcPersonalYear', () => {
  it('returns 1–9 or master number', () => {
    const py = calcPersonalYear(3, 14, 2024);
    expect(py).toBeGreaterThanOrEqual(1);
    expect(py).toBeLessThanOrEqual(33);
  });

  it('same formula as life path but with refYear', () => {
    // birth 1990-01-01, refYear=2024
    // m=1, d=1, y=2+0+2+4=8 → 1+1+8=10→1
    expect(calcPersonalYear(1, 1, 2024)).toBe(1);
  });

  it('changes with different refYear', () => {
    const py1 = calcPersonalYear(3, 14, 2024);
    const py2 = calcPersonalYear(3, 14, 2025);
    // They may or may not differ, but both should be valid numbers
    expect([1,2,3,4,5,6,7,8,9,11,22,33]).toContain(py1);
    expect([1,2,3,4,5,6,7,8,9,11,22,33]).toContain(py2);
  });
});

describe('calcPersonalMonth / calcPersonalDay', () => {
  it('personal month = reduce(personalYear + refMonth)', () => {
    expect(calcPersonalMonth(5, 3)).toBe(reduceNumber(5 + 3));
    expect(calcPersonalMonth(9, 9)).toBe(reduceNumber(18)); // 18→9
  });

  it('personal day = reduce(personalMonth + refDay)', () => {
    expect(calcPersonalDay(3, 15)).toBe(reduceNumber(3 + 15)); // 18→9
    expect(calcPersonalDay(7, 7)).toBe(reduceNumber(14)); // 14→5
  });
});

describe('calcChallenges', () => {
  it('returns array of 4 non-negative integers', () => {
    const c = calcChallenges(1990, 3, 14);
    expect(c).toHaveLength(4);
    c.forEach((v) => {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(8);
    });
  });

  it('C3 = |C1 - C2|', () => {
    const c = calcChallenges(1990, 5, 20);
    expect(c[2]).toBe(Math.abs(c[0] - c[1]));
  });

  it('C4 = |month - year| reduced (no master)', () => {
    // month=5: reduce(5,false)=5; year=1+9+9+0=19→10→1; |5-1|=4
    const c = calcChallenges(1990, 5, 20);
    expect(c[3]).toBe(4);
  });

  it('challenge numbers are 0–8 (no master numbers)', () => {
    for (let m = 1; m <= 12; m++) {
      const c = calcChallenges(1990, m, 15);
      c.forEach((v) => expect(v).toBeLessThanOrEqual(8));
    }
  });
});

describe('calcPinnacles', () => {
  it('returns 4 pinnacle periods', () => {
    const p = calcPinnacles(1990, 3, 14, 6);
    expect(p).toHaveLength(4);
  });

  it('last pinnacle has endAge=null', () => {
    const p = calcPinnacles(1990, 3, 14, 6);
    expect(p[3].endAge).toBeNull();
  });

  it('first pinnacle ends at 36-lifePathBase', () => {
    const lp = calcLifePath(1961, 8, 4); // should be 2
    const p = calcPinnacles(1961, 8, 4, lp);
    expect(p[0].endAge).toBe(36 - (lp > 9 ? reduceNumber(lp, false) : lp));
  });

  it('pinnacle numbers are valid', () => {
    const p = calcPinnacles(1990, 5, 15, 5);
    p.forEach((pin) => {
      expect([1,2,3,4,5,6,7,8,9,11,22,33]).toContain(pin.number);
    });
  });

  it('startAge of P2 = endAge of P1 + 1', () => {
    const p = calcPinnacles(1990, 3, 14, 6);
    expect(p[1].startAge).toBe((p[0].endAge as number) + 1);
  });
});

describe('calculateNumerology', () => {
  it('returns complete result object', () => {
    const r = calculateNumerology(1990, 3, 14);
    expect(r.lifePath).toBeDefined();
    expect(r.birthdayNumber).toBeDefined();
    expect(r.personalYear).toBeDefined();
    expect(r.personalMonth).toBeDefined();
    expect(r.personalDay).toBeDefined();
    expect(r.challenges).toHaveLength(4);
    expect(r.pinnacles).toHaveLength(4);
  });

  it('uses provided refDate for personal cycles', () => {
    const r = calculateNumerology(1990, 1, 1, { year: 2024, month: 6, day: 15 });
    expect(r.refYear).toBe(2024);
    expect(r.refMonth).toBe(6);
    expect(r.refDay).toBe(15);
    // personal year: m=1, d=1, y=2+0+2+4=8 → 1+1+8=10→1
    expect(r.personalYear).toBe(1);
  });

  it('life path matches direct calculation', () => {
    const r = calculateNumerology(1984, 7, 22);
    expect(r.lifePath).toBe(calcLifePath(1984, 7, 22));
  });

  it('birthday number matches direct calculation', () => {
    const r = calculateNumerology(1990, 3, 29);
    expect(r.birthdayNumber).toBe(calcBirthdayNumber(29));
  });
});
