"use client";

import { Wallet, TrendingUp, TrendingDown, CreditCard, Sparkles, BellRing, Calendar as CalendarIcon, Bell } from "lucide-react";
import Link from "next/link";
import { motion, Variants } from "framer-motion"; // <-- Importamos Variants
import { useDashboard } from "@/hooks/useDashboard";

export default function DashboardHomePage() {
  const { summary, recommendation, reminders, dueToday, loading } = useDashboard();

  // Tipamos estrictamente las animaciones
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
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
      
      {/* HEADER */}
      <motion.header variants={itemVariants} className="mb-2 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hola, Aylu 👋</h1>
          <p className="text-sm text-gray-500 mt-1">Acá está tu resumen de {summary?.period || 'este mes'}.</p>
        </div>
        
        <div className="flex gap-2">
          <Link href="/dashboard/calendar" className="p-2.5 bg-gray-100/80 rounded-full text-gray-600 hover:bg-gray-200 transition-colors">
            <CalendarIcon className="w-5 h-5" />
          </Link>
          <Link href="/dashboard/reminders" className="p-2.5 bg-gray-100/80 rounded-full text-gray-600 hover:bg-gray-200 transition-colors relative">
            <Bell className="w-5 h-5" />
            {reminders.some(r => !r.isPaid) && (
              <span className="absolute top-2 right-2.5 w-2 h-2 bg-pink-500 rounded-full border-2 border-gray-100"></span>
            )}
          </Link>
        </div>
      </motion.header>

      {/* BANNER DE VENCIMIENTOS */}
      {dueToday.length > 0 && (
        <motion.div variants={itemVariants}>
          <Link href="/dashboard/reminders" className="block cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]">
            <div className="bg-pink-50 p-4 rounded-2xl shadow-sm border border-brand-expense flex flex-col gap-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-brand-expense opacity-10 rounded-full -mr-8 -mt-8"></div>
              
              <div className="flex items-center gap-2 relative z-10">
                <BellRing className="w-5 h-5 text-pink-500 animate-pulse" />
                <h3 className="text-xs font-bold text-pink-600 uppercase tracking-wider">¡Vencimientos de hoy!</h3>
              </div>
              
              <div className="flex flex-col gap-2 relative z-10">
                {dueToday.map(reminder => (
                  <div key={reminder.id} className="flex justify-between items-center bg-white/60 p-2 rounded-lg">
                    <span className="text-sm font-bold text-gray-800">{reminder.title}</span>
                    {reminder.amount && (
                      <span className="text-sm font-bold text-pink-600">${Number(reminder.amount).toLocaleString('es-AR')}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </Link>
        </motion.div>
      )}

      {/* BANNER DE RECOMENDACIÓN INTELIGENTE */}
      {recommendation && (
        <motion.div variants={itemVariants} className="bg-brand-accent p-4 rounded-2xl shadow-sm border border-orange-300 flex items-start gap-4">
          <div className="p-2 bg-white/60 rounded-xl text-orange-600 shrink-0 mt-1">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-orange-900 uppercase tracking-wider mb-1">Tarjeta Ideal Hoy</h3>
            <p className="text-sm text-orange-900 leading-snug">
              Pagá con la <span className="font-bold">💳 {recommendation.card.alias}</span>. {recommendation.message}
            </p>
          </div>
        </motion.div>
      )}

      {/* TARJETA PRINCIPAL */}
      <motion.div variants={itemVariants} className="bg-linear-to-br from-gray-900 to-gray-800 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-5 rounded-full -mr-10 -mt-10"></div>
        
        <div className="relative z-10 flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-gray-300 uppercase tracking-wider">Plata Disponible</span>
          <Wallet className="w-6 h-6 text-sky-400" />
        </div>
        
        <div className="relative z-10">
          <span className="text-4xl font-bold tracking-tight">
            ${summary?.availableCash.toLocaleString('es-AR')}
          </span>
          <p className="text-xs text-gray-400 mt-2 font-medium">
            (Ingresos menos gastos en efectivo)
          </p>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 gap-4">
        {/* TARJETA SECUNDARIA: Ingresos */}
        <motion.div variants={itemVariants} className="bg-white p-4 rounded-2xl border border-sky-100 shadow-sm flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-sky-50 rounded-lg text-sky-600">
              <TrendingUp className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-gray-600 uppercase">Ingresos</span>
          </div>
          <span className="text-lg font-bold text-gray-900">
            ${summary?.totalIncome.toLocaleString('es-AR')}
          </span>
        </motion.div>

        {/* TARJETA SECUNDARIA: Gastos Efectivo */}
        <motion.div variants={itemVariants} className="bg-white p-4 rounded-2xl border border-orange-100 shadow-sm flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
              <TrendingDown className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-gray-600 uppercase">Efectivo</span>
          </div>
          <span className="text-lg font-bold text-gray-900">
            ${summary?.totalCashExpense.toLocaleString('es-AR')}
          </span>
        </motion.div>
      </div>

      {/* TARJETA TERCIARIA: Consumos con Tarjeta */}
      <motion.div variants={itemVariants} className="bg-white p-5 rounded-2xl border border-purple-100 shadow-sm flex items-center justify-between mt-2">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-purple-50 rounded-xl text-purple-600">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">A pagar en tarjetas</h3>
            <p className="text-xs text-gray-500 font-medium">Consumos del ciclo actual</p>
          </div>
        </div>
        <span className="text-xl font-bold text-purple-700">
          ${summary?.totalCardExpense.toLocaleString('es-AR')}
        </span>
      </motion.div>

    </motion.div>
  );
}