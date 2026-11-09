import { BadRequestException } from '@nestjs/common';
export const BUSINESS_TIMEZONE = 'America/Argentina/Buenos_Aires';
const formatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: BUSINESS_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});
export function getCalendarDayParts(date: Date): {
  year: number;
  monthIndex: number;
  day: number;
} {
  if (!Number.isFinite(date.getTime()))
    throw new BadRequestException('Fecha inválida.');
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((p) => [p.type, p.value]),
  );
  return {
    year: Number(parts.year),
    monthIndex: Number(parts.month) - 1,
    day: Number(parts.day),
  };
}
export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}
export function businessDate(
  year: number,
  monthIndex: number,
  day: number,
  hour = 12,
  minute = 0,
  second = 0,
  ms = 0,
): Date {
  const normalized = new Date(Date.UTC(year, monthIndex, 1));
  year = normalized.getUTCFullYear();
  monthIndex = normalized.getUTCMonth();
  if (!Number.isInteger(day) || day < 1 || day > daysInMonth(year, monthIndex))
    throw new BadRequestException('Fecha calendario inválida.');
  const wall = Date.UTC(year, monthIndex, day, hour, minute, second, ms);
  let candidate = wall;
  let previous = NaN;
  for (let i = 0; i < 5; i++) {
    const parts = Object.fromEntries(
      formatter
        .formatToParts(new Date(candidate))
        .map((p) => [p.type, p.value]),
    );
    const represented = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    );
    const offset =
      represented - (candidate - new Date(candidate).getUTCMilliseconds());
    const next = wall - offset;
    if (next === candidate) return new Date(candidate);
    if (next === previous) return new Date(Math.max(next, candidate));
    previous = candidate;
    candidate = next;
  }
  throw new BadRequestException('No se pudo resolver la fecha de negocio.');
}
export function clampedBusinessDate(
  year: number,
  monthIndex: number,
  day: number,
): Date {
  return businessDate(
    year,
    monthIndex,
    Math.min(Math.max(day, 1), daysInMonth(year, monthIndex)),
  );
}
export function getMonthDateRange(year: number, month: number) {
  return {
    startDate: businessDate(year, month - 1, 1, 0),
    endDate: businessDate(year, month, 1, 0),
  };
}
export function businessDateKey(date: Date): string {
  const p = getCalendarDayParts(date);
  return (
    String(p.year) +
    '-' +
    String(p.monthIndex + 1).padStart(2, '0') +
    '-' +
    String(p.day).padStart(2, '0')
  );
}
export function getBusinessDayRange(reference: Date = new Date()) {
  const p = getCalendarDayParts(reference);
  const next = new Date(Date.UTC(p.year, p.monthIndex, p.day + 1));
  return {
    dateKey: businessDateKey(reference),
    startOfDay: businessDate(p.year, p.monthIndex, p.day, 0),
    endOfDay: businessDate(
      next.getUTCFullYear(),
      next.getUTCMonth(),
      next.getUTCDate(),
      0,
    ),
  };
}
export function isValidCalendarDateString(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const match =
    /^(\d{4})-(\d{2})-(\d{2})(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2}))?$/.exec(
      value.trim(),
    );
  if (!match) return false;
  const y = Number(match[1]),
    m = Number(match[2]),
    d = Number(match[3]);
  return (
    y >= 1970 &&
    y <= 2100 &&
    m >= 1 &&
    m <= 12 &&
    d >= 1 &&
    d <= daysInMonth(y, m - 1) &&
    Number.isFinite(Date.parse(value.trim()))
  );
}
/** Date-only is a business calendar day (anchored at noon); ISO with offset is an instant. */
export function parseLocalDate(value: string | Date): Date {
  if (value instanceof Date) {
    if (!Number.isFinite(value.getTime()))
      throw new BadRequestException('Fecha inválida.');
    return new Date(value);
  }
  if (!isValidCalendarDateString(value))
    throw new BadRequestException('Fecha calendario inválida.');
  const text = value.trim();
  if (text.length === 10) {
    const [y, m, d] = text.split('-').map(Number);
    return businessDate(y, m - 1, d);
  }
  return new Date(text);
}
