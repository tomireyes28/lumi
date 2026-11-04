import { BadRequestException } from '@nestjs/common';
import {
  getMonthDateRange,
  parseLocalDate,
  getCalendarDayParts,
  isValidCalendarDateString,
} from './date.util';

describe('date.util', () => {
  it('should return start and end date of a given month', () => {
    const { startDate, endDate } = getMonthDateRange(2026, 3); // Marzo 2026

    expect(startDate.getFullYear()).toBe(2026);
    expect(startDate.getMonth()).toBe(2); // 0-indexed: 2 = Marzo
    expect(startDate.getDate()).toBe(1);

    expect(endDate.getFullYear()).toBe(2026);
    expect(endDate.getMonth()).toBe(3); // 3 = Abril
    expect(endDate.getDate()).toBe(1);
  });

  it('should parse YYYY-MM-DD strings at local noon without shifting day backwards in UTC-3', () => {
    const parsed = parseLocalDate('2026-09-24');
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(8); // Septiembre
    expect(parsed.getDate()).toBe(24);
    expect(parsed.getHours()).toBe(12);
  });

  it('should clamp overflow days in parseLocalDate and reject null/invalid strings', () => {
    const clamped = parseLocalDate('2026-02-31');
    expect(clamped.getFullYear()).toBe(2026);
    expect(clamped.getMonth()).toBe(1); // Febrero
    expect(clamped.getDate()).toBe(28);

    expect(() => parseLocalDate(null as unknown as string)).toThrow(BadRequestException);
    expect(() => parseLocalDate('not-a-date')).toThrow(BadRequestException);
  });

  it('should validate strict calendar date strings accurately', () => {
    expect(isValidCalendarDateString('2026-02-28')).toBe(true);
    expect(isValidCalendarDateString('2026-02-31')).toBe(false);
    expect(isValidCalendarDateString('not-a-date')).toBe(false);
  });

  it('should extract calendar day parts accurately from both UTC midnight and local noon dates', () => {
    const utcMidnight = new Date('2026-10-25T00:00:00.000Z');
    const partsUtc = getCalendarDayParts(utcMidnight);
    expect(partsUtc).toEqual({ year: 2026, monthIndex: 9, day: 25 });

    const localNoon = new Date(2026, 9, 25, 12, 0, 0);
    const partsLocal = getCalendarDayParts(localNoon);
    expect(partsLocal).toEqual({ year: 2026, monthIndex: 9, day: 25 });
  });
});
