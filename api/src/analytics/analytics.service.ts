import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getMonthDateRange } from '../utils/date.util';

export interface ForecastTimelineItem {
  period: string;
  label: string;
  month: number;
  year: number;
  installmentExpenses: number;
  fixedExpenses: number;
  totalCommitted: number;
  estimatedIncome: number;
  projectedNetCashflow: number;
  commitmentRatio: number;
  installments: {
    id: string;
    note: string;
    amount: number;
    creditCardAlias: string;
  }[];
}

export interface ActivePlanItem {
  groupId: string;
  concept: string;
  totalInstallments: number;
  paidInstallments: number;
  remainingInstallments: number;
  installmentAmount: number;
  remainingAmount: number;
  totalAmount: number;
  completionPercentage: number;
  finishDate: string;
  finishPeriod: string;
  creditCard: {
    alias: string;
    lastFour: string;
    colorHex: string | null;
  } | null;
}

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

  async getForecast(userId: string, monthsCount = 6) {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const forecastEnd = new Date(now.getFullYear(), now.getMonth() + monthsCount, 1);

    // 1. Buscamos ingresos de los últimos 3 meses para calcular un promedio confiable
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const [pastIncomes, futureTransactions, reminders, allInstallmentTransactions] = await Promise.all([
      this.prisma.transaction.findMany({
        where: {
          userId,
          category: { type: 'income' },
          date: { gte: threeMonthsAgo, lt: currentMonthStart },
        },
        select: { amount: true, date: true },
      }),
      this.prisma.transaction.findMany({
        where: {
          userId,
          date: { gte: currentMonthStart, lt: forecastEnd },
        },
        include: { category: true, creditCard: true },
        orderBy: { date: 'asc' },
      }),
      this.prisma.reminder.findMany({
        where: { userId },
        orderBy: { dueDate: 'asc' },
      }),
      this.prisma.transaction.findMany({
        where: {
          userId,
          installmentGroupId: { not: null },
        },
        include: { creditCard: true },
        orderBy: { date: 'asc' },
      }),
    ]);

    // Estimamos el ingreso mensual promedio
    let estimatedMonthlyIncome = 0;
    if (pastIncomes.length > 0) {
      const totalPastIncome = pastIncomes.reduce((acc, tx) => acc + Number(tx.amount), 0);
      estimatedMonthlyIncome = Math.round((totalPastIncome / 3) * 100) / 100;
    } else {
      // Si no hay historial de 3 meses, revisamos si hubo ingresos en el mes corriente
      const currentMonthIncome = futureTransactions
        .filter((tx) => tx.category?.type === 'income')
        .reduce((acc, tx) => acc + Number(tx.amount), 0);
      estimatedMonthlyIncome = Math.round(currentMonthIncome * 100) / 100;
    }

    const MONTH_NAMES = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    // 2. Construimos la proyección mes a mes
    const forecastTimeline: ForecastTimelineItem[] = [];
    let totalCommitmentRatioSum = 0;

    for (let i = 0; i < monthsCount; i++) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const m = monthDate.getMonth() + 1;
      const y = monthDate.getFullYear();
      const { startDate, endDate } = getMonthDateRange(y, m);

      // Transacciones en cuotas o con tarjeta del mes
      const monthInstallmentTx = futureTransactions.filter(
        (tx) =>
          tx.date >= startDate &&
          tx.date < endDate &&
          (tx.installmentGroupId !== null || tx.creditCardId !== null)
      );

      const installmentExpenses = Math.round(
        monthInstallmentTx.reduce((sum, tx) => sum + Number(tx.amount), 0) * 100
      ) / 100;

      // Recordatorios / gastos fijos de ese mes
      const monthReminders = reminders.filter((r) => {
        const rDate = new Date(r.dueDate);
        return rDate.getDate() > 0 && r.amount !== null; // Proyectamos recordatorios activos con monto
      });

      // Sumamos recordatorios con monto como costo fijo estimado mensual
      const fixedExpenses = Math.round(
        monthReminders.reduce((sum, r) => sum + Number(r.amount || 0), 0) * 100
      ) / 100;

      const totalCommitted = Math.round((installmentExpenses + fixedExpenses) * 100) / 100;
      const projectedNetCashflow = Math.round((estimatedMonthlyIncome - totalCommitted) * 100) / 100;
      const commitmentRatio = estimatedMonthlyIncome > 0
        ? Math.min(100, Math.round((totalCommitted / estimatedMonthlyIncome) * 100))
        : 0;

      totalCommitmentRatioSum += commitmentRatio;

      forecastTimeline.push({
        period: `${m.toString().padStart(2, '0')}/${y}`,
        label: `${MONTH_NAMES[m - 1]} ${y}`,
        month: m,
        year: y,
        installmentExpenses,
        fixedExpenses,
        totalCommitted,
        estimatedIncome: estimatedMonthlyIncome,
        projectedNetCashflow,
        commitmentRatio,
        installments: monthInstallmentTx.map((tx) => ({
          id: tx.id,
          note: tx.note || 'Compra en cuotas',
          amount: Number(tx.amount),
          creditCardAlias: tx.creditCard?.alias || 'Tarjeta',
        })),
      });
    }

    // 3. Agrupación y resumen de compras en cuotas activas (por installmentGroupId)
    const groupsMap = new Map<string, typeof allInstallmentTransactions>();
    for (const tx of allInstallmentTransactions) {
      if (!tx.installmentGroupId) continue;
      const group = groupsMap.get(tx.installmentGroupId) || [];
      group.push(tx);
      groupsMap.set(tx.installmentGroupId, group);
    }

    const activePlans: ActivePlanItem[] = [];
    let totalFutureDebt = 0;
    let latestFinishDate: Date | null = null;

    for (const [groupId, txs] of groupsMap.entries()) {
      txs.sort((a, b) => a.date.getTime() - b.date.getTime());
      const totalInstallments = txs.length;
      const paidTxs = txs.filter((tx) => tx.date < currentMonthStart);
      const remainingTxs = txs.filter((tx) => tx.date >= currentMonthStart);

      // Si aún quedan cuotas pendientes por pagar
      if (remainingTxs.length > 0) {
        const firstTx = txs[0];
        const lastTx = txs[txs.length - 1];
        const installmentAmount = Number(firstTx.amount);
        const remainingAmount = Math.round(remainingTxs.reduce((sum, t) => sum + Number(t.amount), 0) * 100) / 100;
        const totalAmount = Math.round(totalInstallments * installmentAmount * 100) / 100;

        totalFutureDebt += remainingAmount;
        if (!latestFinishDate || lastTx.date > latestFinishDate) {
          latestFinishDate = lastTx.date;
        }

        // Limpiamos el texto "(Cuota X/Y)" de la nota para obtener el concepto limpio
        const cleanConcept = (firstTx.note || 'Compra')
          .replace(/\s*\(Cuota\s*\d+\/\d+\)\s*/gi, '')
          .trim();

        const finishMonth = lastTx.date.getMonth() + 1;
        const finishYear = lastTx.date.getFullYear();

        activePlans.push({
          groupId,
          concept: cleanConcept || 'Compra en cuotas',
          totalInstallments,
          paidInstallments: paidTxs.length,
          remainingInstallments: remainingTxs.length,
          installmentAmount,
          remainingAmount,
          totalAmount,
          completionPercentage: Math.round((paidTxs.length / totalInstallments) * 100),
          finishDate: lastTx.date.toISOString(),
          finishPeriod: `${MONTH_NAMES[finishMonth - 1]} ${finishYear}`,
          creditCard: firstTx.creditCard
            ? {
                alias: firstTx.creditCard.alias,
                lastFour: firstTx.creditCard.lastFour,
                colorHex: firstTx.creditCard.colorHex,
              }
            : null,
        });
      }
    }

    activePlans.sort((a, b) => b.remainingAmount - a.remainingAmount);

    let debtFreePeriod: string | null = null;
    if (latestFinishDate) {
      debtFreePeriod = `${MONTH_NAMES[latestFinishDate.getMonth()]} ${latestFinishDate.getFullYear()}`;
    }

    const averageCommitmentRatio = monthsCount > 0 ? Math.round(totalCommitmentRatioSum / monthsCount) : 0;

    return {
      monthsCount,
      estimatedMonthlyIncome,
      totalFutureDebt: Math.round(totalFutureDebt * 100) / 100,
      debtFreePeriod,
      averageCommitmentRatio,
      forecastTimeline,
      activePlans,
    };
  }
}