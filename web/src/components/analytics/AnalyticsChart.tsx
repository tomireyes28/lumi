import { motion, Variants } from "framer-motion";
import { PieChart as PieChartIcon } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { AnalyticsData } from "@/types/analytics";

interface AnalyticsChartProps {
  data: AnalyticsData;
  itemVariants: Variants;
}

export function AnalyticsChart({ data, itemVariants }: AnalyticsChartProps) {
  return (
    <motion.div
      variants={itemVariants}
      className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center"
    >
      <div className="flex items-center gap-2 w-full mb-4">
        <PieChartIcon className="w-5 h-5 text-sky-500" />
        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
          ¿En qué gastaste?
        </h3>
      </div>

      {data.categoryBreakdown.length === 0 ? (
        <div className="py-10 text-center text-gray-400 text-sm">
          Aún no hay gastos registrados este mes.
        </div>
      ) : (
        <div className="w-full h-64 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data.categoryBreakdown}
                dataKey="total"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                stroke="none"
              >
                {data.categoryBreakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
  formatter={(value) => [
    `$${Number(value || 0).toLocaleString('es-AR')}`, 
    'Total'
  ]}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xs text-gray-400 font-medium">Total</span>
            <span className="text-lg font-bold text-gray-800">
              ${data.currentMonthTotal.toLocaleString("es-AR")}
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
}