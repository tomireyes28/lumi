import { Prisma } from '@prisma/client';
import { getCalendarDayParts } from '../../utils/date.util';

export interface CustomCycleDateRef {
  year: number;
  month: number;
  closingDate: Date | string;
}

export interface InstallmentParams {
  amount: number;
  installments: number;
  startDate: Date;
  userId: string;
  categoryId: string;
  creditCardId?: string | null;
  closingDay?: number | null;
  customCycles?: CustomCycleDateRef[];
  note?: string;
  groupId?: string;
}

export type CalculatedInstallmentItem = Prisma.TransactionCreateManyInput & {
  amount: number;
  date: Date;
  note: string;
  paymentMethod: string;
};

export interface CalculatedInstallments {
  groupId: string;
  transactionsData: CalculatedInstallmentItem[];
  installmentAmount: number;
}

export class InstallmentCalculator {
  /**
   * Genera las cuotas de una compra trabajando en centavos enteros (sin residuos negativos)
   * e imputando cada cuota según la fecha de cierre de la tarjeta (habitual o personalizada)
   * cuando la compra se realiza después del cierre del mes en curso.
   */
  static calculate(params: InstallmentParams): CalculatedInstallments {
    const {
      amount,
      installments,
      startDate,
      userId,
      categoryId,
      creditCardId,
      closingDay,
      customCycles,
      note,
    } = params;

    if (!Number.isInteger(installments) || installments < 1) {
      throw new Error('Installments count must be at least 1');
    }

    const totalCents = Math.round(amount * 100);
    if (totalCents < 1) {
      throw new Error('Amount must be at least 0.01');
    }

    const baseCents = Math.floor(totalCents / installments);
    const remainderCents = totalCents - baseCents * installments;
    const installmentAmount = baseCents / 100;

    const groupId = params.groupId || crypto.randomUUID();
    const transactionsData: CalculatedInstallmentItem[] = [];
    const startDay = startDate.getDate();
    const baseNote = note ? note.trim() : 'Compra';
    const paymentMethod = creditCardId ? 'credit_card' : 'cash';

    const getDaysInMonth = (year: number, monthIndex: number): number =>
      new Date(year, monthIndex + 1, 0).getDate();

    const getEffectiveClosingDay = (year: number, monthIndex: number): number | null => {
      const targetMonth = monthIndex + 1;
      const custom = customCycles?.find((c) => c.year === year && c.month === targetMonth);
      if (custom) {
        const parts = getCalendarDayParts(new Date(custom.closingDate));
        return Math.min(parts.day, getDaysInMonth(year, monthIndex));
      }
      if (typeof closingDay === 'number' && closingDay >= 1 && closingDay <= 31) {
        return Math.min(closingDay, getDaysInMonth(year, monthIndex));
      }
      return null;
    };

    const purchaseMonthClosingDay = getEffectiveClosingDay(
      startDate.getFullYear(),
      startDate.getMonth(),
    );
    const isAfterClosing =
      purchaseMonthClosingDay !== null && startDay > purchaseMonthClosingDay;
    const cycleMonthOffset = isAfterClosing ? 1 : 0;

    for (let i = 1; i <= installments; i++) {
      const targetMonthDate = new Date(
        startDate.getFullYear(),
        startDate.getMonth() + cycleMonthOffset + (i - 1),
        1,
      );
      const targetYear = targetMonthDate.getFullYear();
      const targetMonthIndex = targetMonthDate.getMonth();
      const daysInMonth = getDaysInMonth(targetYear, targetMonthIndex);

      const targetClosingDay = getEffectiveClosingDay(targetYear, targetMonthIndex);
      const maxDayInCycle =
        isAfterClosing && targetClosingDay !== null
          ? Math.min(targetClosingDay, daysInMonth)
          : daysInMonth;

      const installmentDate = new Date(
        targetYear,
        targetMonthIndex,
        Math.min(startDay, maxDayInCycle),
        startDate.getHours(),
        startDate.getMinutes(),
        startDate.getSeconds(),
        startDate.getMilliseconds(),
      );

      const installmentNote =
        installments > 1 ? `${baseNote} (Cuota ${i}/${installments})` : baseNote;

      const currentCents =
        baseCents > 0
          ? i === 1
            ? baseCents + remainderCents
            : baseCents
          : i <= remainderCents
            ? 1
            : 0;
      const currentAmount = currentCents / 100;

      transactionsData.push({
        userId,
        categoryId,
        creditCardId: creditCardId || null,
        paymentMethod,
        amount: currentAmount,
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
