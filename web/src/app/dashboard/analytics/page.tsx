'use client';

import Link from 'next/link';
import { TrendingUp, ChevronRight, AlertTriangle, RefreshCw } from 'lucide-react';
import { motion, Variants } from 'framer-motion';
import { useAnalytics } from '@/hooks/useAnalytics';
import { AnalyticsTrendCard } from '@/components/analytics/AnalyticsTrendCard';
import { AnalyticsChart } from '@/components/analytics/AnalyticsChart';
import { AnalyticsCategoryList } from '@/components/analytics/AnalyticsCategoryList';

export default function AnalyticsPage() {
  const { data, loading, error, reload, isGoodTrend } = useAnalytics();

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: 'easeOut' },
    },
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500 animate-pulse">
        Analizando tus gastos...
      </div>
    );
  }

  return (
    <motion.div
      className="p-6 pb-24 flex flex-col gap-6"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.header variants={itemVariants}>
        <h1 className="text-2xl font-bold text-gray-900">Análisis</h1>
        <p className="text-sm text-gray-500 mt-1">
          Tu radiografía financiera del mes.
        </p>
      </motion.header>

      {error || !data ? (
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
              No pudimos cargar las analíticas
            </h2>
            <p className="text-xs text-gray-600 mt-1">
              {error || 'Ocurrió un problema al consultar tus movimientos del mes.'}
            </p>
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
        <>
          <AnalyticsTrendCard
            data={data}
            isGoodTrend={isGoodTrend}
            itemVariants={itemVariants}
          />

          <AnalyticsChart data={data} itemVariants={itemVariants} />

          <motion.div variants={itemVariants}>
            <Link
              href="/dashboard/forecast"
              className="p-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white rounded-3xl shadow-sm flex items-center justify-between hover:opacity-95 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/20 rounded-2xl group-hover:scale-105 transition-transform">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-sm leading-tight">
                    Proyección de Cuotas
                  </h4>
                  <p className="text-xs text-purple-100 mt-0.5">
                    Anticipá tus compromisos de los próximos meses
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-white/70 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </motion.div>

          <AnalyticsCategoryList data={data} itemVariants={itemVariants} />
        </>
      )}
    </motion.div>
  );
}
