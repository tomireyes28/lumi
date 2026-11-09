import { Prisma } from '@prisma/client';
import {
  getCalendarDayParts,
  clampedBusinessDate,
} from '../../utils/date.util';
import {
  cycleForPurchase,
  cycleForPeriod,
} from '../../credit-cards/card-calendar';

export interface CustomCycleDateRef {
  year: number;
  month: number;
  closingDate: Date | string;
  dueDate?: Date | string | null;
}

export interface InstallmentParams {
  amount: number;
  installments: number;
  startDate: Date;
  userId: string;
  categoryId: string;
  creditCardId?: string | null;
  closingDay?: number | null;
  dueDay?: number | null;
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
    const purchase = getCalendarDayParts(startDate);
    const startDay = purchase.day;
    const baseNote = note ? note.trim() : 'Compra';
    const paymentMethod = creditCardId ? 'credit_card' : 'cash';

    const calendar =
      creditCardId && closingDay
        ? {
            closingDay,
            dueDay: params.dueDay ?? undefined,
            cycles: customCycles,
          }
        : null;
    const first = calendar ? cycleForPurchase(calendar, startDate) : null;
    for (let i = 1; i <= installments; i++) {
      const cycle =
        calendar && first
          ? cycleForPeriod(calendar, first.year, first.month + i - 1)
          : null;
      const installmentDate =
        cycle?.closingDate ??
        (i === 1
          ? startDate
          : clampedBusinessDate(
              purchase.year,
              purchase.monthIndex + i - 1,
              startDay,
            ));
      const installmentNote =
        installments > 1
          ? `${baseNote} (Cuota ${i}/${installments})`
          : baseNote;

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
        purchaseDate: startDate,
        referenceDate: i === 1 ? startDate : installmentDate,
        statementYear: cycle?.year ?? null,
        statementMonth: cycle?.month ?? null,
        statementClosingDate: cycle?.closingDate ?? null,
        paymentDueDate: cycle?.dueDate ?? null,
        installmentNumber: i,
        installmentCount: installments,
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
