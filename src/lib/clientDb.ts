import type { ClientRecord } from '../types/client';

const STORAGE_KEY = 'momo_clients';

export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function getAllClients(): ClientRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ClientRecord[];
  } catch {
    return [];
  }
}

export function saveClient(client: ClientRecord): void {
  const clients = getAllClients();
  const idx = clients.findIndex((c) => c.id === client.id);
  if (idx >= 0) {
    clients[idx] = client;
  } else {
    clients.push(client);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
}

export function deleteClient(id: string): void {
  const clients = getAllClients().filter((c) => c.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
}
