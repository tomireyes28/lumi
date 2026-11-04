import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { GetTransactionsFilterDto } from './dto/get-transactions-filter.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { Prisma } from '@prisma/client';
import { getMonthDateRange, parseLocalDate } from '../utils/date.util';
import { InstallmentCalculator, CustomCycleDateRef } from './utils/installment-calculator.util';

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createTransactionDto: CreateTransactionDto, userId: string) {
    const { installments, amount, date, note, creditCardId, categoryId } = createTransactionDto;
    const startDate = date ? parseLocalDate(date) : new Date();

    // 0. Verificamos que la categoría pertenezca al usuario autenticado (anti-IDOR)
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!category || category.userId !== userId) {
      throw new BadRequestException(
        'La categoría especificada no existe o no pertenece a tu usuario.',
      );
    }

    if (category.type === 'income' && (creditCardId || (installments && installments > 1))) {
      throw new BadRequestException(
        'Los ingresos no pueden asociarse a una tarjeta de crédito ni dividirse en cuotas.',
      );
    }

    if (installments && installments > 1 && !creditCardId) {
      throw new BadRequestException(
        'Las compras en cuotas requieren asociar una tarjeta de crédito.',
      );
    }

    if (installments && installments > 1 && Math.round(amount * 100) < installments) {
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
      creditCard = await this.prisma.creditCard.findUnique({
        where: { id: creditCardId },
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
      const effectiveDate =
        creditCard && typeof creditCard.closingDay === 'number'
          ? InstallmentCalculator.calculate({
              amount,
              installments: 1,
              startDate,
              userId,
              categoryId,
              creditCardId,
              closingDay: creditCard.closingDay,
              customCycles: creditCard.cycles,
              note,
            }).transactionsData[0].date
          : startDate;

      return this.prisma.transaction.create({
        data: {
          amount,
          note,
          date: effectiveDate,
          paymentMethod,
          user: { connect: { id: userId } },
          category: { connect: { id: categoryId } },
          ...(creditCardId && { creditCard: { connect: { id: creditCardId } } }),
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
      customCycles: creditCard?.cycles,
      note,
    });

    await this.prisma.transaction.createMany({
      data: transactionsData,
    });

    return this.prisma.transaction.findFirst({
      where: { installmentGroupId: groupId },
      orderBy: { date: 'asc' },
      include: { category: true, creditCard: true },
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
      if (parsedMonth < 1 || parsedMonth > 12 || parsedYear < 2000 || parsedYear > 2100) {
        throw new BadRequestException('El período de búsqueda (mes/año) no es válido.');
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

  async update(id: string, updateTransactionDto: UpdateTransactionDto, userId: string) {
    const transaction = await this.prisma.transaction.findUnique({ where: { id } });

    if (!transaction || transaction.userId !== userId) {
      throw new NotFoundException('Transacción no encontrada o no autorizada');
    }

    const dataToUpdate: Prisma.TransactionUpdateInput = {};

    if (updateTransactionDto.amount !== undefined) {
      dataToUpdate.amount = updateTransactionDto.amount;
    }
    if (updateTransactionDto.note !== undefined) {
      dataToUpdate.note = updateTransactionDto.note;
    }
    if (updateTransactionDto.date !== undefined) {
      if (updateTransactionDto.date === null) {
        throw new BadRequestException('La fecha de la transacción no puede ser nula.');
      }
      dataToUpdate.date = parseLocalDate(updateTransactionDto.date);
    }

    let targetCategoryType: string | undefined;
    if (updateTransactionDto.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: updateTransactionDto.categoryId },
      });
      if (!category || category.userId !== userId) {
        throw new BadRequestException(
          'La categoría especificada no existe o no pertenece a tu usuario.',
        );
      }
      targetCategoryType = category.type;
      dataToUpdate.category = { connect: { id: updateTransactionDto.categoryId } };
    }

    if (updateTransactionDto.creditCardId === null) {
      dataToUpdate.creditCard = { disconnect: true };
      dataToUpdate.paymentMethod = 'cash';
    } else if (updateTransactionDto.creditCardId !== undefined) {
      if (targetCategoryType === 'income') {
        throw new BadRequestException(
          'Los ingresos no pueden asociarse a una tarjeta de crédito.',
        );
      }
      const creditCard = await this.prisma.creditCard.findUnique({
        where: { id: updateTransactionDto.creditCardId },
      });
      if (!creditCard || creditCard.userId !== userId) {
        throw new BadRequestException(
          'La tarjeta especificada no existe o no pertenece a tu usuario.',
        );
      }
      dataToUpdate.creditCard = { connect: { id: updateTransactionDto.creditCardId } };
      dataToUpdate.paymentMethod = 'credit_card';
    }

    return this.prisma.transaction.update({
      where: { id },
      data: dataToUpdate,
      include: { category: true, creditCard: true },
    });
  }

  async remove(id: string, userId: string) {
    const transaction = await this.prisma.transaction.findUnique({ where: { id } });

    if (!transaction || transaction.userId !== userId) {
      throw new NotFoundException('Transacción no encontrada o no autorizada');
    }

    return this.prisma.transaction.delete({ where: { id } });
  }

  async getMonthlySummary(userId: string, targetMonth?: number, targetYear?: number) {
    const month = targetMonth || new Date().getMonth() + 1;
    const year = targetYear || new Date().getFullYear();

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
          OR: [{ creditCardId: { not: null } }, { paymentMethod: 'credit_card' }],
        },
        _sum: { amount: true },
      }),
    ]);

    const totalIncome = Number(incomes._sum.amount || 0);
    const totalCashExpense = Number(cashExpenses._sum.amount || 0);
    const totalCardExpense = Number(cardExpenses._sum.amount || 0);
    const availableCash = Math.round((totalIncome - totalCashExpense) * 100) / 100;

    return {
      period: `${month}/${year}`,
      totalIncome,
      totalCashExpense,
      totalCardExpense,
      availableCash,
    };
  }
}
