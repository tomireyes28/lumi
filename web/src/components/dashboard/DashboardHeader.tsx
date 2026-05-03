import Link from "next/link";
import { motion, Variants } from "framer-motion";
import { Calendar as CalendarIcon, Bell } from "lucide-react";
import { DashboardSummary } from "@/types/dashboard";
import { Reminder } from "@/types/reminders";

interface DashboardHeaderProps {
  summary: DashboardSummary | null;
  reminders: Reminder[];
  itemVariants: Variants;
}

export function DashboardHeader({ summary, reminders, itemVariants }: DashboardHeaderProps) {
  return (
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
  );
}