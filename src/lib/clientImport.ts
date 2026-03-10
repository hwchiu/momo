import type { ClientRecord } from '../types/client';
import { generateId } from './clientDb';

// CSV column order used for both export and import
const CSV_HEADERS = [
  'name',
  'year',
  'month',
  'day',
  'hour',
  'minute',
  'tzOffset',
  'locationName',
  'latitude',
  'longitude',
  'houseSystem',
  'tags',
  'analysisNotes',
] as const;

// ---------------------------------------------------------------------------
// CSV helpers
// ---------------------------------------------------------------------------

/** Parse a single CSV line that may contain quoted fields. */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped double-quote inside a quoted field
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

/** Escape a string value for CSV output (quote if necessary). */
function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

/**
 * Convert a raw plain-object (from JSON or CSV parsing) to a ClientRecord.
 * Returns null if the object is missing required fields.
 */
function buildClientRecord(raw: Record<string, unknown>): ClientRecord | null {
  const name = String(raw.name ?? '').trim();
  if (!name) return null;

  const year = parseInt(String(raw.year ?? ''), 10);
  const month = parseInt(String(raw.month ?? ''), 10);
  const day = parseInt(String(raw.day ?? ''), 10);
  if (!year || !month || !day) return null;

  const now = Date.now();

  // Tags can be a comma-separated string or an actual array
  let tags: string[] = [];
  if (Array.isArray(raw.tags)) {
    tags = (raw.tags as unknown[]).map(String).filter(Boolean);
  } else if (typeof raw.tags === 'string') {
    tags = raw.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
  }

  return {
    id: generateId(),
    name,
    notes: '',
    tags,
    createdAt: now,
    updatedAt: now,
    birthData: {
      year,
      month,
      day,
      hour: parseInt(String(raw.hour ?? '0'), 10) || 0,
      minute: parseInt(String(raw.minute ?? '0'), 10) || 0,
      tzOffset: parseFloat(String(raw.tzOffset ?? '8')) || 8,
      latitude: parseFloat(String(raw.latitude ?? '0')) || 0,
      longitude: parseFloat(String(raw.longitude ?? '0')) || 0,
      locationName: String(raw.locationName ?? ''),
    },
    houseSystem: String(raw.houseSystem ?? 'Alcabitius'),
    analysisNotes: String(raw.analysisNotes ?? ''),
  };
}

/** Parse a JSON file content (can be a single object or an array). */
export function parseJsonContent(content: string): ClientRecord[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return [];
  }

  const items = Array.isArray(parsed) ? parsed : [parsed];
  const records: ClientRecord[] = [];

  for (const item of items) {
    if (item && typeof item === 'object') {
      // Support both flat format and nested birthData format
      const raw = item as Record<string, unknown>;
      const flatRaw: Record<string, unknown> = { ...raw };
      if (raw.birthData && typeof raw.birthData === 'object') {
        const bd = raw.birthData as Record<string, unknown>;
        flatRaw.year = flatRaw.year ?? bd.year;
        flatRaw.month = flatRaw.month ?? bd.month;
        flatRaw.day = flatRaw.day ?? bd.day;
        flatRaw.hour = flatRaw.hour ?? bd.hour;
        flatRaw.minute = flatRaw.minute ?? bd.minute;
        flatRaw.tzOffset = flatRaw.tzOffset ?? bd.tzOffset;
        flatRaw.latitude = flatRaw.latitude ?? bd.latitude;
        flatRaw.longitude = flatRaw.longitude ?? bd.longitude;
        flatRaw.locationName = flatRaw.locationName ?? bd.locationName;
      }
      const record = buildClientRecord(flatRaw);
      if (record) records.push(record);
    }
  }
  return records;
}

/** Normalize a CSV column header to the camelCase key used by buildClientRecord. */
const CSV_HEADER_MAP: Record<string, string> = {
  name: 'name',
  year: 'year',
  month: 'month',
  day: 'day',
  hour: 'hour',
  minute: 'minute',
  tzoffset: 'tzOffset',
  locationname: 'locationName',
  latitude: 'latitude',
  longitude: 'longitude',
  housesystem: 'houseSystem',
  tags: 'tags',
  analysisnotes: 'analysisNotes',
};

/** Parse a CSV file content (first row must be a header row). */
export function parseCsvContent(content: string): ClientRecord[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headerLine = parseCsvLine(lines[0]);
  // Normalize headers: lowercase → canonical camelCase (fall back to the lowercase key)
  const headers = headerLine.map((h) => {
    const lower = h.trim().toLowerCase();
    return CSV_HEADER_MAP[lower] ?? lower;
  });
  const records: ClientRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const raw: Record<string, unknown> = {};
    headers.forEach((h, idx) => {
      raw[h] = values[idx] ?? '';
    });
    const record = buildClientRecord(raw);
    if (record) records.push(record);
  }
  return records;
}

/** Read a single File and return parsed ClientRecord[]. */
async function readFile(file: File): Promise<ClientRecord[]> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (!content) {
        resolve([]);
        return;
      }
      const name = file.name.toLowerCase();
      if (name.endsWith('.json')) {
        resolve(parseJsonContent(content));
      } else if (name.endsWith('.csv')) {
        resolve(parseCsvContent(content));
      } else {
        resolve([]);
      }
    };
    reader.onerror = () => resolve([]);
    reader.readAsText(file, 'utf-8');
  });
}

export interface ImportResult {
  imported: number;
  skipped: number;
  fileCount: number;
}

/**
 * Process a FileList (from either a file input or a directory input).
 * Only .json and .csv files are processed; all others are silently skipped.
 * Returns all parsed records and a summary.
 */
export async function importFromFiles(
  files: FileList,
): Promise<{ records: ClientRecord[]; result: ImportResult }> {
  const jsonCsvFiles = Array.from(files).filter(
    (f) => f.name.toLowerCase().endsWith('.json') || f.name.toLowerCase().endsWith('.csv'),
  );

  const allRecords: ClientRecord[] = [];
  for (const file of jsonCsvFiles) {
    const parsed = await readFile(file);
    allRecords.push(...parsed);
  }

  const skipped = allRecords.length === 0 && jsonCsvFiles.length === 0 ? files.length : 0;

  return {
    records: allRecords,
    result: {
      imported: allRecords.length,
      skipped,
      fileCount: jsonCsvFiles.length,
    },
  };
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

/** Serialise all client records as a pretty-printed JSON string. */
export function exportToJson(clients: ClientRecord[]): string {
  return JSON.stringify(clients, null, 2);
}

/** Serialise all client records as a CSV string. */
export function exportToCsv(clients: ClientRecord[]): string {
  const rows: string[] = [CSV_HEADERS.join(',')];
  for (const c of clients) {
    const row: string[] = [
      escapeCsvField(c.name),
      String(c.birthData.year),
      String(c.birthData.month),
      String(c.birthData.day),
      String(c.birthData.hour),
      String(c.birthData.minute),
      String(c.birthData.tzOffset ?? 8),
      escapeCsvField(c.birthData.locationName),
      String(c.birthData.latitude),
      String(c.birthData.longitude),
      escapeCsvField(c.houseSystem),
      escapeCsvField(c.tags.join(',')),
      escapeCsvField(c.analysisNotes),
    ];
    rows.push(row.join(','));
  }
  return rows.join('\n');
}

/** Trigger a browser download of the given content as a file. */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
