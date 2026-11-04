'use client';

import { motion, Variants } from 'framer-motion';
import { ArrowLeft, AlertTriangle, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useForecast } from '@/hooks/useForecast';
import { ForecastSummaryCard } from '@/components/forecast/ForecastSummaryCard';
import { ForecastChart } from '@/components/forecast/ForecastChart';
import { ActiveInstallmentsList } from '@/components/forecast/ActiveInstallmentsList';

export default function ForecastPage() {
  const { data, loading, error, monthsCount, setMonthsCount, reload } =
    useForecast();

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
      <motion.header variants={itemVariants} className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            aria-label="Volver al inicio"
            className="p-2 -ml-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Proyección</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Anticipá tus compromisos de cuotas
            </p>
          </div>
        </div>

        <div
          className="flex bg-gray-100 p-1 rounded-2xl gap-1"
          role="group"
          aria-label="Horizonte de proyección en meses"
        >
          {[3, 6, 12].map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={monthsCount === m}
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

      {error ? (
        <motion.div
          variants={itemVariants}
          role="alert"
          className="bg-red-50 border border-red-200 rounded-3xl p-6 text-center flex flex-col items-center gap-3"
        >
          <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">
              No pudimos cargar la proyección
            </h2>
            <p className="text-xs text-gray-600 mt-1">{error}</p>
          </div>
          <button
            type="button"
            onClick={reload}
            className="mt-1 px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold rounded-xl inline-flex items-center gap-2 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reintentar
          </button>
        </motion.div>
      ) : (
        data && (
          <div
            className={`flex flex-col gap-6 transition-opacity ${
              loading ? 'opacity-60 pointer-events-none' : ''
            }`}
          >
            <ForecastSummaryCard data={data} itemVariants={itemVariants} />
            <ForecastChart
              timeline={data.forecastTimeline}
              itemVariants={itemVariants}
            />
            <ActiveInstallmentsList
              plans={data.activePlans}
              itemVariants={itemVariants}
            />
          </div>
        )
      )}
    </motion.div>
  );
}
