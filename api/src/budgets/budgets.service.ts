import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { getMonthDateRange } from '../utils/date.util';

export type BudgetStatus = 'ok' | 'warning' | 'exceeded';

export interface BudgetProgressItem {
  id: string;
  categoryId: string;
  category: {
    id: string;
    name: string;
    colorHex: string | null;
    icon: string | null;
  };
  budgetedAmount: number;
  spentAmount: number;
  remainingAmount: number;
  percentageSpent: number;
  status: BudgetStatus;
}

export interface BudgetsSummaryResponse {
  period: string;
  totalBudgeted: number;
  totalSpent: number;
  totalRemaining: number;
  overallPercentage: number;
  items: BudgetProgressItem[];
}

@Injectable()
export class BudgetsService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(userId: string, dto: CreateBudgetDto) {
    const { categoryId, amount } = dto;

    // 0. Anti-IDOR: Validamos que la categoría exista, sea de gasto y pertenezca al usuario
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category || category.userId !== userId) {
      throw new BadRequestException('La categoría especificada no existe o no pertenece a tu usuario.');
    }

    if (category.type !== 'expense') {
      throw new BadRequestException('Solo se pueden definir presupuestos para categorías de gasto.');
    }

    return this.prisma.budget.upsert({
      where: {
        userId_categoryId: {
          userId,
          categoryId,
        },
      },
      update: {
        amount,
      },
      create: {
        userId,
        categoryId,
        amount,
      },
      include: {
        category: true,
      },
    });
  }

  async findAll(userId: string, targetMonth?: number, targetYear?: number): Promise<BudgetsSummaryResponse> {
    const now = new Date();
    const month = targetMonth || now.getMonth() + 1;
    const year = targetYear || now.getFullYear();

    const { startDate, endDate } = getMonthDateRange(year, month);

    // Consultamos en paralelo los presupuestos definidos y las transacciones del período
    const [budgets, expenses] = await Promise.all([
      this.prisma.budget.findMany({
        where: { userId },
        include: {
          category: {
            select: { id: true, name: true, colorHex: true, icon: true },
          },
        },
        orderBy: { amount: 'desc' },
      }),
      this.prisma.transaction.findMany({
        where: {
          userId,
          category: { type: 'expense' },
          date: { gte: startDate, lt: endDate },
        },
        select: { categoryId: true, amount: true },
      }),
    ]);

    // Mapeamos el gasto total por categoría en este mes
    const spentByCategory = expenses.reduce((acc, tx) => {
      const current = acc.get(tx.categoryId) || 0;
      acc.set(tx.categoryId, current + Number(tx.amount));
      return acc;
    }, new Map<string, number>());

    let totalBudgeted = 0;
    let totalSpent = 0;

    const items: BudgetProgressItem[] = budgets.map((budget) => {
      const budgetedAmount = Number(budget.amount);
      const spentAmount = spentByCategory.get(budget.categoryId) || 0;
      const remainingAmount = Math.max(0, Math.round((budgetedAmount - spentAmount) * 100) / 100);
      const percentageSpent = budgetedAmount > 0 ? Math.round((spentAmount / budgetedAmount) * 100) : 0;

      let status: BudgetStatus = 'ok';
      if (percentageSpent > 100) {
        status = 'exceeded';
      } else if (percentageSpent >= 75) {
        status = 'warning';
      }

      totalBudgeted += budgetedAmount;
      totalSpent += spentAmount;

      return {
        id: budget.id,
        categoryId: budget.categoryId,
        category: budget.category,
        budgetedAmount,
        spentAmount: Math.round(spentAmount * 100) / 100,
        remainingAmount,
        percentageSpent,
        status,
      };
    });

    totalBudgeted = Math.round(totalBudgeted * 100) / 100;
    totalSpent = Math.round(totalSpent * 100) / 100;
    const totalRemaining = Math.max(0, Math.round((totalBudgeted - totalSpent) * 100) / 100);
    const overallPercentage = totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0;

    return {
      period: `${month}/${year}`,
      totalBudgeted,
      totalSpent,
      totalRemaining,
      overallPercentage,
      items,
    };
  }

  async remove(id: string, userId: string) {
    const budget = await this.prisma.budget.findUnique({
      where: { id },
    });

    if (!budget || budget.userId !== userId) {
      throw new NotFoundException('Presupuesto no encontrado o no autorizado');
    }

    return this.prisma.budget.delete({
      where: { id },
    });
  }
}
