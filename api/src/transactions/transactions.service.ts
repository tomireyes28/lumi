import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { GetTransactionsFilterDto } from './dto/get-transactions-filter.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { Prisma } from '@prisma/client';
import { getMonthDateRange } from '../utils/date.util';

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createTransactionDto: CreateTransactionDto, userId: string) {
    return this.prisma.transaction.create({
      data: {
        amount: createTransactionDto.amount,
        note: createTransactionDto.note,
        date: createTransactionDto.date ? new Date(createTransactionDto.date) : new Date(),
        user: { connect: { id: userId } },
        category: { connect: { id: createTransactionDto.categoryId } },
        ...(createTransactionDto.creditCardId && { 
          creditCard: { connect: { id: createTransactionDto.creditCardId } } 
        }),
      },
      include: {
        category: true,
      }
    });
  }

  async findAllByUser(userId: string, filters: GetTransactionsFilterDto) {
    const { month, year, categoryId, type } = filters;
    const whereClause: Prisma.TransactionWhereInput = { userId };

    if (categoryId) whereClause.categoryId = categoryId;
    if (type) whereClause.category = { type };

    if (month && year) {
      const { startDate, endDate } = getMonthDateRange(parseInt(year), parseInt(month));
      whereClause.date = { gte: startDate, lt: endDate };
    }

    return this.prisma.transaction.findMany({
      where: whereClause,
      orderBy: { date: 'desc' },
      include: { category: true, creditCard: true }, // <-- Agregué creditCard acá también para que el listado la traiga siempre
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
      dataToUpdate.category = { connect: { id: updateTransactionDto.categoryId } };
    }
    
    // ==========================================
    // LÓGICA DE TARJETA BLINDADA
    // ==========================================
    if (updateTransactionDto.creditCardId === null) {
      // Si el frontend manda null explícitamente, desconectamos la tarjeta (pasó a efectivo)
      dataToUpdate.creditCard = { disconnect: true };
    } else if (updateTransactionDto.creditCardId !== undefined) {
      // Si manda un ID, conectamos la nueva tarjeta
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