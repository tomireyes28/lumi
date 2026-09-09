import { getMonthDateRange } from './date.util';

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
});
