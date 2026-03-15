/**
 * Qi Men Dun Jia (奇門遁甲) calculation tests.
 *
 * Reference anchors used:
 *  - 2026-03-10 is in 驚蟄 (term 5 from 冬至), 陽遁
 *  - 2025-07-15 is in 小暑 (term 13 from 冬至), 陰遁
 *  - Year 2026: ganzhi index 42, 42%3=0 → 上元
 *  - Year 2025: ganzhi index 41, 41%3=2 → 下元
 */

import { describe, it, expect } from 'vitest';
import {
  calculateQiMen,
  calculateQiMenDay,
  calculateQiMenYear,
  hourBranchFromHour,
  hourStemFromDayStem,
} from '../../src/lib/qimen';
import {
  YANG_JU_TABLE,
  YIN_JU_TABLE,
  SOLAR_TERM_NAMES,
  QIMEN_STARS,
  QIMEN_DOORS,
} from '../../src/types/qimen';

function expectValidChart(chart: ReturnType<typeof calculateQiMen>) {
  expect(chart.palaces).toHaveLength(9);
  const palaceNums = chart.palaces.map((p) => p.palace).sort((a, b) => a - b);
  expect(palaceNums).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  expect(chart.ju).toBeGreaterThanOrEqual(1);
  expect(chart.ju).toBeLessThanOrEqual(9);
  expect(['陽遁', '陰遁']).toContain(chart.dun);
  expect(['上元', '中元', '下元']).toContain(chart.yuan);
  const dutyStars = chart.palaces.filter((p) => p.isDutyStar);
  const dutyDoors = chart.palaces.filter((p) => p.isDutyDoor);
  expect(dutyStars).toHaveLength(1);
  expect(dutyDoors).toHaveLength(1);
  expect(dutyStars[0].palace).toBe(chart.dutyStarPalace);
  expect(dutyDoors[0].palace).toBe(chart.dutyDoorPalace);
}

// ---- hourBranchFromHour ----

describe('hourBranchFromHour', () => {
  it('子時: hour 23 → branch 0', () => expect(hourBranchFromHour(23)).toBe(0));
  it('子時: hour 0 → branch 0', () => expect(hourBranchFromHour(0)).toBe(0));
  it('丑時: hour 1 → branch 1', () => expect(hourBranchFromHour(1)).toBe(1));
  it('丑時: hour 2 → branch 1', () => expect(hourBranchFromHour(2)).toBe(1));
  it('午時: hour 11 → branch 6', () => expect(hourBranchFromHour(11)).toBe(6));
  it('午時: hour 12 → branch 6', () => expect(hourBranchFromHour(12)).toBe(6));
  it('亥時: hour 21 → branch 11', () => expect(hourBranchFromHour(21)).toBe(11));
  it('亥時: hour 22 → branch 11', () => expect(hourBranchFromHour(22)).toBe(11));
  it('returns values 0-11 for all hours', () => {
    for (let h = 0; h < 24; h++) {
      const b = hourBranchFromHour(h);
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThanOrEqual(11);
    }
  });
});

// ---- hourStemFromDayStem ----

describe('hourStemFromDayStem', () => {
  // 五鼠遁時法: 甲(0)/己(5) day → 子時 starts with 甲(0)
  it('甲日 子時 → 甲(0)', () => expect(hourStemFromDayStem(0, 0)).toBe(0));
  it('甲日 丑時 → 乙(1)', () => expect(hourStemFromDayStem(0, 1)).toBe(1));
  it('甲日 子時 = 己日 子時 → 甲(0)', () => expect(hourStemFromDayStem(5, 0)).toBe(0));

  // 乙(1)/庚(6) day → 子時 starts with 丙(2)
  it('乙日 子時 → 丙(2)', () => expect(hourStemFromDayStem(1, 0)).toBe(2));
  it('庚日 子時 → 丙(2)', () => expect(hourStemFromDayStem(6, 0)).toBe(2));

  // 丙(2)/辛(7) day → 子時 starts with 戊(4)
  it('丙日 子時 → 戊(4)', () => expect(hourStemFromDayStem(2, 0)).toBe(4));

  // 丁(3)/壬(8) day → 子時 starts with 庚(6)
  it('壬日 子時 → 庚(6)', () => expect(hourStemFromDayStem(8, 0)).toBe(6));

  // 戊(4)/癸(9) day → 子時 starts with 壬(8)
  it('癸日 子時 → 壬(8)', () => expect(hourStemFromDayStem(9, 0)).toBe(8));
  it('戊日 子時 → 壬(8)', () => expect(hourStemFromDayStem(4, 0)).toBe(8));

  it('returns values 0-9 for all combinations', () => {
    for (let d = 0; d <= 9; d++) {
      for (let b = 0; b <= 11; b++) {
        const s = hourStemFromDayStem(d, b);
        expect(s).toBeGreaterThanOrEqual(0);
        expect(s).toBeLessThanOrEqual(9);
      }
    }
  });
});

// ---- calculateQiMen structural tests ----

describe('calculateQiMen — structure', () => {
  const dt = { year: 2026, month: 3, day: 10, hour: 10, minute: 0 };
  const chart = calculateQiMen(dt);

  it('dun is 陽遁 or 陰遁', () => {
    expect(['陽遁', '陰遁']).toContain(chart.dun);
  });

  it('ju is 1–9', () => {
    expect(chart.ju).toBeGreaterThanOrEqual(1);
    expect(chart.ju).toBeLessThanOrEqual(9);
  });

  it('yuan is 上元/中元/下元', () => {
    expect(['上元', '中元', '下元']).toContain(chart.yuan);
  });

  it('solarTermName is one of the 24 solar terms', () => {
    expect(SOLAR_TERM_NAMES).toContain(chart.solarTermName);
  });

  it('pillar full strings are length 2 (stem + branch)', () => {
    for (const p of [chart.pillarYear, chart.pillarMonth, chart.pillarDay, chart.pillarHour]) {
      expect(p.full).toHaveLength(2);
      expect(p.stem).toHaveLength(1);
      expect(p.branch).toHaveLength(1);
    }
  });

  it('xunShou is one of the six 旬首', () => {
    const XUN = ['甲子', '甲戌', '甲申', '甲午', '甲辰', '甲寅'];
    expect(XUN).toContain(chart.xunShou);
  });

  it('dutyStar is a valid 九星', () => {
    const validStars = Object.values(QIMEN_STARS);
    expect(validStars).toContain(chart.dutyStar);
  });

  it('dutyDoor is a valid 八門', () => {
    const validDoors = Object.values(QIMEN_DOORS).filter(Boolean) as string[];
    expect(validDoors).toContain(chart.dutyDoor);
  });

  it('dutyStarPalace is 1–9', () => {
    expect(chart.dutyStarPalace).toBeGreaterThanOrEqual(1);
    expect(chart.dutyStarPalace).toBeLessThanOrEqual(9);
  });

  it('dutyDoorPalace is 1–9 (not center)', () => {
    expect(chart.dutyDoorPalace).toBeGreaterThanOrEqual(1);
    expect(chart.dutyDoorPalace).toBeLessThanOrEqual(9);
    expect(chart.dutyDoorPalace).not.toBe(5);
  });

  it('palaces array has exactly 9 entries', () => {
    expect(chart.palaces).toHaveLength(9);
  });

  it('palaces are numbered 1–9', () => {
    const nums = chart.palaces.map((p) => p.palace).sort((a, b) => a - b);
    expect(nums).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
});

// ---- calculateQiMen — palace content ----

describe('calculateQiMen — palace content', () => {
  const dt = { year: 2026, month: 3, day: 10, hour: 10, minute: 0 };
  const chart = calculateQiMen(dt);

  it('each palace has a valid star', () => {
    const validStars = Object.values(QIMEN_STARS);
    for (const p of chart.palaces) {
      expect(validStars).toContain(p.star);
    }
  });

  it('each non-center palace has a valid door', () => {
    const validDoors = Object.values(QIMEN_DOORS).filter(Boolean) as string[];
    for (const p of chart.palaces) {
      if (!p.isCenter) {
        expect(validDoors).toContain(p.door);
      }
    }
  });

  it('center palace (5) has no door and no deity', () => {
    const center = chart.palaces.find((p) => p.palace === 5)!;
    expect(center.isCenter).toBe(true);
    expect(center.door).toBeNull();
    expect(center.deity).toBeNull();
  });

  it('each non-center palace has a valid deity', () => {
    const allDeities = ['值符', '螣蛇', '太陰', '六合', '白虎', '勾陳', '玄武', '九地', '九天'];
    for (const p of chart.palaces) {
      if (!p.isCenter) {
        expect(p.deity).not.toBeNull();
        expect(allDeities).toContain(p.deity!);
      }
    }
  });

  it('all 9 stars appear exactly once across the palaces', () => {
    const stars = chart.palaces.map((p) => p.star).sort();
    const expected = Object.values(QIMEN_STARS).sort();
    expect(stars).toEqual(expected);
  });

  it('all 8 doors appear exactly once among non-center palaces', () => {
    const doors = chart.palaces
      .filter((p) => !p.isCenter && p.door !== null)
      .map((p) => p.door!)
      .sort();
    const expected = Object.values(QIMEN_DOORS).filter(Boolean).sort() as string[];
    expect(doors).toEqual(expected);
  });

  it('all 8 deities appear exactly once among non-center palaces', () => {
    const deities = chart.palaces
      .filter((p) => !p.isCenter)
      .map((p) => p.deity!)
      .sort();
    expect(deities).toHaveLength(8);
    // Each deity appears exactly once
    const uniqueDeities = new Set(deities);
    expect(uniqueDeities.size).toBe(8);
  });

  it('each palace has a non-empty earthStem and heavenStem', () => {
    for (const p of chart.palaces) {
      expect(p.earthStem.length).toBeGreaterThan(0);
      expect(p.heavenStem.length).toBeGreaterThan(0);
    }
  });

  it('exactly one palace is marked isDutyStar', () => {
    const count = chart.palaces.filter((p) => p.isDutyStar).length;
    expect(count).toBe(1);
  });

  it('exactly one palace is marked isDutyDoor', () => {
    const count = chart.palaces.filter((p) => p.isDutyDoor).length;
    expect(count).toBe(1);
  });

  it('dutyStar palace number matches chart.dutyStarPalace', () => {
    const p = chart.palaces.find((x) => x.isDutyStar)!;
    expect(p.palace).toBe(chart.dutyStarPalace);
  });

  it('dutyDoor palace number matches chart.dutyDoorPalace', () => {
    const p = chart.palaces.find((x) => x.isDutyDoor)!;
    expect(p.palace).toBe(chart.dutyDoorPalace);
  });
});

// ---- calculateQiMen — 陰/陽遁 assignment ----

describe('calculateQiMen — dun type', () => {
  it('March date (spring) → 陽遁', () => {
    const chart = calculateQiMen({ year: 2026, month: 3, day: 10, hour: 12, minute: 0 });
    expect(chart.dun).toBe('陽遁');
  });

  it('July date (summer) → 陰遁', () => {
    const chart = calculateQiMen({ year: 2025, month: 7, day: 15, hour: 12, minute: 0 });
    expect(chart.dun).toBe('陰遁');
  });

  it('January date (winter, pre-冬至 area) → 陽遁', () => {
    // January is past 冬至 (Dec), so it's in the 陽遁 portion
    const chart = calculateQiMen({ year: 2026, month: 1, day: 15, hour: 12, minute: 0 });
    expect(chart.dun).toBe('陽遁');
  });

  it('October date (autumn) → 陰遁', () => {
    const chart = calculateQiMen({ year: 2025, month: 10, day: 10, hour: 12, minute: 0 });
    expect(chart.dun).toBe('陰遁');
  });
});

// ---- calculateQiMen — 局數 validation ----

describe('calculateQiMen — ju number', () => {
  it('ju is stable across hours of the same Chinese day (hours 0–22)', () => {
    // Exclude hour 23: that is 子時 of the NEXT Chinese day (different day ganzhi)
    // The ju depends on the pentad of the day, so hours within the same Chinese day
    // (0:00–22:59) should all yield the same ju.
    const hours = [0, 6, 12, 18, 22];
    const jus = hours.map(
      (h) => calculateQiMen({ year: 2026, month: 3, day: 10, hour: h, minute: 0 }).ju,
    );
    const unique = new Set(jus);
    expect(unique.size).toBe(1);
  });

  it('陽遁 ju is in range 1–9', () => {
    const months = [1, 2, 3, 4, 5, 6];
    for (const month of months) {
      const chart = calculateQiMen({ year: 2026, month, day: 10, hour: 12, minute: 0 });
      if (chart.dun === '陽遁') {
        expect(chart.ju).toBeGreaterThanOrEqual(1);
        expect(chart.ju).toBeLessThanOrEqual(9);
      }
    }
  });

  it('陰遁 ju is in range 1–9', () => {
    const months = [7, 8, 9, 10, 11, 12];
    for (const month of months) {
      const chart = calculateQiMen({ year: 2025, month, day: 10, hour: 12, minute: 0 });
      if (chart.dun === '陰遁') {
        expect(chart.ju).toBeGreaterThanOrEqual(1);
        expect(chart.ju).toBeLessThanOrEqual(9);
      }
    }
  });
});

// ---- 旬首 correctness ----

describe('calculateQiMen — 旬首 (xunShou)', () => {
  it('xunShou starts with 甲', () => {
    const chart = calculateQiMen({ year: 2026, month: 3, day: 10, hour: 12, minute: 0 });
    expect(chart.xunShou[0]).toBe('甲');
  });

  it('xunShou is stable across hours of the same day', () => {
    // 旬首 depends only on the day ganzhi index, not the hour
    const hours = [0, 6, 12, 18, 23];
    const xuns = hours.map(
      (h) => calculateQiMen({ year: 2026, month: 3, day: 10, hour: h, minute: 0 }).xunShou,
    );
    const unique = new Set(xuns);
    expect(unique.size).toBe(1);
  });

  it('different months can produce different 旬首', () => {
    const charts = [1, 4, 7, 10].map((m) =>
      calculateQiMen({ year: 2026, month: m, day: 15, hour: 12, minute: 0 }),
    );
    const xuns = charts.map((c) => c.xunShou);
    // Not all should be the same
    const unique = new Set(xuns);
    expect(unique.size).toBeGreaterThan(1);
  });
});

// ---- YANG_JU_TABLE and YIN_JU_TABLE invariants ----

describe('ju tables structure', () => {
  it('YANG_JU_TABLE has 12 rows (one per 陽遁 solar term)', () => {
    expect(YANG_JU_TABLE).toHaveLength(12);
  });

  it('YIN_JU_TABLE has 12 rows (one per 陰遁 solar term)', () => {
    expect(YIN_JU_TABLE).toHaveLength(12);
  });

  it('all ju values in YANG_JU_TABLE are 1–9', () => {
    for (const row of YANG_JU_TABLE) {
      for (const ju of row) {
        expect(ju).toBeGreaterThanOrEqual(1);
        expect(ju).toBeLessThanOrEqual(9);
      }
    }
  });

  it('all ju values in YIN_JU_TABLE are 1–9', () => {
    for (const row of YIN_JU_TABLE) {
      for (const ju of row) {
        expect(ju).toBeGreaterThanOrEqual(1);
        expect(ju).toBeLessThanOrEqual(9);
      }
    }
  });

  it('each row in YANG_JU_TABLE has 3 distinct values', () => {
    for (const row of YANG_JU_TABLE) {
      const unique = new Set(row);
      expect(unique.size).toBe(3);
    }
  });

  it('each row in YIN_JU_TABLE has 3 distinct values', () => {
    for (const row of YIN_JU_TABLE) {
      const unique = new Set(row);
      expect(unique.size).toBe(3);
    }
  });
});

// ── calculateQiMenDay (日盤) ───────────────────────────────────────────────

describe('calculateQiMenDay (日盤)', () => {
  it('produces a valid chart for 2024-03-20', () => {
    expectValidChart(calculateQiMenDay({ year: 2024, month: 3, day: 20 }));
  });

  it('summer date → 陰遁', () => {
    const chart = calculateQiMenDay({ year: 2024, month: 8, day: 1 });
    expectValidChart(chart);
    expect(chart.dun).toBe('陰遁');
  });

  it('winter date → 陽遁', () => {
    const chart = calculateQiMenDay({ year: 2024, month: 1, day: 10 });
    expectValidChart(chart);
    expect(chart.dun).toBe('陽遁');
  });

  it('datetime.hour=0, datetime.minute=0', () => {
    const chart = calculateQiMenDay({ year: 2024, month: 5, day: 10 });
    expect(chart.datetime.hour).toBe(0);
    expect(chart.datetime.minute).toBe(0);
  });

  it('shares xunShou and day pillar with 時盤 of the same date', () => {
    const dt = { year: 2024, month: 9, day: 15 };
    const dayChart = calculateQiMenDay(dt);
    const hourChart = calculateQiMen({ ...dt, hour: 6, minute: 0 });
    expect(dayChart.xunShou).toBe(hourChart.xunShou);
    expect(dayChart.pillarDay.full).toBe(hourChart.pillarDay.full);
  });

  it('all 9 stars appear exactly once', () => {
    const chart = calculateQiMenDay({ year: 2024, month: 6, day: 15 });
    const stars = chart.palaces.map((p) => p.star).sort();
    expect(stars).toEqual(Object.values(QIMEN_STARS).sort());
  });

  it('all 8 doors appear exactly once among non-center palaces', () => {
    const chart = calculateQiMenDay({ year: 2024, month: 6, day: 15 });
    const doors = chart.palaces
      .filter((p) => !p.isCenter)
      .map((p) => p.door!)
      .sort();
    const expected = Object.values(QIMEN_DOORS).filter(Boolean).sort() as string[];
    expect(doors).toEqual(expected);
  });

  it('works for year-end boundary date', () => {
    expectValidChart(calculateQiMenDay({ year: 2024, month: 12, day: 31 }));
  });
});

// ── calculateQiMenYear (年盤) ──────────────────────────────────────────────

describe('calculateQiMenYear (年盤)', () => {
  it('produces a valid chart for 2024', () => {
    expectValidChart(calculateQiMenYear(2024));
  });

  it('is always 陽遁', () => {
    for (const year of [2020, 2021, 2022, 2023, 2024, 2025, 2026]) {
      expect(calculateQiMenYear(year).dun).toBe('陽遁');
    }
  });

  it('solarTermName is 冬至', () => {
    expect(calculateQiMenYear(2024).solarTermName).toBe('冬至');
  });

  it('datetime.month=12, datetime.day=22', () => {
    const chart = calculateQiMenYear(2024);
    expect(chart.datetime.month).toBe(12);
    expect(chart.datetime.day).toBe(22);
  });

  it('different years have different year pillars', () => {
    const y1 = calculateQiMenYear(2024).pillarYear.full;
    const y2 = calculateQiMenYear(2025).pillarYear.full;
    expect(y1).not.toBe(y2);
  });

  it('year pillar is 2 characters', () => {
    expect(calculateQiMenYear(2024).pillarYear.full).toHaveLength(2);
  });

  it('all 9 stars appear exactly once', () => {
    const chart = calculateQiMenYear(2024);
    const stars = chart.palaces.map((p) => p.star).sort();
    expect(stars).toEqual(Object.values(QIMEN_STARS).sort());
  });

  it('year pillar matches 時盤 year pillar for same year', () => {
    const yearChart = calculateQiMenYear(2024);
    const hourChart = calculateQiMen({ year: 2024, month: 6, day: 15, hour: 10, minute: 0 });
    expect(yearChart.pillarYear.full).toBe(hourChart.pillarYear.full);
  });

  it('xunShou starts with 甲', () => {
    for (const year of [2020, 2024, 2025, 2026]) {
      expect(calculateQiMenYear(year).xunShou[0]).toBe('甲');
    }
  });
});
