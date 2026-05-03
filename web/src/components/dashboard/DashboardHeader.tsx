import Link from "next/link";
import { motion, Variants } from "framer-motion";
import { Calendar as CalendarIcon, Bell, BarChart3, Tags, Wallet } from "lucide-react";
import { DashboardSummary } from "@/types/dashboard";
import { Reminder } from "@/types/reminders";
import { useAuthStore } from "@/store/useAuthStore";

interface DashboardHeaderProps {
  summary: DashboardSummary | null;
  reminders: Reminder[];
  itemVariants: Variants;
}

export function DashboardHeader({ summary, reminders, itemVariants }: DashboardHeaderProps) {
  // 1. Traemos el usuario desde nuestro store global
  const user = useAuthStore((state) => state.user);
  
  // 2. Extraemos solo el primer nombre
  const firstName = user?.name ? user.name.split(" ")[0] : "Crack";

  return (
    <motion.header variants={itemVariants} className="mb-4 flex flex-col gap-6">
      
      {/* FILA SUPERIOR: Saludo, Íconos y Foto */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hola, {firstName} 👋</h1>
          <p className="text-sm text-gray-500 mt-1">Acá está tu resumen de {summary?.period || 'este mes'}.</p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Botón Calendario */}
          <Link href="/dashboard/calendar" className="p-2.5 bg-gray-100/80 rounded-full text-gray-600 hover:bg-gray-200 transition-colors">
            <CalendarIcon className="w-5 h-5" />
          </Link>
          
          {/* Botón Recordatorios (Campanita) */}
          <Link href="/dashboard/reminders" className="p-2.5 bg-gray-100/80 rounded-full text-gray-600 hover:bg-gray-200 transition-colors relative">
            <Bell className="w-5 h-5" />
            {reminders.some(r => !r.isPaid) && (
              <span className="absolute top-2 right-2.5 w-2.5 h-2.5 bg-pink-500 rounded-full border-2 border-gray-100"></span>
            )}
          </Link>

          {/* Foto de Perfil (Con link directo al perfil) */}
          <Link href="/dashboard/profile" className="ml-1 hover:opacity-80 transition-opacity">
            {user?.picture ? (
              <img 
                src={user.picture} 
                alt="Perfil" 
                referrerPolicy="no-referrer"
                className="w-10 h-10 rounded-full border-2 border-sky-100 object-cover shadow-sm" 
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 font-bold text-lg border-2 border-sky-200 shadow-sm">
                {firstName.charAt(0).toUpperCase()}
              </div>
            )}
          </Link>
        </div>
      </div>

      {/* FILA INFERIOR: Navegación Rápida */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        <Link 
          href="/dashboard/analytics" 
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 transition-all shrink-0"
        >
          <BarChart3 className="w-4 h-4 text-sky-500" />
          <span className="text-sm font-bold text-gray-700">Analíticas</span>
        </Link>
        
        <Link 
          href="/dashboard/categories" 
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 transition-all shrink-0"
        >
          <Tags className="w-4 h-4 text-orange-500" />
          <span className="text-sm font-bold text-gray-700">Categorías</span>
        </Link>
        
        <Link 
          href="/dashboard/cards" 
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-pink-300 hover:bg-pink-50 hover:text-pink-700 transition-all shrink-0"
        >
          <Wallet className="w-4 h-4 text-pink-500" />
          <span className="text-sm font-bold text-gray-700">Billetera</span>
        </Link>
      </div>

    </motion.header>
  );
}