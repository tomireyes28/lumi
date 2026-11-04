'use client';

import { useId, useState } from 'react';
import { motion } from 'framer-motion';
import { Calculator, Percent, DollarSign, Target, ShoppingCart } from 'lucide-react';

export function RefundCalculator() {
  const discountId = useId();
  const capId = useId();
  const spentId = useId();

  const [discount, setDiscount] = useState<string>('');
  const [cap, setCap] = useState<string>('');
  const [spent, setSpent] = useState<string>('');

  const rawDiscount = Number(discount) || 0;
  const numDiscount = Math.min(100, Math.max(0, rawDiscount));
  const numCap = Math.max(0, Number(cap) || 0);
  const numSpent = Math.max(0, Number(spent) || 0);

  const idealSpend =
    numDiscount > 0 ? Math.round((numCap / (numDiscount / 100)) * 100) / 100 : 0;
  const calculatedRefund =
    Math.round(Math.min(numSpent * (numDiscount / 100), numCap) * 100) / 100;
  const finalCost = Math.max(0, Math.round((numSpent - calculatedRefund) * 100) / 100);

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-sky-50 rounded-xl text-sky-600">
          <Calculator className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">Simulador de Reintegros</h2>
          <p className="text-xs text-gray-500">Optimizá tus promos bancarias (0% a 100%)</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor={discountId} className="text-xs font-bold text-gray-500 uppercase">
            Descuento (%)
          </label>
          <div className="relative">
            <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              id={discountId}
              type="number"
              min="0"
              max="100"
              step="0.01"
              placeholder="Ej: 20"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-800 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={capId} className="text-xs font-bold text-gray-500 uppercase">
            Tope ($)
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              id={capId}
              type="number"
              min="0"
              step="0.01"
              placeholder="Ej: 20000"
              value={cap}
              onChange={(e) => setCap(e.target.value)}
              className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-800 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
            />
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{
          opacity: numDiscount > 0 && numCap > 0 ? 1 : 0,
          height: numDiscount > 0 && numCap > 0 ? 'auto' : 0,
        }}
        className="bg-brand-accent rounded-2xl p-4 border border-orange-200 flex items-center justify-between overflow-hidden"
      >
        <div className="flex items-center gap-3">
          <Target className="w-8 h-8 text-orange-500" />
          <div>
            <p className="text-xs font-bold text-orange-900 uppercase">
              Gasto ideal para el tope
            </p>
            <p className="text-xl font-black text-orange-600">
              ${idealSpend.toLocaleString('es-AR')}
            </p>
          </div>
        </div>
      </motion.div>

      <hr className="border-gray-100" />

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor={spentId} className="text-xs font-bold text-gray-500 uppercase">
            ¿Cuánto querés gastar ahora?
          </label>
          <div className="relative">
            <ShoppingCart className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              id={spentId}
              type="number"
              min="0"
              step="0.01"
              placeholder="Ej: 45000"
              value={spent}
              onChange={(e) => setSpent(e.target.value)}
              className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-800 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
            />
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: numSpent > 0 ? 1 : 0 }}
          className="grid grid-cols-2 gap-4"
        >
          <div className="bg-green-50 p-3 rounded-xl border border-green-100">
            <p className="text-[10px] font-bold text-green-600 uppercase mb-1">
              Te devuelven
            </p>
            <p className="text-lg font-bold text-green-700">
              ${calculatedRefund.toLocaleString('es-AR')}
            </p>
          </div>
          <div className="bg-gray-900 p-3 rounded-xl border border-gray-800 shadow-md">
            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">
              Costo final
            </p>
            <p className="text-lg font-bold text-white">
              ${finalCost.toLocaleString('es-AR')}
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
