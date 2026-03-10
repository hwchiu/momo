import { describe, it, expect } from 'vitest';

import { parseJsonContent, parseCsvContent, exportToJson, exportToCsv } from '../../src/lib/clientImport';
import type { ClientRecord } from '../../src/types/client';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeClient(overrides: Partial<ClientRecord> = {}): ClientRecord {
  return {
    id: 'test-id',
    name: '測試',
    notes: '',
    tags: ['VIP'],
    createdAt: 1000,
    updatedAt: 1000,
    birthData: {
      year: 1990,
      month: 6,
      day: 15,
      hour: 12,
      minute: 30,
      tzOffset: 8,
      latitude: 25.05,
      longitude: 121.5,
      locationName: '台北市',
    },
    houseSystem: 'Alcabitius',
    analysisNotes: '測試備註',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// parseJsonContent
// ---------------------------------------------------------------------------

describe('parseJsonContent', () => {
  it('parses an array of flat client objects', () => {
    const json = JSON.stringify([
      {
        name: 'Alice',
        year: 1990,
        month: 1,
        day: 15,
        hour: 4,
        minute: 26,
        tzOffset: 8,
        locationName: '台北市',
        latitude: 25.05,
        longitude: 121.5,
        houseSystem: 'Placidus',
        tags: ['VIP'],
        analysisNotes: '',
      },
    ]);
    const records = parseJsonContent(json);
    expect(records).toHaveLength(1);
    expect(records[0].name).toBe('Alice');
    expect(records[0].birthData.year).toBe(1990);
    expect(records[0].birthData.locationName).toBe('台北市');
    expect(records[0].houseSystem).toBe('Placidus');
    expect(records[0].tags).toEqual(['VIP']);
  });

  it('parses a single object (not an array)', () => {
    const json = JSON.stringify({
      name: 'Bob',
      year: 2000,
      month: 3,
      day: 10,
      hour: 0,
      minute: 0,
      tzOffset: 8,
      locationName: '',
      latitude: 0,
      longitude: 0,
      houseSystem: 'WholeSign',
      tags: [],
      analysisNotes: '',
    });
    const records = parseJsonContent(json);
    expect(records).toHaveLength(1);
    expect(records[0].name).toBe('Bob');
  });

  it('parses nested birthData format (ClientRecord export format)', () => {
    const json = JSON.stringify([
      {
        id: 'abc',
        name: 'Carol',
        notes: '',
        tags: ['回訪'],
        createdAt: 1000,
        updatedAt: 1000,
        birthData: {
          year: 1985,
          month: 7,
          day: 20,
          hour: 9,
          minute: 15,
          tzOffset: 9,
          latitude: 35.68,
          longitude: 139.69,
          locationName: '東京',
        },
        houseSystem: 'Koch',
        analysisNotes: '好客戶',
      },
    ]);
    const records = parseJsonContent(json);
    expect(records).toHaveLength(1);
    expect(records[0].name).toBe('Carol');
    expect(records[0].birthData.year).toBe(1985);
    expect(records[0].birthData.locationName).toBe('東京');
    expect(records[0].tags).toEqual(['回訪']);
    expect(records[0].analysisNotes).toBe('好客戶');
    // Imported records always get a fresh id
    expect(records[0].id).not.toBe('abc');
  });

  it('skips entries with missing name', () => {
    const json = JSON.stringify([{ year: 1990, month: 1, day: 1 }]);
    expect(parseJsonContent(json)).toHaveLength(0);
  });

  it('skips entries with missing date', () => {
    const json = JSON.stringify([{ name: 'Dave', year: 0, month: 0, day: 0 }]);
    expect(parseJsonContent(json)).toHaveLength(0);
  });

  it('returns [] for invalid JSON', () => {
    expect(parseJsonContent('not json at all')).toHaveLength(0);
  });

  it('tags as a comma-separated string are split correctly', () => {
    const json = JSON.stringify([{ name: 'Eve', year: 1992, month: 4, day: 1, tags: 'A, B, C' }]);
    const records = parseJsonContent(json);
    expect(records[0].tags).toEqual(['A', 'B', 'C']);
  });
});

// ---------------------------------------------------------------------------
// parseCsvContent
// ---------------------------------------------------------------------------

describe('parseCsvContent', () => {
  const HEADER = 'name,year,month,day,hour,minute,tzOffset,locationName,latitude,longitude,houseSystem,tags,analysisNotes';

  it('parses a basic CSV row', () => {
    const csv = [HEADER, 'Alice,1990,1,15,4,26,8,台北市,25.05,121.5,Alcabitius,,'].join('\n');
    const records = parseCsvContent(csv);
    expect(records).toHaveLength(1);
    expect(records[0].name).toBe('Alice');
    expect(records[0].birthData.year).toBe(1990);
    expect(records[0].birthData.locationName).toBe('台北市');
  });

  it('handles quoted fields with commas', () => {
    const csv = [HEADER, 'Alice,1990,1,15,4,26,8,台北市,25.05,121.5,Alcabitius,"VIP,回訪",some notes'].join('\n');
    const records = parseCsvContent(csv);
    expect(records[0].tags).toEqual(['VIP', '回訪']);
  });

  it('handles quoted fields with escaped double-quotes', () => {
    const csv = [HEADER, 'Bob,2000,3,10,0,0,8,Tokyo,35.68,139.69,Koch,,"He said ""hello"""'].join('\n');
    const records = parseCsvContent(csv);
    expect(records[0].analysisNotes).toBe('He said "hello"');
  });

  it('skips rows with missing name', () => {
    const csv = [HEADER, ',1990,1,15,4,26,8,,0,0,Alcabitius,,'].join('\n');
    expect(parseCsvContent(csv)).toHaveLength(0);
  });

  it('returns [] for only a header row', () => {
    expect(parseCsvContent(HEADER)).toHaveLength(0);
  });

  it('returns [] for empty content', () => {
    expect(parseCsvContent('')).toHaveLength(0);
  });

  it('is case-insensitive for column headers', () => {
    const upperHeader = HEADER.toUpperCase();
    const csv = [upperHeader, 'Alice,1990,1,15,4,26,8,台北,25,121,Alcabitius,,'].join('\n');
    const records = parseCsvContent(csv);
    expect(records).toHaveLength(1);
    expect(records[0].name).toBe('Alice');
  });
});

// ---------------------------------------------------------------------------
// Export round-trip
// ---------------------------------------------------------------------------

describe('exportToJson / parseJsonContent round-trip', () => {
  it('exports and re-imports all fields', () => {
    const original = makeClient();
    const json = exportToJson([original]);
    const imported = parseJsonContent(json);
    expect(imported).toHaveLength(1);
    expect(imported[0].name).toBe(original.name);
    expect(imported[0].birthData).toEqual(original.birthData);
    expect(imported[0].houseSystem).toBe(original.houseSystem);
    expect(imported[0].tags).toEqual(original.tags);
    expect(imported[0].analysisNotes).toBe(original.analysisNotes);
  });
});

describe('exportToCsv / parseCsvContent round-trip', () => {
  it('exports and re-imports basic fields', () => {
    const original = makeClient({ tags: ['VIP'], analysisNotes: 'note' });
    const csv = exportToCsv([original]);
    const imported = parseCsvContent(csv);
    expect(imported).toHaveLength(1);
    expect(imported[0].name).toBe(original.name);
    expect(imported[0].birthData.year).toBe(original.birthData.year);
    expect(imported[0].birthData.locationName).toBe(original.birthData.locationName);
    expect(imported[0].houseSystem).toBe(original.houseSystem);
    expect(imported[0].tags).toEqual(original.tags);
    expect(imported[0].analysisNotes).toBe(original.analysisNotes);
  });

  it('handles a client with commas in notes', () => {
    const original = makeClient({ analysisNotes: 'note, with, commas' });
    const csv = exportToCsv([original]);
    const imported = parseCsvContent(csv);
    expect(imported[0].analysisNotes).toBe('note, with, commas');
  });

  it('handles multiple clients', () => {
    const clients = [makeClient({ name: 'A' }), makeClient({ name: 'B' })];
    const csv = exportToCsv(clients);
    const imported = parseCsvContent(csv);
    expect(imported).toHaveLength(2);
    expect(imported.map((c) => c.name)).toEqual(['A', 'B']);
  });
});
