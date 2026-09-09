import { motion, Variants } from 'framer-motion';
import { Pencil, Trash2, AlertCircle } from 'lucide-react';
import { BudgetProgressItem } from '@/types/budgets';
import { IconRenderer } from '@/components/ui/IconRenderer';

interface BudgetCardProps {
  item: BudgetProgressItem;
  onEdit: (item: BudgetProgressItem) => void;
  onDelete: (id: string) => void;
  itemVariants?: Variants;
}

export function BudgetCard({ item, onEdit, onDelete, itemVariants }: BudgetCardProps) {
  const isExceeded = item.status === 'exceeded';
  const isWarning = item.status === 'warning';

  let barColor = 'bg-emerald-500';
  let badgeColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
  if (isExceeded) {
    barColor = 'bg-rose-500';
    badgeColor = 'text-rose-700 bg-rose-50 border-rose-200';
  } else if (isWarning) {
    barColor = 'bg-amber-500';
    badgeColor = 'text-amber-700 bg-amber-50 border-amber-200';
  }

  const categoryBg = item.category.colorHex ? `${item.category.colorHex}20` : '#f1f5f9';

  return (
    <motion.div
      variants={itemVariants}
      className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col gap-3 hover:border-gray-200 transition-all"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-xs"
            style={{ backgroundColor: categoryBg }}
          >
            <IconRenderer
              iconName={item.category.icon}
              colorHex={item.category.colorHex || '#64748b'}
              className="w-5 h-5"
            />
          </div>
          <div>
            <h4 className="font-bold text-gray-900 text-sm leading-tight">{item.category.name}</h4>
            <span className="text-xs text-gray-400">
              ${item.spentAmount.toLocaleString('es-AR')} de ${item.budgetedAmount.toLocaleString('es-AR')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${badgeColor}`}>
            {item.percentageSpent}%
          </span>
          <button
            onClick={() => onEdit(item)}
            className="p-1.5 text-gray-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
            title="Modificar presupuesto"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(item.id)}
            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            title="Eliminar presupuesto"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
        <motion.div
          className={`h-full ${barColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, item.percentageSpent)}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>

      {/* Estado y disponible */}
      <div className="flex justify-between items-center text-xs">
        {isExceeded ? (
          <span className="text-rose-600 font-bold flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            Límite superado por ${(item.spentAmount - item.budgetedAmount).toLocaleString('es-AR')}
          </span>
        ) : (
          <span className="text-gray-500">
            Disponible:{' '}
            <strong className="text-gray-700 font-semibold">
              ${item.remainingAmount.toLocaleString('es-AR')}
            </strong>
          </span>
        )}
        <span className="text-[11px] text-gray-400">
          {isExceeded ? '¡Cuidado con los gastos!' : isWarning ? 'Cerca del límite' : 'En presupuesto'}
        </span>
      </div>
    </motion.div>
  );
}
