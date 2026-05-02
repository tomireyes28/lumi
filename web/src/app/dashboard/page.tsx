"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Wallet, TrendingUp, TrendingDown, CreditCard, Sparkles } from "lucide-react";

interface SummaryData {
  period: string;
  totalIncome: number;
  totalCashExpense: number;
  totalCardExpense: number;
  availableCash: number;
}

interface CardRecommendation {
  card: {
    alias: string;
    lastFour: string;
  };
  daysToClose: number;
  message: string;
}

export default function DashboardHomePage() {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [recommendation, setRecommendation] = useState<CardRecommendation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Hacemos las dos consultas en paralelo para que cargue más rápido
      const [summaryData, recData] = await Promise.all([
        apiFetch('/transactions/summary'),
        apiFetch('/credit-cards/recommendation').catch(() => null) // Si falla (ej. no hay tarjetas), no rompe todo
      ]);
      setSummary(summaryData);
      setRecommendation(recData);
    } catch (error) {
      console.error("Error cargando el dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Calculando tus finanzas...</div>;
  }

  return (
    <div className="p-6 pb-24 flex flex-col gap-6">
      <header className="mb-2">
        <h1 className="text-2xl font-bold text-gray-900">Hola, Aylu 👋</h1>
        <p className="text-sm text-gray-500 mt-1">Acá está tu resumen de {summary?.period || 'este mes'}.</p>
      </header>

      {/* BANNER DE RECOMENDACIÓN INTELIGENTE */}
      {recommendation && (
        <div className="bg-[#FDBA74] p-4 rounded-2xl shadow-sm border border-orange-300 flex items-start gap-4">
          <div className="p-2 bg-white/60 rounded-xl text-orange-600 shrink-0 mt-1">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-orange-900 uppercase tracking-wider mb-1">Tarjeta Ideal Hoy</h3>
            <p className="text-sm text-orange-900 leading-snug">
              Pagá con la <span className="font-bold">💳 {recommendation.card.alias}</span>. {recommendation.message}
            </p>
          </div>
        </div>
      )}

      {/* TARJETA PRINCIPAL: Plata Disponible (Caja) */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
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
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* TARJETA SECUNDARIA: Ingresos */}
        <div className="bg-white p-4 rounded-2xl border border-sky-100 shadow-sm flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-sky-50 rounded-lg text-sky-600">
              <TrendingUp className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-gray-600 uppercase">Ingresos</span>
          </div>
          <span className="text-lg font-bold text-gray-900">
            ${summary?.totalIncome.toLocaleString('es-AR')}
          </span>
        </div>

        {/* TARJETA SECUNDARIA: Gastos Efectivo */}
        <div className="bg-white p-4 rounded-2xl border border-orange-100 shadow-sm flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
              <TrendingDown className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-gray-600 uppercase">Efectivo</span>
          </div>
          <span className="text-lg font-bold text-gray-900">
            ${summary?.totalCashExpense.toLocaleString('es-AR')}
          </span>
        </div>
      </div>

      {/* TARJETA TERCIARIA: Consumos con Tarjeta */}
      <div className="bg-white p-5 rounded-2xl border border-purple-100 shadow-sm flex items-center justify-between mt-2">
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
      </div>

    </div>
  );
}