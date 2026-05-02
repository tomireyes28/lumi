import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getMonthDateRange } from '../utils/date.util'; // <-- Importamos nuestra herramienta

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getMonthlyAnalytics(userId: string) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // JS es 0-indexado (0 a 11)

    // 1. Calculamos las fechas usando nuestra utilidad DRY
    const currentMonthRange = getMonthDateRange(currentYear, currentMonth);
    const lastMonthRange = getMonthDateRange(currentYear, currentMonth - 1); 

    // 2. Ejecutamos las consultas EN PARALELO
    const [currentMonthExpenses, lastMonthAgg] = await Promise.all([
      // A. Traemos el detalle de este mes (porque necesitamos armar la dona por categoría)
      this.prisma.transaction.findMany({
        where: {
          userId,
          category: { type: 'expense' },
          date: { gte: currentMonthRange.startDate, lt: currentMonthRange.endDate },
        },
        include: { category: true },
      }),
      // B. Le pedimos a la Base de Datos que SUME el mes pasado sola (ahorramos RAM)
      this.prisma.transaction.aggregate({
        where: {
          userId,
          category: { type: 'expense' },
          date: { gte: lastMonthRange.startDate, lt: lastMonthRange.endDate },
        },
        _sum: { amount: true },
      })
    ]);

    // 3. Algoritmo de agrupación: Sumamos los gastos por categoría (Gráfico de Dona)
    const expensesByCategory = currentMonthExpenses.reduce((acc, current) => {
      const catId = current.categoryId;
      if (!acc[catId]) {
        acc[catId] = {
          name: current.category?.name || 'Sin categoría',
          color: current.category?.colorHex || '#CBD5E1',
          total: 0,
        };
      }
      acc[catId].total += Number(current.amount);
      return acc;
    }, {} as Record<string, { name: string; color: string; total: number }>);

    const categoryBreakdown = Object.values(expensesByCategory).sort((a, b) => b.total - a.total);

    // 4. Calculamos totales y porcentajes
    const totalCurrentMonth = currentMonthExpenses.reduce((sum, t) => sum + Number(t.amount), 0);
    const totalLastMonth = Number(lastMonthAgg._sum.amount || 0); // Convertimos el resultado de la DB

    let percentageChange = 0;
    if (totalLastMonth > 0) {
      percentageChange = ((totalCurrentMonth - totalLastMonth) / totalLastMonth) * 100;
    }

    return {
      currentMonthTotal: totalCurrentMonth,
      lastMonthTotal: totalLastMonth,
      percentageChange: Math.round(percentageChange),
      categoryBreakdown,
    };
  }
}