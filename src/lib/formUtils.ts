/** Shared utilities for birth-data forms: timezones, DMS conversion, UTC conversion. */

export const TIMEZONES = [
  { label: 'GMT-12', value: -12 },
  { label: 'GMT-11', value: -11 },
  { label: 'GMT-10', value: -10 },
  { label: 'GMT-9', value: -9 },
  { label: 'GMT-8', value: -8 },
  { label: 'GMT-7', value: -7 },
  { label: 'GMT-6', value: -6 },
  { label: 'GMT-5', value: -5 },
  { label: 'GMT-4', value: -4 },
  { label: 'GMT-3', value: -3 },
  { label: 'GMT-2', value: -2 },
  { label: 'GMT-1', value: -1 },
  { label: 'GMT+0 (UTC)', value: 0 },
  { label: 'GMT+1', value: 1 },
  { label: 'GMT+2', value: 2 },
  { label: 'GMT+3', value: 3 },
  { label: 'GMT+4', value: 4 },
  { label: 'GMT+5', value: 5 },
  { label: 'GMT+5:30 (印度)', value: 5.5 },
  { label: 'GMT+6', value: 6 },
  { label: 'GMT+7', value: 7 },
  { label: 'GMT+8 (台灣/中國/香港)', value: 8 },
  { label: 'GMT+9 (日本/韓國)', value: 9 },
  { label: 'GMT+10', value: 10 },
  { label: 'GMT+11', value: 11 },
  { label: 'GMT+12', value: 12 },
] as const;

/** Convert decimal degrees to degrees + whole minutes. */
export function decimalToDMS(decimal: number): { deg: number; min: number } {
  const abs = Math.abs(decimal);
  return { deg: Math.floor(abs), min: Math.round((abs % 1) * 60) };
}

/** Convert DMS + direction to signed decimal degrees. */
export function dmsToDecimal(deg: number, min: number, dir: 'N' | 'S' | 'E' | 'W'): number {
  return (deg + min / 60) * (dir === 'S' || dir === 'W' ? -1 : 1);
}

/** Convert local date/time + timezone offset to UTC components. Returns null on parse failure. */
export function localToUtc(
  dateStr: string,
  timeStr: string,
  tzOffset: number,
): { year: number; month: number; day: number; hour: number; minute: number } | null {
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const [hourStr, minuteStr] = timeStr.split(':');
  const year0 = parseInt(yearStr, 10);
  const month0 = parseInt(monthStr, 10);
  const day0 = parseInt(dayStr, 10);
  const hour0 = parseInt(hourStr, 10);
  const minute0 = parseInt(minuteStr, 10);
  if ([year0, month0, day0, hour0, minute0].some(isNaN)) return null;

  const totalMinutes = hour0 * 60 + minute0 - Math.round(tzOffset * 60);
  let dayOffset = 0;
  if (totalMinutes < 0) dayOffset = -1;
  else if (totalMinutes >= 24 * 60) dayOffset = 1;
  const utcMinutes = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hour = Math.floor(utcMinutes / 60);
  const minute = utcMinutes % 60;

  if (dayOffset !== 0) {
    const d = new Date(year0, month0 - 1, day0 + dayOffset);
    return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(), hour, minute };
  }
  return { year: year0, month: month0, day: day0, hour, minute };
}
