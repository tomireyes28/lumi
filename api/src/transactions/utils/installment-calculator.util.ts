import { Prisma } from '@prisma/client';

export interface InstallmentParams {
  amount: number;
  installments: number;
  startDate: Date;
  userId: string;
  categoryId: string;
  creditCardId?: string | null;
  note?: string;
  groupId?: string;
}

export interface CalculatedInstallments {
  groupId: string;
  transactionsData: Prisma.TransactionCreateManyInput[];
  installmentAmount: number;
}

export class InstallmentCalculator {
  /**
   * Generates installment transactions data avoiding month-end overflows (e.g., Feb 30 -> Feb 28/29)
   * and distributing amounts rounded to 2 decimal places.
   */
  static calculate(params: InstallmentParams): CalculatedInstallments {
    const { amount, installments, startDate, userId, categoryId, creditCardId, note } = params;

    if (installments < 1) {
      throw new Error('Installments count must be at least 1');
    }

    const installmentAmount = Math.round((amount / installments) * 100) / 100;
    const groupId = params.groupId || crypto.randomUUID();
    const transactionsData: Prisma.TransactionCreateManyInput[] = [];
    const startDay = startDate.getDate();
    const baseNote = note ? note.trim() : 'Compra';

    for (let i = 1; i <= installments; i++) {
      // Calculamos la fecha de la cuota ajustando los días al último día del mes si hay desborde
      const installmentDate = new Date(startDate.getFullYear(), startDate.getMonth() + (i - 1), 1);
      const daysInMonth = new Date(installmentDate.getFullYear(), installmentDate.getMonth() + 1, 0).getDate();
      installmentDate.setDate(Math.min(startDay, daysInMonth));
      installmentDate.setHours(
        startDate.getHours(),
        startDate.getMinutes(),
        startDate.getSeconds(),
        startDate.getMilliseconds()
      );

      const installmentNote = installments > 1 ? `${baseNote} (Cuota ${i}/${installments})` : baseNote;

      transactionsData.push({
        userId,
        categoryId,
        creditCardId: creditCardId || null,
        amount: installmentAmount,
        date: installmentDate,
        note: installmentNote,
        installmentGroupId: groupId,
      });
    }

    return {
      groupId,
      transactionsData,
      installmentAmount,
    };
  }
}
