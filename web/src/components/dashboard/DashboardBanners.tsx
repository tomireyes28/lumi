import Link from "next/link";
import { motion, Variants } from "framer-motion";
import { BellRing, Sparkles } from "lucide-react";
import { Reminder } from "@/types/reminders";
import { CardRecommendation } from "@/types/dashboard";

interface DueTodayBannerProps {
  dueToday: Reminder[];
  itemVariants: Variants;
}

export function DueTodayBanner({ dueToday, itemVariants }: DueTodayBannerProps) {
  if (dueToday.length === 0) return null;

  return (
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
  );
}

interface RecommendationBannerProps {
  recommendation: CardRecommendation | null;
  itemVariants: Variants;
}

export function RecommendationBanner({ recommendation, itemVariants }: RecommendationBannerProps) {
  if (!recommendation) return null;

  return (
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
  );
}