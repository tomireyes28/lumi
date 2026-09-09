import { motion, Variants } from 'framer-motion';
import { Target, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { BudgetsSummaryResponse } from '@/types/budgets';

interface BudgetOverviewCardProps {
  data: BudgetsSummaryResponse;
  itemVariants?: Variants;
}

export function BudgetOverviewCard({ data, itemVariants }: BudgetOverviewCardProps) {
  const isExceeded = data.overallPercentage > 100;
  const isWarning = data.overallPercentage >= 75 && !isExceeded;

  let progressColor = 'bg-emerald-500';
  let badgeColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
  if (isExceeded) {
    progressColor = 'bg-rose-500';
    badgeColor = 'text-rose-700 bg-rose-50 border-rose-200';
  } else if (isWarning) {
    progressColor = 'bg-amber-500';
    badgeColor = 'text-amber-700 bg-amber-50 border-amber-200';
  }

  return (
    <motion.div
      variants={itemVariants}
      className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col gap-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2.5 bg-sky-50 text-sky-600 rounded-2xl">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Presupuesto General</h3>
            <p className="text-lg font-bold text-gray-900">
              ${data.totalSpent.toLocaleString('es-AR')}{' '}
              <span className="text-sm font-normal text-gray-400">
                / ${data.totalBudgeted.toLocaleString('es-AR')}
              </span>
            </p>
          </div>
        </div>

        <div className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1 ${badgeColor}`}>
          {isExceeded ? (
            <>
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{data.overallPercentage}%</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{data.overallPercentage}%</span>
            </>
          )}
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
        <motion.div
          className={`h-full ${progressColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, data.overallPercentage)}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>

      <div className="flex justify-between items-center text-xs text-gray-500 pt-1 border-t border-gray-50">
        <span>
          {data.items.length} {data.items.length === 1 ? 'categoría presupuestada' : 'categorías presupuestadas'}
        </span>
        <span className={isExceeded ? 'text-rose-600 font-bold' : 'text-gray-700 font-medium'}>
          {isExceeded
            ? `Excedido por $${(data.totalSpent - data.totalBudgeted).toLocaleString('es-AR')}`
            : `Disponible: $${data.totalRemaining.toLocaleString('es-AR')}`}
        </span>
      </div>
    </motion.div>
  );
}
