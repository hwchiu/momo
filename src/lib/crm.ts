/** CRM localStorage persistence layer */

import type { CRMClient, CRMClientInput } from '../types/crm';

const STORAGE_KEY = 'momo-crm-clients';

export function loadClients(): CRMClient[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveClients(clients: CRMClient[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
}

export function createClient(input: CRMClientInput): CRMClient {
  const now = Date.now();
  return {
    ...input,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
}

export function updateClient(clients: CRMClient[], id: string, input: CRMClientInput): CRMClient[] {
  return clients.map((c) =>
    c.id === id ? { ...c, ...input, updatedAt: Date.now() } : c,
  );
}

export function deleteClient(clients: CRMClient[], id: string): CRMClient[] {
  return clients.filter((c) => c.id !== id);
}

export function searchClients(clients: CRMClient[], query: string): CRMClient[] {
  if (!query.trim()) return clients;
  const q = query.trim().toLowerCase();
  return clients.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.locationName.toLowerCase().includes(q) ||
      c.notes.toLowerCase().includes(q),
  );
}

export function sortClients(
  clients: CRMClient[],
  by: 'name' | 'createdAt' | 'updatedAt',
  dir: 'asc' | 'desc' = 'asc',
): CRMClient[] {
  return [...clients].sort((a, b) => {
    let cmp = 0;
    if (by === 'name') cmp = a.name.localeCompare(b.name, 'zh-Hant');
    else cmp = a[by] - b[by];
    return dir === 'asc' ? cmp : -cmp;
  });
}

/** Format a birth date from a CRMClient for display */
export function formatBirthDate(c: CRMClient): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${c.birthYear}/${pad(c.birthMonth)}/${pad(c.birthDay)} ${pad(c.birthHour)}:${pad(c.birthMinute)}`;
}
