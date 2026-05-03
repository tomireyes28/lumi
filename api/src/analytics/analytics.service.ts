import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getMonthDateRange } from '../utils/date.util'; 

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getMonthlyAnalytics(userId: string) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; 

    // 1. Calculamos las fechas
    const currentMonthRange = getMonthDateRange(currentYear, currentMonth);
    const lastMonthRange = getMonthDateRange(currentYear, currentMonth - 1); 

    // 2. Ejecutamos las consultas EN PARALELO
    const [currentMonthExpenses, lastMonthAgg] = await Promise.all([
      this.prisma.transaction.findMany({
        where: {
          userId,
          category: { type: 'expense' },
          date: { gte: currentMonthRange.startDate, lt: currentMonthRange.endDate },
        },
        include: { category: true },
        orderBy: { date: 'desc' }, // <-- Opcional: ordenamos los gastos de más nuevos a más viejos
      }),
      this.prisma.transaction.aggregate({
        where: {
          userId,
          category: { type: 'expense' },
          date: { gte: lastMonthRange.startDate, lt: lastMonthRange.endDate },
        },
        _sum: { amount: true },
      })
    ]);

    // 3. Algoritmo de agrupación: Sumamos la plata Y GUARDAMOS EL DETALLE
    const expensesByCategory = currentMonthExpenses.reduce((acc, current) => {
      const catId = current.categoryId;
      
      // Si la categoría no existe en nuestro acumulador, la creamos
      if (!acc[catId]) {
        acc[catId] = {
          name: current.category?.name || 'Sin categoría',
          color: current.category?.colorHex || '#CBD5E1',
          total: 0,
          transactions: [], // <-- NUEVO: Inicializamos el array vacío
        };
      }
      
      // Sumamos el total
      acc[catId].total += Number(current.amount);
      
      // NUEVO: Guardamos el detalle de la transacción para el acordeón
      acc[catId].transactions.push({
        id: current.id,
        note: current.note,
        amount: Number(current.amount),
        date: current.date,
      });

      return acc;
    }, {} as Record<string, { 
      name: string; 
      color: string; 
      total: number; 
      transactions: { id: string; note: string | null; amount: number; date: Date }[] 
    }>);

    // Convertimos el diccionario a un array y lo ordenamos por la categoría que más gastó
    const categoryBreakdown = Object.values(expensesByCategory).sort((a, b) => b.total - a.total);

    // 4. Calculamos totales y porcentajes
    const totalCurrentMonth = currentMonthExpenses.reduce((sum, t) => sum + Number(t.amount), 0);
    const totalLastMonth = Number(lastMonthAgg._sum.amount || 0); 

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