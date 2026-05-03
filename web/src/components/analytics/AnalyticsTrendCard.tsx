import { motion, Variants } from "framer-motion";
import { TrendingDown, TrendingUp } from "lucide-react";
import { AnalyticsData } from "@/types/analytics";

interface AnalyticsTrendCardProps {
  data: AnalyticsData;
  isGoodTrend: boolean;
  itemVariants: Variants;
}

export function AnalyticsTrendCard({ data, isGoodTrend, itemVariants }: AnalyticsTrendCardProps) {
  const TrendIcon = isGoodTrend ? TrendingDown : TrendingUp;
  const trendColor = isGoodTrend ? "text-emerald-600" : "text-pink-600";
  const trendBg = isGoodTrend ? "bg-emerald-50" : "bg-pink-50";

  return (
    <motion.div
      variants={itemVariants}
      className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between"
    >
      <div>
        <p className="text-sm font-medium text-gray-500">Gastos del mes</p>
        <span className="text-2xl font-bold text-gray-900">
          ${data.currentMonthTotal.toLocaleString("es-AR")}
        </span>
      </div>

      <div className={`flex flex-col items-end p-3 rounded-2xl ${trendBg}`}>
        <div className={`flex items-center gap-1 ${trendColor} font-bold text-sm`}>
          <TrendIcon className="w-4 h-4" />
          <span>{Math.abs(data.percentageChange)}%</span>
        </div>
        <span className={`text-xs ${trendColor} opacity-80 mt-0.5`}>
          vs. mes pasado
        </span>
      </div>
    </motion.div>
  );
}