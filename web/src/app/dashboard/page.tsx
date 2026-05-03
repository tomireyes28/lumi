"use client";

import { motion, Variants } from "framer-motion";
import { useDashboard } from "@/hooks/useDashboard";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DueTodayBanner, RecommendationBanner } from "@/components/dashboard/DashboardBanners";
import { DashboardStats } from "@/components/dashboard/DashboardStats";

export default function DashboardHomePage() {
  const { summary, recommendation, reminders, dueToday, loading } = useDashboard();

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500 animate-pulse">Calculando tus finanzas...</div>;
  }

  return (
    <motion.div 
      className="p-6 pb-24 flex flex-col gap-6"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* 1. Header (Saludo y Botones) */}
      <DashboardHeader 
        summary={summary} 
        reminders={reminders} 
        itemVariants={itemVariants} 
      />

      {/* 2. LO MÁS IMPORTANTE: El Saldo Actual */}
      <DashboardStats 
        summary={summary} 
        itemVariants={itemVariants} 
      />

      {/* 3. URGENCIA: Vencimientos de Hoy */}
      <DueTodayBanner 
        dueToday={dueToday} 
        itemVariants={itemVariants} 
      />

      {/* 4. INTELIGENCIA: Recomendación de Tarjeta */}
      <RecommendationBanner 
        recommendation={recommendation} 
        itemVariants={itemVariants} 
      />
    </motion.div>
  );
}