"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  colorHex: string | null;
  icon: string | null;
}

interface Transaction {
  id: string;
  amount: number | string;
  date: string;
  note: string | null;
  category: Category;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tab, setTab] = useState<'expense' | 'income'>('expense');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [transData, catData] = await Promise.all([
        apiFetch('/transactions'),
        apiFetch('/categories')
      ]);
      setTransactions(transData);
      setCategories(catData);
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await apiFetch('/transactions', {
        method: 'POST',
        body: JSON.stringify({
          amount: Number(amount),
          categoryId,
          note: note || undefined,
        }),
      });
      
      setAmount("");
      setNote("");
      setCategoryId("");
      await fetchInitialData();
    } catch (error) {
      console.error("Error creando transacción:", error);
      alert("Hubo un error al guardar el movimiento");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCategories = categories.filter(cat => cat.type === tab);

  if (loading) {
    return <div className="p-8 text-gray-500">Cargando motor financiero...</div>;
  }

  return (
    <div className="p-6 pb-24">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Movimientos</h1>
        <p className="text-sm text-gray-500 mt-1">Registrá tus ingresos y gastos.</p>
      </header>

      <div className="flex flex-col gap-8">
        {/* Formulario apilado arriba */}
        <form onSubmit={handleSubmit} className="bg-white p-5 rounded-2xl shadow-sm border border-sky-100">
          <div className="flex bg-gray-100 p-1 rounded-xl mb-5">
            <button
              type="button"
              onClick={() => { setTab('expense'); setCategoryId(""); }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${tab === 'expense' ? 'bg-white shadow-sm text-orange-600' : 'text-gray-500'}`}
            >
              Gasto
            </button>
            <button
              type="button"
              onClick={() => { setTab('income'); setCategoryId(""); }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${tab === 'income' ? 'bg-white shadow-sm text-sky-600' : 'text-gray-500'}`}
            >
              Ingreso
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Monto ($)</label>
              <input 
                type="number" 
                inputMode="decimal" // ¡Clave para celulares!
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Ej: 15000"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xl font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Categoría</label>
              <select 
                required
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="" disabled>Seleccionar...</option>
                {filteredCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Nota (Opcional)</label>
              <input 
                type="text" 
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ej: Supermercado"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting || !categoryId}
              className={`w-full mt-2 font-medium py-3 rounded-xl transition-colors text-white ${tab === 'expense' ? 'bg-gray-900' : 'bg-sky-600'}`}
            >
              {isSubmitting ? 'Registrando...' : 'Registrar'}
            </button>
          </div>
        </form>

        {/* Historial apilado abajo */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-gray-800 mb-2">Recientes</h2>
          {transactions.length === 0 ? (
            <div className="p-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-center text-gray-500 text-sm">
              Sin movimientos.
            </div>
          ) : (
            transactions.map(t => {
              const isIncome = t.category?.type === 'income';
              const formattedDate = new Date(t.date).toLocaleDateString('es-AR', {
                day: '2-digit', month: 'short'
              });

              return (
                <div key={t.id} className="p-3 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-xl bg-opacity-20"
                      style={{ backgroundColor: t.category?.colorHex ? `${t.category.colorHex}30` : '#f3f4f6' }}
                    >
                      <span>{t.category?.icon || '📁'}</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm">{t.category?.name || 'Sin Categoría'}</h3>
                      <p className="text-xs text-gray-500">{t.note || 'Sin detalles'} • {formattedDate}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-base font-bold ${isIncome ? 'text-sky-600' : 'text-gray-900'}`}>
                      {isIncome ? '+' : '-'}${Number(t.amount).toLocaleString('es-AR')}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}