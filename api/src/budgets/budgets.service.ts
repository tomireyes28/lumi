import { serializable } from '../utils/serializable.util';
import { ownedCategory } from '../utils/category-lock.util';
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { getMonthDateRange } from '../utils/date.util';
import { getCalendarDayParts } from '../utils/date.util';

export type BudgetStatus = 'ok' | 'warning' | 'exceeded';

import type { BudgetItemDto, BudgetSummaryDto } from '../contracts/http';
export type BudgetProgressItem = BudgetItemDto;
export type BudgetsSummaryResponse = BudgetSummaryDto;

@Injectable()
export class BudgetsService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(userId: string, dto: CreateBudgetDto) {
    return serializable(this.prisma, async (tx) => {
      const { categoryId, amount } = dto;

      // 0. Anti-IDOR: Validamos que la categoría exista, sea de gasto y pertenezca al usuario
      const category = await ownedCategory(tx, categoryId, userId);

      if (!category || category.userId !== userId) {
        throw new BadRequestException(
          'La categoría especificada no existe o no pertenece a tu usuario.',
        );
      }

      if (category.type !== 'expense') {
        throw new BadRequestException(
          'Solo se pueden definir presupuestos para categorías de gasto.',
        );
      }

      return tx.budget.upsert({
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
    });
  }

  async findAll(
    userId: string,
    targetMonth?: number,
    targetYear?: number,
  ): Promise<BudgetsSummaryResponse> {
    const now = new Date();
    const month = targetMonth || getCalendarDayParts(now).monthIndex + 1;
    const year = targetYear || getCalendarDayParts(now).year;

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
      acc.set(tx.categoryId, current + Math.round(Number(tx.amount) * 100));
      return acc;
    }, new Map<string, number>());

    let totalBudgetedCents = 0;
    let totalSpentCents = 0;

    const items: BudgetProgressItem[] = budgets.map((budget) => {
      const budgetedAmount = Number(budget.amount);
      const spentAmount = (spentByCategory.get(budget.categoryId) || 0) / 100;
      const budgetCents = Math.round(budgetedAmount * 100);
      const spentCents = Math.round(spentAmount * 100);
      const remainingAmount = Math.max(0, (budgetCents - spentCents) / 100);
      const percentageSpent =
        budgetCents > 0 ? Math.round((spentCents / budgetCents) * 100) : 0;

      let status: BudgetStatus = 'ok';
      if (budgetCents > 0 && spentCents > budgetCents) {
        status = 'exceeded';
      } else if (budgetCents > 0 && spentCents * 100 >= budgetCents * 75) {
        status = 'warning';
      }

      totalBudgetedCents += budgetCents;
      totalSpentCents += spentCents;

      return {
        id: budget.id,
        categoryId: budget.categoryId,
        category: budget.category,
        budgetedAmount,
        spentAmount: spentCents / 100,
        remainingAmount,
        percentageSpent,
        status,
      };
    });

    const totalBudgeted = totalBudgetedCents / 100;
    const totalSpent = totalSpentCents / 100;
    const overallStatus: BudgetStatus =
      totalBudgetedCents > 0 && totalSpentCents > totalBudgetedCents
        ? 'exceeded'
        : totalBudgetedCents > 0 &&
            totalSpentCents * 100 >= totalBudgetedCents * 75
          ? 'warning'
          : 'ok';
    const totalRemaining = Math.max(
      0,
      Math.round((totalBudgeted - totalSpent) * 100) / 100,
    );
    const overallPercentage =
      totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0;

    return {
      period: `${month}/${year}`,
      totalBudgeted,
      totalSpent,
      totalRemaining,
      overallPercentage,
      overallStatus,
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
