import { memo } from 'react';
import { motion, Variants } from 'framer-motion';
import { CalendarRange } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import { ForecastMonthItem } from '@/types/forecast';

interface ForecastChartProps {
  timeline: ForecastMonthItem[];
  itemVariants?: Variants;
}

export const ForecastChart = memo(function ForecastChart({
  timeline,
  itemVariants,
}: ForecastChartProps) {
  const chartData = timeline.map((item) => ({
    name: item.period,
    label: item.label,
    Cuotas: item.installmentExpenses,
    Fijos: item.fixedExpenses,
    total: item.totalCommitted,
    libre: Math.max(0, item.projectedNetCashflow),
  }));

  const hasData = chartData.some((d) => d.Cuotas > 0 || d.Fijos > 0);

  return (
    <motion.div
      variants={itemVariants}
      className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarRange className="w-5 h-5 text-purple-600" />
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
            Compromisos por Mes
          </h3>
        </div>
      </div>

      {!hasData ? (
        <div className="py-12 text-center text-gray-400 text-sm">
          No hay cuotas ni gastos fijos comprometidos para este período.
        </div>
      ) : (
        <div className="w-full h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis
                stroke="#94a3b8"
                fontSize={10}
                tickLine={false}
                tickFormatter={(val) => (val >= 1000 ? `$${Math.round(val / 1000)}k` : `$${val}`)}
              />
              <Tooltip
                formatter={(val: unknown) => [`$${Number(val || 0).toLocaleString('es-AR')}`]}
                contentStyle={{
                  borderRadius: '16px',
                  border: '1px solid #f1f5f9',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  fontSize: '12px',
                }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                wrapperStyle={{ paddingBottom: '10px', fontSize: '11px' }}
              />
              <Bar dataKey="Cuotas" stackId="a" fill="#8b5cf6" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Fijos" stackId="a" fill="#f59e0b" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  );
});
