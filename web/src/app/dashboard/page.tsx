'use client';

import { motion, Variants } from 'framer-motion';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useDashboard } from '@/hooks/useDashboard';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import {
  DueTodayBanner,
  RecommendationBanner,
} from '@/components/dashboard/DashboardBanners';
import { DashboardStats } from '@/components/dashboard/DashboardStats';

export default function DashboardHomePage() {
  const { summary, recommendation, reminders, dueToday, loading, error, reload } =
    useDashboard();

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500 animate-pulse">
        Calculando tus finanzas...
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
      <DashboardHeader
        summary={summary}
        reminders={reminders}
        itemVariants={itemVariants}
      />

      {error && !summary ? (
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
              No pudimos cargar tu resumen financiero
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
        <>
          <DashboardStats summary={summary} itemVariants={itemVariants} />

          <DueTodayBanner dueToday={dueToday} itemVariants={itemVariants} />

          <RecommendationBanner
            recommendation={recommendation}
            itemVariants={itemVariants}
          />
        </>
      )}
    </motion.div>
  );
}
