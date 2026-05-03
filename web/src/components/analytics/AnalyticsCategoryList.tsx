import { motion, Variants } from "framer-motion";
import { AnalyticsData } from "@/types/analytics";

interface AnalyticsCategoryListProps {
  data: AnalyticsData;
  itemVariants: Variants;
}

export function AnalyticsCategoryList({ data, itemVariants }: AnalyticsCategoryListProps) {
  if (data.categoryBreakdown.length === 0) return null;

  return (
    <motion.div variants={itemVariants} className="flex flex-col gap-3">
      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-2">
        Detalle por categoría
      </h3>
      {data.categoryBreakdown.map((cat, index) => (
        <motion.div
          key={index}
          variants={itemVariants} 
          className="bg-white p-4 rounded-2xl shadow-sm border border-gray-50 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: cat.color }}
            ></div>
            <span className="font-semibold text-gray-800 text-sm">
              {cat.name}
            </span>
          </div>
          <span className="font-bold text-gray-900 text-sm">
            ${cat.total.toLocaleString("es-AR")}
          </span>
        </motion.div>
      ))}
    </motion.div>
  );
}