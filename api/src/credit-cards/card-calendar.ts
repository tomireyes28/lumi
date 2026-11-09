import {
  businessDate,
  clampedBusinessDate,
  getCalendarDayParts,
  storedCalendarParts,
} from '../utils/date.util';
export interface CycleReference {
  year: number;
  month: number;
  closingDate: Date | string;
  dueDate?: Date | string | null;
}
export interface CardCalendar {
  closingDay: number;
  dueDay?: number;
  cycles?: readonly CycleReference[];
}
function calendarDate(value: Date | string): Date {
  const p = storedCalendarParts(new Date(value));
  return businessDate(p.year, p.monthIndex, p.day);
}
function boundaryAfter(date: Date): Date {
  const p = getCalendarDayParts(date);
  const next = new Date(Date.UTC(p.year, p.monthIndex, p.day + 1));
  return businessDate(
    next.getUTCFullYear(),
    next.getUTCMonth(),
    next.getUTCDate(),
    0,
  );
}
export function cycleForPeriod(
  card: CardCalendar,
  year: number,
  month: number,
) {
  const first = businessDate(year, month - 1, 1);
  const period = getCalendarDayParts(first);
  year = period.year;
  month = period.monthIndex + 1;
  const custom = card.cycles?.find((c) => c.year === year && c.month === month);
  const closingDate = custom
    ? calendarDate(custom.closingDate)
    : clampedBusinessDate(year, month - 1, card.closingDay);
  let dueDate: Date | null = custom?.dueDate
    ? calendarDate(custom.dueDate)
    : null;
  if (!dueDate && card.dueDay) {
    dueDate = clampedBusinessDate(year, month - 1, card.dueDay);
    if (dueDate <= closingDate)
      dueDate = clampedBusinessDate(year, month, card.dueDay);
  }
  const cycleEnd = new Date(boundaryAfter(closingDate).getTime() - 1);
  return { year, month, closingDate, dueDate, cycleEnd, isCustom: !!custom };
}
export function cycleForPurchase(card: CardCalendar, reference: Date) {
  const p = getCalendarDayParts(reference);
  const current = cycleForPeriod(card, p.year, p.monthIndex + 1);
  return reference <= current.cycleEnd
    ? current
    : cycleForPeriod(card, p.year, p.monthIndex + 2);
}
export function activeCardCycle(card: CardCalendar, reference: Date) {
  const cycle = cycleForPurchase(card, reference);
  const previous = cycleForPeriod(card, cycle.year, cycle.month - 1);
  const start = new Date(previous.cycleEnd.getTime() + 1);
  const a = getCalendarDayParts(reference),
    b = getCalendarDayParts(cycle.closingDate);
  return {
    ...cycle,
    cycleStart: start,
    daysToClose: Math.max(
      0,
      Math.round(
        (Date.UTC(b.year, b.monthIndex, b.day) -
          Date.UTC(a.year, a.monthIndex, a.day)) /
          86400000,
      ),
    ),
  };
}
