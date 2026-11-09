import {
  cycleForPurchase,
  cycleForPeriod,
  activeCardCycle,
} from './card-calendar';
import { InstallmentCalculator } from '../transactions/utils/installment-calculator.util';
import { parseLocalDate } from '../utils/date.util';
const card = {
  closingDay: 25,
  dueDay: 5,
  cycles: [
    { year: 2026, month: 2, closingDate: '2026-02-10', dueDate: '2026-03-07' },
  ],
};
describe('one shared card calendar', () => {
  it('assigns consecutive statements without collisions when a future closing moves earlier', () => {
    const plan = InstallmentCalculator.calculate({
      amount: 100,
      installments: 3,
      startDate: parseLocalDate('2026-01-20'),
      userId: 'u',
      categoryId: 'c',
      creditCardId: 'card',
      closingDay: 25,
      dueDay: 5,
      customCycles: card.cycles,
    });
    expect(
      plan.transactionsData.map((t) => [
        t.statementYear,
        t.statementMonth,
        t.date.toISOString().slice(0, 10),
        t.paymentDueDate instanceof Date
          ? t.paymentDueDate.toISOString().slice(0, 10)
          : null,
      ]),
    ).toEqual([
      [2026, 1, '2026-01-25', '2026-02-05'],
      [2026, 2, '2026-02-10', '2026-03-07'],
      [2026, 3, '2026-03-25', '2026-04-05'],
    ]);
    expect(
      plan.transactionsData.reduce((s, t) => s + Math.round(t.amount * 100), 0),
    ).toBe(10000);
    for (const t of plan.transactionsData) {
      expect(t.purchaseDate).toEqual(parseLocalDate('2026-01-20'));
      expect(cycleForPurchase(card, t.date).month).toBe(t.statementMonth);
    }
  });
  it('includes all closing day in Buenos Aires even if the UTC day has advanced', () => {
    expect(cycleForPurchase(card, new Date('2026-01-26T01:00:00Z')).month).toBe(
      1,
    );
    expect(
      cycleForPurchase(card, new Date('2026-01-26T02:59:59.999Z')).month,
    ).toBe(1);
    expect(cycleForPurchase(card, new Date('2026-01-26T03:00:00Z')).month).toBe(
      2,
    );
    expect(
      activeCardCycle(card, new Date('2026-01-26T01:00:00Z')).daysToClose,
    ).toBe(0);
  });
  it('handles February, due-date clamping and year changes', () => {
    expect(
      cycleForPeriod({ closingDay: 31, dueDay: 30 }, 2026, 2)
        .dueDate?.toISOString()
        .slice(0, 10),
    ).toBe('2026-03-30');
    expect(
      cycleForPeriod({ closingDay: 31, dueDay: 5 }, 2026, 12)
        .dueDate?.toISOString()
        .slice(0, 10),
    ).toBe('2027-01-05');
    expect(
      cycleForPeriod({ closingDay: 31, dueDay: 5 }, 2024, 2)
        .closingDate.toISOString()
        .slice(0, 10),
    ).toBe('2024-02-29');
  });
});
