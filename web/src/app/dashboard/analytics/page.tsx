"use client";

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

      <AnalyticsCategoryList 
        data={data} 
        itemVariants={itemVariants} 
      />
      
    </motion.div>
  );
}