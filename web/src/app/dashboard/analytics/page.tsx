"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { TrendingDown, TrendingUp, PieChart as PieChartIcon } from "lucide-react";

interface CategoryData {
  name: string;
  color: string;
  total: number;
}

interface AnalyticsData {
  currentMonthTotal: number;
  lastMonthTotal: number;
  percentageChange: number;
  categoryBreakdown: CategoryData[];
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const result = await apiFetch('/analytics/monthly');
      setData(result);
    } catch (error) {
      console.error("Error cargando analíticas:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Analizando tus gastos...</div>;
  }

  if (!data) return null;

  // Lógica simple para la tendencia
  const isGoodTrend = data.percentageChange <= 0; // Gastar menos o igual es "bueno"
  const TrendIcon = isGoodTrend ? TrendingDown : TrendingUp;
  const trendColor = isGoodTrend ? "text-emerald-600" : "text-pink-600";
  const trendBg = isGoodTrend ? "bg-emerald-50" : "bg-pink-50";

  return (
    <div className="p-6 pb-24 flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Análisis</h1>
        <p className="text-sm text-gray-500 mt-1">Tu radiografía financiera del mes.</p>
      </header>

      {/* TARJETA DE TENDENCIA (Mes actual vs Mes pasado) */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">Gastos del mes</p>
          <span className="text-2xl font-bold text-gray-900">
            ${data.currentMonthTotal.toLocaleString('es-AR')}
          </span>
        </div>
        
        <div className={`flex flex-col items-end p-3 rounded-2xl ${trendBg}`}>
          <div className={`flex items-center gap-1 ${trendColor} font-bold text-sm`}>
            <TrendIcon className="w-4 h-4" />
            <span>{Math.abs(data.percentageChange)}%</span>
          </div>
          <span className={`text-xs ${trendColor} opacity-80 mt-0.5`}>vs. mes pasado</span>
        </div>
      </div>

      {/* GRÁFICO DE DONA */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center">
        <div className="flex items-center gap-2 w-full mb-4">
          <PieChartIcon className="w-5 h-5 text-sky-500" />
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">¿En qué gastaste?</h3>
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
                  formatter={(value: number) => [`$${value.toLocaleString('es-AR')}`, 'Total']}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Texto en el centro de la dona */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xs text-gray-400 font-medium">Total</span>
              <span className="text-lg font-bold text-gray-800">${data.currentMonthTotal.toLocaleString('es-AR')}</span>
            </div>
          </div>
        )}
      </div>

      {/* LISTA DETALLADA DE CATEGORÍAS */}
      {data.categoryBreakdown.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-2">Detalle por categoría</h3>
          {data.categoryBreakdown.map((cat, index) => (
            <div key={index} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cat.color }}></div>
                <span className="font-semibold text-gray-800 text-sm">{cat.name}</span>
              </div>
              <span className="font-bold text-gray-900 text-sm">
                ${cat.total.toLocaleString('es-AR')}
              </span>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}