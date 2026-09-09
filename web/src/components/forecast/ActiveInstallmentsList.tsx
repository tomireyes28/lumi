import { motion, Variants } from 'framer-motion';
import { CreditCard, CheckCircle2 } from 'lucide-react';
import { ActivePlanItem } from '@/types/forecast';

interface ActiveInstallmentsListProps {
  plans: ActivePlanItem[];
  itemVariants?: Variants;
}

export function ActiveInstallmentsList({ plans, itemVariants }: ActiveInstallmentsListProps) {
  if (plans.length === 0) {
    return (
      <motion.div
        variants={itemVariants}
        className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm text-center flex flex-col items-center gap-3"
      >
        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <div>
          <h4 className="font-bold text-gray-900 text-sm">¡Estás al día!</h4>
          <p className="text-xs text-gray-500 mt-0.5">
            No tenés planes de cuotas activos en este momento.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div variants={itemVariants} className="flex flex-col gap-3">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
          Compras en Cuotas Activas ({plans.length})
        </h3>
      </div>

      <div className="flex flex-col gap-3">
        {plans.map((plan) => (
          <div
            key={plan.groupId}
            className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col gap-3.5 hover:border-gray-200 transition-all"
          >
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-bold text-gray-900 text-sm leading-tight">{plan.concept}</h4>
                <div className="flex items-center gap-2 mt-1">
                  {plan.creditCard && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 bg-gray-50 px-2 py-0.5 rounded-lg border border-gray-100">
                      <CreditCard className="w-3 h-3 text-gray-400" />
                      {plan.creditCard.alias} (•••• {plan.creditCard.lastFour})
                    </span>
                  )}
                  <span className="text-[11px] text-purple-700 bg-purple-50 font-semibold px-2 py-0.5 rounded-lg border border-purple-100">
                    ${plan.installmentAmount.toLocaleString('es-AR')}/mes
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs text-gray-400 block">Resta pagar</span>
                <span className="text-sm font-bold text-gray-900">
                  ${plan.remainingAmount.toLocaleString('es-AR')}
                </span>
              </div>
            </div>

            {/* Barra de progreso de cuotas */}
            <div className="flex flex-col gap-1.5">
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-purple-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${plan.completionPercentage}%` }}
                  transition={{ duration: 0.7, ease: 'easeOut' }}
                />
              </div>

              <div className="flex justify-between items-center text-[11px] text-gray-500">
                <span>
                  Cuota {plan.paidInstallments} de {plan.totalInstallments} ({plan.completionPercentage}% amortizado)
                </span>
                <span className="text-gray-400">
                  Termina en <strong className="text-gray-600 font-semibold">{plan.finishPeriod}</strong>
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
