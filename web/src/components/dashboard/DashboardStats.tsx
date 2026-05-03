import { motion, Variants } from "framer-motion";
import { Wallet, TrendingUp, TrendingDown, CreditCard } from "lucide-react";
import { DashboardSummary } from "@/types/dashboard";

interface DashboardStatsProps {
  summary: DashboardSummary | null;
  itemVariants: Variants;
}

export function DashboardStats({ summary, itemVariants }: DashboardStatsProps) {
  return (
    <>
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
            (Ingresos menos gastos en efectivo/débito)
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
            <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Ingresos</span>
          </div>
          <span className="text-lg font-bold text-gray-900">
            ${summary?.totalIncome.toLocaleString('es-AR')}
          </span>
        </motion.div>

        {/* TARJETA SECUNDARIA: Gastos Fijos (Efectivo) */}
        <motion.div variants={itemVariants} className="bg-white p-4 rounded-2xl border border-orange-100 shadow-sm flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
              <TrendingDown className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Gastos Fijos</span>
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
    </>
  );
}