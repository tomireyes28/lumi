import { InstallmentCalculator } from './installment-calculator.util';

describe('InstallmentCalculator', () => {
  it('should split total amount across installments rounded to 2 decimals', () => {
    const result = InstallmentCalculator.calculate({
      amount: 1000,
      installments: 3,
      startDate: new Date('2026-01-15T12:00:00Z'),
      userId: 'user-1',
      categoryId: 'cat-1',
      note: 'Notebook',
    });

    expect(result.transactionsData).toHaveLength(3);
    expect(result.installmentAmount).toBe(333.33);
    expect(result.groupId).toBeDefined();

    result.transactionsData.forEach((tx, idx) => {
      expect(tx.userId).toBe('user-1');
      expect(tx.categoryId).toBe('cat-1');
      expect(tx.amount).toBe(333.33);
      expect(tx.installmentGroupId).toBe(result.groupId);
      expect(tx.note).toBe(`Notebook (Cuota ${idx + 1}/3)`);
    });
  });

  it('should prevent month-end overflow on 31-day months (e.g., Jan 31 -> Feb 28/29)', () => {
    const result = InstallmentCalculator.calculate({
      amount: 600,
      installments: 3,
      startDate: new Date('2026-01-31T10:00:00.000Z'),
      userId: 'user-1',
      categoryId: 'cat-1',
    });

    const dates = result.transactionsData.map((tx) => new Date(tx.date));

    // Cuota 1: Enero 31
    expect(dates[0].getMonth()).toBe(0); // 0 = Enero
    expect(dates[0].getDate()).toBe(31);

    // Cuota 2: Febrero 28 (año no bisiesto 2026)
    expect(dates[1].getMonth()).toBe(1); // 1 = Febrero
    expect(dates[1].getDate()).toBe(28);

    // Cuota 3: Marzo 31
    expect(dates[2].getMonth()).toBe(2); // 2 = Marzo
    expect(dates[2].getDate()).toBe(31);
  });

  it('should throw an error if installments count is less than 1', () => {
    expect(() =>
      InstallmentCalculator.calculate({
        amount: 100,
        installments: 0,
        startDate: new Date(),
        userId: 'user-1',
        categoryId: 'cat-1',
      }),
    ).toThrow('Installments count must be at least 1');
  });

  it('should use default note "Compra" if note is empty or undefined', () => {
    const result = InstallmentCalculator.calculate({
      amount: 200,
      installments: 2,
      startDate: new Date('2026-05-10T12:00:00Z'),
      userId: 'user-1',
      categoryId: 'cat-1',
    });

    expect(result.transactionsData[0].note).toBe('Compra (Cuota 1/2)');
    expect(result.transactionsData[1].note).toBe('Compra (Cuota 2/2)');
  });
});
