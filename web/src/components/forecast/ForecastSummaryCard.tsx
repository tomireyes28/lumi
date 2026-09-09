import { motion, Variants } from 'framer-motion';
import { CreditCard, CalendarCheck, ShieldAlert, Sparkles } from 'lucide-react';
import { CashflowForecastResponse } from '@/types/forecast';

interface ForecastSummaryCardProps {
  data: CashflowForecastResponse;
  itemVariants?: Variants;
}

export function ForecastSummaryCard({ data, itemVariants }: ForecastSummaryCardProps) {
  const isHighCommitment = data.averageCommitmentRatio > 45;
  const isModerate = data.averageCommitmentRatio >= 25 && !isHighCommitment;

  let ratioBadge = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  let ratioText = 'Compromiso Saludable';
  if (isHighCommitment) {
    ratioBadge = 'bg-rose-50 text-rose-700 border-rose-200';
    ratioText = 'Alto Compromiso';
  } else if (isModerate) {
    ratioBadge = 'bg-amber-50 text-amber-700 border-amber-200';
    ratioText = 'Compromiso Moderado';
  }

  return (
    <motion.div
      variants={itemVariants}
      className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-3xl text-white shadow-xl flex flex-col gap-5 relative overflow-hidden"
    >
      {/* Glow decorativo de fondo */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex justify-between items-start relative z-10">
        <div>
          <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5" /> Deuda Futura en Cuotas
          </span>
          <h2 className="text-3xl font-extrabold mt-1 tracking-tight">
            ${data.totalFutureDebt.toLocaleString('es-AR')}
          </h2>
        </div>

        <div className={`px-3 py-1 rounded-full text-xs font-bold border ${ratioBadge}`}>
          {data.averageCommitmentRatio}% del ingreso
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/10 relative z-10">
        <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
          <span className="text-[11px] text-gray-400 block mb-1 flex items-center gap-1">
            <CalendarCheck className="w-3.5 h-3.5 text-indigo-400" />
            Libre de cuotas en
          </span>
          <span className="text-sm font-bold text-white truncate block">
            {data.debtFreePeriod || 'Sin cuotas pendientes'}
          </span>
        </div>

        <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
          <span className="text-[11px] text-gray-400 block mb-1 flex items-center gap-1">
            {isHighCommitment ? (
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            )}
            Estado
          </span>
          <span className="text-sm font-bold text-white truncate block">
            {ratioText}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
