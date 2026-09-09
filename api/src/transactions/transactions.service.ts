import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { GetTransactionsFilterDto } from './dto/get-transactions-filter.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { Prisma } from '@prisma/client';
import { getMonthDateRange } from '../utils/date.util';
import { InstallmentCalculator } from './utils/installment-calculator.util';

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createTransactionDto: CreateTransactionDto, userId: string) {
    const { installments, amount, date, note, creditCardId, categoryId } = createTransactionDto;
    const startDate = date ? new Date(date) : new Date();

    // 0. Verificamos que la categoría pertenezca al usuario autenticado (anti-IDOR)
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!category || category.userId !== userId) {
      throw new BadRequestException('La categoría especificada no existe o no pertenece a tu usuario.');
    }

    // Si se especificó tarjeta, verificamos que pertenezca al usuario autenticado (anti-IDOR)
    if (creditCardId) {
      const creditCard = await this.prisma.creditCard.findUnique({
        where: { id: creditCardId },
      });
      if (!creditCard || creditCard.userId !== userId) {
        throw new BadRequestException('La tarjeta especificada no existe o no pertenece a tu usuario.');
      }
    }

    // 1. SI ES UN GASTO NORMAL (Sin cuotas o 1 sola cuota)
    if (!installments || installments <= 1) {
      return this.prisma.transaction.create({
        data: {
          amount,
          note,
          date: startDate,
          user: { connect: { id: userId } },
          category: { connect: { id: categoryId } },
          ...(creditCardId && { creditCard: { connect: { id: creditCardId } } }),
        },
        include: { category: true, creditCard: true },
      });
    }

    // 2. SI ES UN GASTO EN CUOTAS (Delegado al motor InstallmentCalculator - SRP)
    const { groupId, transactionsData } = InstallmentCalculator.calculate({
      amount,
      installments,
      startDate,
      userId,
      categoryId,
      creditCardId,
      note,
    });

    // Insertamos todas las cuotas de golpe en la base de datos
    await this.prisma.transaction.createMany({
      data: transactionsData,
    });

    // Devolvemos la primera cuota creada para que el frontend pueda actualizar su UI
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
      const { startDate, endDate } = getMonthDateRange(parseInt(year), parseInt(month));
      whereClause.date = { gte: startDate, lt: endDate };
    }

    // Si se especifican parámetros de paginación, retornamos objeto paginado con metadatos
    if (page !== undefined || limit !== undefined) {
      const currentPage = Math.max(1, page || 1);
      const take = Math.max(1, Math.min(100, limit || 20));
      const skip = (currentPage - 1) * take;

      const [total, items] = await Promise.all([
        this.prisma.transaction.count({ where: whereClause }),
        this.prisma.transaction.findMany({
          where: whereClause,
          orderBy: { date: 'desc' },
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

    // Comportamiento sin paginación (retrocompatible con frontend existente)
    return this.prisma.transaction.findMany({
      where: whereClause,
      orderBy: { date: 'desc' },
      include: { category: true, creditCard: true },
    });
  }

  async update(id: string, updateTransactionDto: UpdateTransactionDto, userId: string) {
    const transaction = await this.prisma.transaction.findUnique({ where: { id } });
    
    if (!transaction || transaction.userId !== userId) {
      throw new NotFoundException('Transacción no encontrada o no autorizada');
    }

    const dataToUpdate: Prisma.TransactionUpdateInput = {};

    if (updateTransactionDto.amount !== undefined) dataToUpdate.amount = updateTransactionDto.amount;
    if (updateTransactionDto.note !== undefined) dataToUpdate.note = updateTransactionDto.note;
    if (updateTransactionDto.date !== undefined) dataToUpdate.date = new Date(updateTransactionDto.date);
    
    if (updateTransactionDto.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: updateTransactionDto.categoryId },
      });
      if (!category || category.userId !== userId) {
        throw new BadRequestException('La categoría especificada no existe o no pertenece a tu usuario.');
      }
      dataToUpdate.category = { connect: { id: updateTransactionDto.categoryId } };
    }
    
    // ==========================================
    // LÓGICA DE TARJETA BLINDADA (CON VALIDACIÓN DE PERTENENCIA)
    // ==========================================
    if (updateTransactionDto.creditCardId === null) {
      // Si el frontend manda null explícitamente, desconectamos la tarjeta (pasó a efectivo)
      dataToUpdate.creditCard = { disconnect: true };
    } else if (updateTransactionDto.creditCardId !== undefined) {
      const creditCard = await this.prisma.creditCard.findUnique({
        where: { id: updateTransactionDto.creditCardId },
      });
      if (!creditCard || creditCard.userId !== userId) {
        throw new BadRequestException('La tarjeta especificada no existe o no pertenece a tu usuario.');
      }
      // Si manda un ID válido y propio, conectamos la nueva tarjeta
      dataToUpdate.creditCard = { connect: { id: updateTransactionDto.creditCardId } };
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
        where: { ...baseWhere, category: { type: 'expense' }, creditCardId: null },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: { ...baseWhere, category: { type: 'expense' }, creditCardId: { not: null } },
        _sum: { amount: true },
      })
    ]);

    const totalIncome = Number(incomes._sum.amount || 0);
    const totalCashExpense = Number(cashExpenses._sum.amount || 0);
    const totalCardExpense = Number(cardExpenses._sum.amount || 0);
    const availableCash = totalIncome - totalCashExpense;

    return {
      period: `${month}/${year}`,
      totalIncome,
      totalCashExpense,
      totalCardExpense,
      availableCash,
    };
  }
}