import { ownedCategory } from '../utils/category-lock.util';
import { serializable } from '../utils/serializable.util';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { GetTransactionsFilterDto } from './dto/get-transactions-filter.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { Prisma } from '@prisma/client';
import { getMonthDateRange, parseLocalDate } from '../utils/date.util';
import { getCalendarDayParts } from '../utils/date.util';
import {
  InstallmentCalculator,
  CustomCycleDateRef,
} from './utils/installment-calculator.util';

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createTransactionDto: CreateTransactionDto, userId: string) {
    return serializable(this.prisma, async (tx) => {
      const { installments, amount, date, note, creditCardId, categoryId } =
        createTransactionDto;
      const startDate = date ? parseLocalDate(date) : new Date();

      // 0. Verificamos que la categoría pertenezca al usuario autenticado (anti-IDOR)
      const category = await ownedCategory(tx, categoryId, userId);
      if (!category || category.userId !== userId) {
        throw new BadRequestException(
          'La categoría especificada no existe o no pertenece a tu usuario.',
        );
      }

      if (
        category.type === 'income' &&
        (creditCardId || (installments && installments > 1))
      ) {
        throw new BadRequestException(
          'Los ingresos no pueden asociarse a una tarjeta de crédito ni dividirse en cuotas.',
        );
      }

      if (installments && installments > 1 && !creditCardId) {
        throw new BadRequestException(
          'Las compras en cuotas requieren asociar una tarjeta de crédito.',
        );
      }

      if (
        installments &&
        installments > 1 &&
        Math.round(amount * 100) < installments
      ) {
        throw new BadRequestException(
          'El monto total debe alcanzar para al menos $0,01 por cada cuota.',
        );
      }

      let creditCard: {
        id?: string;
        userId: string;
        closingDay?: number;
        dueDay?: number;
        cycles?: CustomCycleDateRef[];
      } | null = null;

      if (creditCardId) {
        creditCard = await tx.creditCard.findUnique({
          where: { id: creditCardId },
          include: { cycles: true },
        });
        if (!creditCard || creditCard.userId !== userId) {
          throw new BadRequestException(
            'La tarjeta especificada no existe o no pertenece a tu usuario.',
          );
        }
      }

      const paymentMethod = creditCardId ? 'credit_card' : 'cash';

      // 1. SI ES UN MOVIMIENTO NORMAL (Sin cuotas o 1 sola cuota)
      if (!installments || installments <= 1) {
        const temporal = InstallmentCalculator.calculate({
          amount,
          installments: 1,
          startDate,
          userId,
          categoryId,
          creditCardId,
          closingDay: creditCard?.closingDay,
          dueDay: creditCard?.dueDay,
          customCycles: creditCard?.cycles,
          note,
        }).transactionsData[0];
        return tx.transaction.create({
          data: {
            amount,
            note,
            date: temporal.date,
            purchaseDate: startDate,
            referenceDate: startDate,
            statementYear: temporal.statementYear,
            statementMonth: temporal.statementMonth,
            statementClosingDate: temporal.statementClosingDate,
            paymentDueDate: temporal.paymentDueDate,
            installmentNumber: 1,
            installmentCount: 1,
            paymentMethod,
            user: { connect: { id: userId } },
            category: { connect: { id: categoryId } },
            ...(creditCardId && {
              creditCard: { connect: { id: creditCardId } },
            }),
          },
          include: { category: true, creditCard: true },
        });
      }

      // 2. SI ES UN GASTO EN CUOTAS (Delegado al motor InstallmentCalculator con cierre de tarjeta)
      const { groupId, transactionsData } = InstallmentCalculator.calculate({
        amount,
        installments,
        startDate,
        userId,
        categoryId,
        creditCardId,
        closingDay: creditCard?.closingDay,
        dueDay: creditCard?.dueDay,
        customCycles: creditCard?.cycles,
        note,
      });

      await tx.transaction.createMany({
        data: transactionsData,
      });

      return tx.transaction.findFirst({
        where: { installmentGroupId: groupId },
        orderBy: { date: 'asc' },
        include: { category: true, creditCard: true },
      });
    });
  }

  async findAllByUser(userId: string, filters: GetTransactionsFilterDto) {
    const { month, year, categoryId, type, page, limit } = filters;
    const whereClause: Prisma.TransactionWhereInput = { userId };

    if (categoryId) whereClause.categoryId = categoryId;
    if (type) whereClause.category = { type };

    if (month && year) {
      const parsedMonth = parseInt(month, 10);
      const parsedYear = parseInt(year, 10);
      if (
        parsedMonth < 1 ||
        parsedMonth > 12 ||
        parsedYear < 2000 ||
        parsedYear > 2100
      ) {
        throw new BadRequestException(
          'El período de búsqueda (mes/año) no es válido.',
        );
      }
      const { startDate, endDate } = getMonthDateRange(parsedYear, parsedMonth);
      whereClause.date = { gte: startDate, lt: endDate };
    }

    if (page !== undefined || limit !== undefined) {
      const currentPage = Math.min(10000, Math.max(1, page || 1));
      const take = Math.max(1, Math.min(100, limit || 20));
      const skip = (currentPage - 1) * take;

      const [total, items] = await Promise.all([
        this.prisma.transaction.count({ where: whereClause }),
        this.prisma.transaction.findMany({
          where: whereClause,
          orderBy: [{ date: 'desc' }, { id: 'desc' }],
          skip,
          take,
          include: { category: true, creditCard: true },
        }),
      ]);

      return {
        data: items,
        meta: {
          total,
          page: currentPage,
          limit: take,
          totalPages: Math.ceil(total / take),
        },
      };
    }

    return this.prisma.transaction.findMany({
      where: whereClause,
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
      include: { category: true, creditCard: true },
    });
  }

  async update(id: string, dto: UpdateTransactionDto, userId: string) {
    return serializable(this.prisma, async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Transaction" WHERE id=${id} AND "userId"=${userId} FOR UPDATE`;
      const existing = await tx.transaction.findUnique({ where: { id } });
      if (!existing || existing.userId !== userId)
        throw new NotFoundException(
          'Transacción no encontrada o no autorizada',
        );
      const categoryId = dto.categoryId ?? existing.categoryId;
      for (const idToLock of [
        ...new Set([existing.categoryId, categoryId]),
      ].sort())
        await ownedCategory(tx, idToLock, userId);
      const category = await tx.category.findUnique({
        where: { id: categoryId },
      });
      if (!category || category.userId !== userId)
        throw new BadRequestException(
          'La categoría no pertenece a tu usuario.',
        );
      const cardId =
        dto.creditCardId === undefined
          ? existing.creditCardId
          : dto.creditCardId;
      const method =
        dto.creditCardId === null
          ? 'cash'
          : cardId
            ? 'credit_card'
            : existing.paymentMethod;
      if (category.type === 'income' && (cardId || method === 'credit_card'))
        throw new BadRequestException(
          'Los ingresos no pueden asociarse a una tarjeta de crédito.',
        );
      const card = cardId
        ? await tx.creditCard.findUnique({
            where: { id: cardId },
            include: { cycles: true },
          })
        : null;
      if (cardId && (!card || card.userId !== userId))
        throw new BadRequestException('La tarjeta no pertenece a tu usuario.');
      const data: Prisma.TransactionUncheckedUpdateInput = {};
      if (dto.amount !== undefined) data.amount = dto.amount;
      if (dto.note !== undefined) data.note = dto.note;
      if (dto.categoryId !== undefined) data.categoryId = categoryId;
      if (dto.creditCardId !== undefined) {
        data.creditCardId = cardId;
        data.paymentMethod = method;
        if (method === 'cash') {
          data.installmentGroupId = null;
          data.installmentNumber = null;
          data.installmentCount = null;
        }
      }
      if (
        dto.date !== undefined ||
        (dto.creditCardId !== undefined &&
          (cardId !== existing.creditCardId ||
            method !== existing.paymentMethod))
      ) {
        if (dto.date === null)
          throw new BadRequestException('La fecha no puede ser nula.');
        const reference = dto.date
          ? parseLocalDate(dto.date)
          : (existing.referenceDate ?? existing.date);
        const temporal = InstallmentCalculator.calculate({
          amount: dto.amount ?? Number(existing.amount),
          installments: 1,
          startDate: reference,
          userId,
          categoryId,
          creditCardId: cardId,
          closingDay: card?.closingDay,
          dueDay: card?.dueDay,
          customCycles: card?.cycles,
        }).transactionsData[0];
        data.referenceDate = reference;
        data.date = temporal.date;
        data.statementYear = temporal.statementYear;
        data.statementMonth = temporal.statementMonth;
        data.statementClosingDate = temporal.statementClosingDate;
        data.paymentDueDate = temporal.paymentDueDate;
      }
      return tx.transaction.update({
        where: { id },
        data,
        include: { category: true, creditCard: true },
      });
    });
  }

  async remove(id: string, userId: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
    });

    if (!transaction || transaction.userId !== userId) {
      throw new NotFoundException('Transacción no encontrada o no autorizada');
    }

    return this.prisma.transaction.delete({ where: { id } });
  }

  async getMonthlySummary(
    userId: string,
    targetMonth?: number,
    targetYear?: number,
  ) {
    const month = targetMonth || getCalendarDayParts(new Date()).monthIndex + 1;
    const year = targetYear || getCalendarDayParts(new Date()).year;

    const { startDate, endDate } = getMonthDateRange(year, month);

    const baseWhere = {
      userId,
      date: { gte: startDate, lt: endDate },
    };

    const [incomes, cashExpenses, cardExpenses] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { ...baseWhere, category: { type: 'income' } },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: {
          ...baseWhere,
          category: { type: 'expense' },
          creditCardId: null,
          paymentMethod: 'cash',
        },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: {
          ...baseWhere,
          category: { type: 'expense' },
          OR: [
            { creditCardId: { not: null } },
            { paymentMethod: 'credit_card' },
          ],
        },
        _sum: { amount: true },
      }),
    ]);

    const totalIncome = Number(incomes._sum.amount || 0);
    const totalCashExpense = Number(cashExpenses._sum.amount || 0);
    const totalCardExpense = Number(cardExpenses._sum.amount || 0);
    const availableCash =
      Math.round((totalIncome - totalCashExpense) * 100) / 100;

    return {
      period: `${month}/${year}`,
      totalIncome,
      totalCashExpense,
      totalCardExpense,
      availableCash,
    };
  }
}
