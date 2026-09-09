'use client';

import { motion, Variants } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useForecast } from '@/hooks/useForecast';
import { ForecastSummaryCard } from '@/components/forecast/ForecastSummaryCard';
import { ForecastChart } from '@/components/forecast/ForecastChart';
import { ActiveInstallmentsList } from '@/components/forecast/ActiveInstallmentsList';

export default function ForecastPage() {
  const { data, loading, monthsCount, setMonthsCount } = useForecast();

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.12 } },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
  };

  if (loading && !data) {
    return (
      <div className="p-8 text-center text-gray-500 animate-pulse">
        Calculando proyección de cuotas y flujo de caja...
      </div>
    );
  }

  return (
    <motion.div
      className="p-6 pb-28 flex flex-col gap-6"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Header */}
      <motion.header variants={itemVariants} className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-2 -ml-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Proyección</h1>
            <p className="text-xs text-gray-500 mt-0.5">Anticipá tus compromisos de cuotas</p>
          </div>
        </div>

        {/* Selector de Horizonte */}
        <div className="flex bg-gray-100 p-1 rounded-2xl gap-1">
          {[3, 6, 12].map((m) => (
            <button
              key={m}
              onClick={() => setMonthsCount(m)}
              className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all ${
                monthsCount === m
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {m}m
            </button>
          ))}
        </div>
      </motion.header>

      {data && (
        <>
          {/* Card resumen ejecutivo */}
          <ForecastSummaryCard data={data} itemVariants={itemVariants} />

          {/* Gráfico de barras apiladas de cuotas + fijos */}
          <ForecastChart timeline={data.forecastTimeline} itemVariants={itemVariants} />

          {/* Listado de compras en cuotas activas */}
          <ActiveInstallmentsList plans={data.activePlans} itemVariants={itemVariants} />
        </>
      )}
    </motion.div>
  );
}
