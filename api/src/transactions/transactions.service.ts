import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { GetTransactionsFilterDto } from './dto/get-transactions-filter.dto';
import { Prisma } from '@prisma/client';

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
      },
      include: {
        category: true, // Devolvemos la categoría asociada para el frontend
      }
    });
  }

  async findAllByUser(userId: string, filters: GetTransactionsFilterDto) {
    const { month, year, categoryId, type } = filters;

    const whereClause: Prisma.TransactionWhereInput = {
      userId: userId,
    };

    if (categoryId) {
      whereClause.categoryId = categoryId;
    }

    if (type) {
      whereClause.category = {
        type: type,
      };
    }
    if (month && year) {
      // En JavaScript, los meses arrancan en 0 (Enero = 0, Diciembre = 11)
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 1); // Día 1 del mes siguiente

      // Prisma buscará transacciones mayores o iguales a startDate, y estrictamente menores a endDate
      whereClause.date = {
        gte: startDate,
        lt: endDate,
      };
    }

    return this.prisma.transaction.findMany({
      where: whereClause,
      orderBy: { date: 'desc' }, // Los más recientes primero
      include: {
        category: true, // Traemos la data visual de la categoría
      },
    });
  }

  async remove(id: string, userId: string) {
    const transaction = await this.prisma.transaction.findUnique({ where: { id } });
    
    if (!transaction || transaction.userId !== userId) {
      throw new NotFoundException('Transacción no encontrada o no autorizada');
    }

    return this.prisma.transaction.delete({
      where: { id },
    });
  }

  async getMonthlySummary(userId: string, month: number, year: number) {
    // Definimos el inicio y fin del mes actual
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const baseWhere = {
      userId,
      date: { gte: startDate, lt: endDate },
    };

    // 1. Sumar todos los Ingresos del mes
    const incomes = await this.prisma.transaction.aggregate({
      where: { ...baseWhere, category: { type: 'income' } },
      _sum: { amount: true },
    });
    const totalIncome = Number(incomes._sum.amount || 0);

    // 2. Sumar todos los Gastos en EFECTIVO/DÉBITO del mes (creditCardId es null)
    const cashExpenses = await this.prisma.transaction.aggregate({
      where: { 
        ...baseWhere, 
        category: { type: 'expense' },
        creditCardId: null // Solo los que NO se pagaron con tarjeta
      },
      _sum: { amount: true },
    });
    const totalCashExpense = Number(cashExpenses._sum.amount || 0);

    // 3. Sumar Gastos con TARJETA DE CRÉDITO del mes
    const cardExpenses = await this.prisma.transaction.aggregate({
      where: { 
        ...baseWhere, 
        category: { type: 'expense' },
        creditCardId: { not: null } // Solo los que SÍ tienen tarjeta
      },
      _sum: { amount: true },
    });
    const totalCardExpense = Number(cardExpenses._sum.amount || 0);

    // 4. El cálculo que pediste: ¿Cuánta plata real me queda?
    const availableCash = totalIncome - totalCashExpense;

    return {
      period: `${month}/${year}`,
      totalIncome,
      totalCashExpense,
      totalCardExpense, // Esta plata se debe, pero no se restó del sueldo aún
      availableCash,    // El sueldo descontando lo que ya se pagó
    };
  }
}

