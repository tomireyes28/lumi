"use client";

import Link from "next/link";
import { TrendingUp, ChevronRight } from "lucide-react";
import { motion, Variants } from "framer-motion";
import { useAnalytics } from "@/hooks/useAnalytics";
import { AnalyticsTrendCard } from "@/components/analytics/AnalyticsTrendCard";
import { AnalyticsChart } from "@/components/analytics/AnalyticsChart";
import { AnalyticsCategoryList } from "@/components/analytics/AnalyticsCategoryList";

export default function AnalyticsPage() {
  const { data, loading, isGoodTrend } = useAnalytics();

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
      transition: { duration: 0.5, ease: "easeOut" },
    },
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500 animate-pulse">
        Analizando tus gastos...
      </div>
    );
  }

  if (!data) return null;

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

      <AnalyticsTrendCard 
        data={data} 
        isGoodTrend={isGoodTrend} 
        itemVariants={itemVariants} 
      />

      <AnalyticsChart 
        data={data} 
        itemVariants={itemVariants} 
      />

      {/* Acceso directo a Proyección de Cuotas */}
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
              <h4 className="font-bold text-sm leading-tight">Proyección de Cuotas</h4>
              <p className="text-xs text-purple-100 mt-0.5">Anticipá tus compromisos de los próximos meses</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-white/70 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </motion.div>

      <AnalyticsCategoryList 
        data={data} 
        itemVariants={itemVariants} 
      />
      
    </motion.div>
  );
}