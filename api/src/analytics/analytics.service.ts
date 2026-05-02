import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getMonthlyAnalytics(userId: string) {
    const now = new Date();
    
    // 1. Definimos los límites del mes actual y el anterior
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    // 2. Buscamos TODOS los EGRESOS del mes actual
    const currentMonthExpenses = await this.prisma.transaction.findMany({
      where: {
        userId,
        // Filtramos a través de la relación con la categoría
        category: {
          type: 'expense', // Asegurate de que esto coincida con cómo guardás las categorías (si usás mayúsculas, cambialo a 'EXPENSE')
        },
        date: {
          gte: startOfCurrentMonth,
          lte: endOfCurrentMonth,
        },
      },
      include: {
        category: true, // Traemos el nombre y color de la categoría
      },
    });

    // 3. Buscamos TODOS los EGRESOS del mes pasado
    const lastMonthExpenses = await this.prisma.transaction.findMany({
      where: {
        userId,
        category: {
          type: 'expense', 
        },
        date: {
          gte: startOfLastMonth,
          lte: endOfLastMonth,
        },
      },
    });

    // 4. Algoritmo de agrupación: Sumamos los gastos por categoría
    const expensesByCategory = currentMonthExpenses.reduce((acc, current) => {
      const catId = current.categoryId;
      if (!acc[catId]) {
        acc[catId] = {
          name: current.category?.name || 'Sin categoría',
          color: current.category?.colorHex || '#CBD5E1', // Corregido a colorHex según tu schema
          total: 0,
        };
      }
      acc[catId].total += Number(current.amount);
      return acc;
    }, {} as Record<string, { name: string; color: string; total: number }>);

    // Transformamos el objeto en un array ordenado de mayor a menor gasto
    const categoryBreakdown = Object.values(expensesByCategory).sort((a, b) => b.total - a.total);

    // 5. Calculamos totales y porcentajes
    const totalCurrentMonth = currentMonthExpenses.reduce((sum, t) => sum + Number(t.amount), 0);
    const totalLastMonth = lastMonthExpenses.reduce((sum, t) => sum + Number(t.amount), 0);

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