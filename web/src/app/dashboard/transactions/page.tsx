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

  // Estados del formulario de carga
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tab, setTab] = useState<'expense' | 'income'>('expense');

  // NUEVO: Estado para el filtro del historial
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');

  // Cargamos categorías una sola vez al inicio
  useEffect(() => {
    loadCategories();
  }, []);

  // Recargamos las transacciones CADA VEZ que cambia el filtro
  useEffect(() => {
    loadTransactions();
  }, [filterType]);

  const loadCategories = async () => {
    try {
      const data = await apiFetch('/categories');
      setCategories(data);
    } catch (error) {
      console.error("Error cargando categorías:", error);
    }
  };

  const loadTransactions = async () => {
    setLoading(true);
    try {
      // Armamos la URL dinámicamente según el filtro elegido
      const queryParams = new URLSearchParams();
      if (filterType !== 'all') {
        queryParams.append('type', filterType);
      }
      
      const data = await apiFetch(`/transactions?${queryParams.toString()}`);
      setTransactions(data);
    } catch (error) {
      console.error("Error cargando transacciones:", error);
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
      // Recargamos la lista para ver el movimiento nuevo
      await loadTransactions(); 
    } catch (error) {
      console.error("Error creando transacción:", error);
      alert("Hubo un error al guardar el movimiento");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCategories = categories.filter(cat => cat.type === tab);

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
                inputMode="decimal"
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

        {/* Historial con Filtros Mobile-First */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-gray-800">Recientes</h2>
          
          {/* Chips de filtrado horizontal */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => setFilterType('all')}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition-colors border ${filterType === 'all' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200'}`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterType('expense')}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition-colors border ${filterType === 'expense' ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-white text-gray-600 border-gray-200'}`}
            >
              Solo Gastos
            </button>
            <button
              onClick={() => setFilterType('income')}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition-colors border ${filterType === 'income' ? 'bg-sky-100 text-sky-700 border-sky-200' : 'bg-white text-gray-600 border-gray-200'}`}
            >
              Solo Ingresos
            </button>
          </div>

          {loading ? (
            <div className="text-center p-4 text-sm text-gray-400">Filtrando...</div>
          ) : transactions.length === 0 ? (
            <div className="p-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-center text-gray-500 text-sm">
              No hay movimientos con este filtro.
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