import { describe, it, expect, beforeEach } from 'vitest';
import {
  createClient,
  updateClient,
  deleteClient,
  searchClients,
  sortClients,
  formatBirthDate,
  loadClients,
  saveClients,
} from '../../src/lib/crm';
import type { CRMClient } from '../../src/types/crm';

// ── fixtures ──────────────────────────────────────────────────────────────────

function makeClient(overrides: Partial<CRMClient> = {}): CRMClient {
  return {
    id: 'test-id-1',
    name: '王小明',
    birthYear: 1990,
    birthMonth: 3,
    birthDay: 14,
    birthHour: 10,
    birthMinute: 30,
    latitude: 25.05,
    longitude: 121.5,
    locationName: '台北市',
    notes: '測試備註',
    createdAt: 1000000,
    updatedAt: 1000000,
    ...overrides,
  };
}

const INPUT = {
  name: '林小花',
  birthYear: 1995,
  birthMonth: 7,
  birthDay: 22,
  birthHour: 14,
  birthMinute: 0,
  latitude: 22.63,
  longitude: 120.27,
  locationName: '高雄市',
  notes: '',
};

// ── createClient ──────────────────────────────────────────────────────────────

describe('createClient', () => {
  it('adds id, createdAt, updatedAt', () => {
    const c = createClient(INPUT);
    expect(c.id).toBeTruthy();
    expect(typeof c.createdAt).toBe('number');
    expect(typeof c.updatedAt).toBe('number');
    expect(c.createdAt).toBe(c.updatedAt);
  });

  it('preserves all input fields', () => {
    const c = createClient(INPUT);
    expect(c.name).toBe(INPUT.name);
    expect(c.birthYear).toBe(INPUT.birthYear);
    expect(c.birthMonth).toBe(INPUT.birthMonth);
    expect(c.birthDay).toBe(INPUT.birthDay);
    expect(c.birthHour).toBe(INPUT.birthHour);
    expect(c.birthMinute).toBe(INPUT.birthMinute);
    expect(c.latitude).toBe(INPUT.latitude);
    expect(c.longitude).toBe(INPUT.longitude);
    expect(c.locationName).toBe(INPUT.locationName);
    expect(c.notes).toBe(INPUT.notes);
  });

  it('generates unique ids for different clients', () => {
    const c1 = createClient(INPUT);
    const c2 = createClient(INPUT);
    expect(c1.id).not.toBe(c2.id);
  });
});

// ── updateClient ──────────────────────────────────────────────────────────────

describe('updateClient', () => {
  it('updates the correct client', () => {
    const c1 = makeClient({ id: 'a', name: '甲' });
    const c2 = makeClient({ id: 'b', name: '乙' });
    const result = updateClient([c1, c2], 'a', { ...INPUT, name: '甲改' });
    expect(result.find((c) => c.id === 'a')!.name).toBe('甲改');
    expect(result.find((c) => c.id === 'b')!.name).toBe('乙');
  });

  it('does not mutate original array', () => {
    const clients = [makeClient()];
    updateClient(clients, 'test-id-1', INPUT);
    expect(clients[0].name).toBe('王小明');
  });

  it('updates updatedAt', () => {
    const before = Date.now();
    const c = makeClient({ updatedAt: 0 });
    const result = updateClient([c], c.id, INPUT);
    expect(result[0].updatedAt).toBeGreaterThanOrEqual(before);
  });

  it('returns same length array', () => {
    const clients = [makeClient({ id: 'a' }), makeClient({ id: 'b' })];
    expect(updateClient(clients, 'a', INPUT)).toHaveLength(2);
  });

  it('no-op if id not found', () => {
    const clients = [makeClient()];
    const result = updateClient(clients, 'nonexistent', INPUT);
    expect(result[0].name).toBe('王小明');
  });
});

// ── deleteClient ──────────────────────────────────────────────────────────────

describe('deleteClient', () => {
  it('removes the client with matching id', () => {
    const c1 = makeClient({ id: 'a' });
    const c2 = makeClient({ id: 'b' });
    const result = deleteClient([c1, c2], 'a');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('b');
  });

  it('does not mutate original array', () => {
    const clients = [makeClient()];
    deleteClient(clients, clients[0].id);
    expect(clients).toHaveLength(1);
  });

  it('returns empty array when last client deleted', () => {
    const clients = [makeClient()];
    expect(deleteClient(clients, clients[0].id)).toHaveLength(0);
  });

  it('no-op if id not found', () => {
    const clients = [makeClient()];
    expect(deleteClient(clients, 'nonexistent')).toHaveLength(1);
  });
});

// ── searchClients ─────────────────────────────────────────────────────────────

describe('searchClients', () => {
  const clients = [
    makeClient({ id: '1', name: '王小明', locationName: '台北市', notes: '善良' }),
    makeClient({ id: '2', name: '李大華', locationName: '台中市', notes: '勤奮' }),
    makeClient({ id: '3', name: '張美玲', locationName: '高雄市', notes: '台北出生' }),
  ];

  it('empty query returns all', () => {
    expect(searchClients(clients, '')).toHaveLength(3);
  });

  it('whitespace-only query returns all', () => {
    expect(searchClients(clients, '   ')).toHaveLength(3);
  });

  it('matches by name', () => {
    const result = searchClients(clients, '王小明');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('matches by partial name', () => {
    expect(searchClients(clients, '明')).toHaveLength(1);
  });

  it('matches by locationName', () => {
    const result = searchClients(clients, '台中');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });

  it('matches by notes', () => {
    const result = searchClients(clients, '台北');
    // '台北市' in locationName (id=1) and '台北出生' in notes (id=3)
    expect(result.length).toBeGreaterThanOrEqual(2);
  });

  it('case-insensitive', () => {
    const english = [makeClient({ id: '1', name: 'Alice', locationName: 'Taipei', notes: '' })];
    expect(searchClients(english, 'alice')).toHaveLength(1);
  });

  it('returns empty when no match', () => {
    expect(searchClients(clients, 'zzznomatch')).toHaveLength(0);
  });
});

// ── sortClients ───────────────────────────────────────────────────────────────

describe('sortClients', () => {
  const clients = [
    makeClient({ id: 'a', name: '乙', createdAt: 200, updatedAt: 300 }),
    makeClient({ id: 'b', name: '甲', createdAt: 100, updatedAt: 100 }),
    makeClient({ id: 'c', name: '丙', createdAt: 300, updatedAt: 200 }),
  ];

  it('sorts by createdAt asc', () => {
    const r = sortClients(clients, 'createdAt', 'asc');
    expect(r.map((c) => c.id)).toEqual(['b', 'a', 'c']);
  });

  it('sorts by createdAt desc', () => {
    const r = sortClients(clients, 'createdAt', 'desc');
    expect(r.map((c) => c.id)).toEqual(['c', 'a', 'b']);
  });

  it('sorts by updatedAt asc', () => {
    const r = sortClients(clients, 'updatedAt', 'asc');
    expect(r.map((c) => c.id)).toEqual(['b', 'c', 'a']);
  });

  it('does not mutate original array', () => {
    sortClients(clients, 'createdAt', 'asc');
    expect(clients[0].id).toBe('a');
  });

  it('returns new array instance', () => {
    expect(sortClients(clients, 'name')).not.toBe(clients);
  });
});

// ── formatBirthDate ───────────────────────────────────────────────────────────

describe('formatBirthDate', () => {
  it('formats correctly', () => {
    const c = makeClient({ birthYear: 1990, birthMonth: 3, birthDay: 5, birthHour: 8, birthMinute: 5 });
    expect(formatBirthDate(c)).toBe('1990/03/05 08:05');
  });

  it('pads single-digit month and day', () => {
    const c = makeClient({ birthYear: 2000, birthMonth: 1, birthDay: 1, birthHour: 0, birthMinute: 0 });
    expect(formatBirthDate(c)).toBe('2000/01/01 00:00');
  });

  it('handles two-digit values', () => {
    const c = makeClient({ birthYear: 1985, birthMonth: 12, birthDay: 31, birthHour: 23, birthMinute: 59 });
    expect(formatBirthDate(c)).toBe('1985/12/31 23:59');
  });
});

// ── localStorage (loadClients / saveClients) ──────────────────────────────────

describe('loadClients / saveClients', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loadClients returns empty array when nothing stored', () => {
    expect(loadClients()).toEqual([]);
  });

  it('round-trips clients through localStorage', () => {
    const clients = [makeClient()];
    saveClients(clients);
    const loaded = loadClients();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].name).toBe('王小明');
  });

  it('loadClients returns empty array on corrupt data', () => {
    localStorage.setItem('momo-crm-clients', 'not-json{{{');
    expect(loadClients()).toEqual([]);
  });

  it('loadClients returns empty array when stored value is not an array', () => {
    localStorage.setItem('momo-crm-clients', JSON.stringify({ foo: 'bar' }));
    expect(loadClients()).toEqual([]);
  });

  it('saveClients overwrites previous data', () => {
    saveClients([makeClient({ name: '舊' })]);
    saveClients([makeClient({ name: '新' })]);
    expect(loadClients()[0].name).toBe('新');
  });

  it('saveClients persists multiple clients', () => {
    const clients = [
      makeClient({ id: 'a', name: '甲' }),
      makeClient({ id: 'b', name: '乙' }),
    ];
    saveClients(clients);
    expect(loadClients()).toHaveLength(2);
  });
});
