import { BadRequestException } from '@nestjs/common';
import {
  businessDate,
  clampedBusinessDate,
  getMonthDateRange,
  parseLocalDate,
  getCalendarDayParts,
  isValidCalendarDateString,
  getBusinessDayRange,
} from './date.util';
describe('business dates (independent of process TZ)', () => {
  it('uses Buenos Aires month/day boundaries', () => {
    expect(getMonthDateRange(2026, 3)).toEqual({
      startDate: new Date('2026-03-01T03:00:00Z'),
      endDate: new Date('2026-04-01T03:00:00Z'),
    });
    expect(getCalendarDayParts(new Date('2026-01-26T01:00:00Z'))).toEqual({
      year: 2026,
      monthIndex: 0,
      day: 25,
    });
    expect(getMonthDateRange(2026, 0).startDate.toISOString()).toBe(
      '2025-12-01T03:00:00.000Z',
    );
  });
  it('distinguishes a calendar day from an instant and rejects overflow', () => {
    expect(parseLocalDate('2026-09-24').toISOString()).toBe(
      '2026-09-24T15:00:00.000Z',
    );
    expect(parseLocalDate('2026-01-26T01:00:00Z').toISOString()).toBe(
      '2026-01-26T01:00:00.000Z',
    );
    for (const bad of [
      '2026-02-31',
      '2026-01-00',
      '2026-13-01',
      '2026-01-26T12:00:00',
      'not-a-date',
    ])
      expect(() => parseLocalDate(bad)).toThrow(BadRequestException);
    expect(isValidCalendarDateString('2024-02-29')).toBe(true);
    expect(isValidCalendarDateString('2026-02-29')).toBe(false);
    expect(clampedBusinessDate(2026, 1, 31).toISOString()).toBe(
      '2026-02-28T15:00:00.000Z',
    );
  });
  it('queries a half-open local day across month/year boundaries', () => {
    expect(getBusinessDayRange(new Date('2026-01-01T01:00:00Z'))).toEqual({
      dateKey: '2025-12-31',
      startOfDay: new Date('2025-12-31T03:00:00Z'),
      endOfDay: new Date('2026-01-01T03:00:00Z'),
    });
    expect(businessDate(2024, 1, 29).toISOString()).toBe(
      '2024-02-29T15:00:00.000Z',
    );
  });
});
