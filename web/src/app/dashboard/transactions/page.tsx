"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

// Definimos los "contratos" (Tipos)
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
  category: Category; // NestJS nos manda la categoría anidada gracias al "include"
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados del formulario
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtro de UI para hacer más fácil la carga
  const [tab, setTab] = useState<'expense' | 'income'>('expense');

  

  const fetchInitialData = async () => {
    try {
      // Hacemos las dos peticiones en paralelo para que cargue más rápido
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

  useEffect(() => {
    fetchInitialData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await apiFetch('/transactions', {
        method: 'POST',
        body: JSON.stringify({
          amount: Number(amount), // Convertimos el texto a número
          categoryId,
          note: note || undefined, // Si está vacío, no lo mandamos
        }),
      });
      
      // Limpiamos y recargamos
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

  // Filtramos las categorías para el select según la pestaña elegida (Ingreso/Gasto)
  const filteredCategories = categories.filter(cat => cat.type === tab);

  if (loading) {
    return <div className="p-8 text-gray-500">Cargando motor financiero...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto p-8">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900">Movimientos</h1>
        <p className="text-gray-500 mt-2">Registrá tus ingresos y gastos del mes.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Columna Izquierda: Formulario de Carga */}
        <div className="lg:col-span-1">
          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-sm border border-sky-100 sticky top-8">
            
            {/* Tabs Selector */}
            <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
              <button
                type="button"
                onClick={() => { setTab('expense'); setCategoryId(""); }}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${tab === 'expense' ? 'bg-white shadow-sm text-orange-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Cargar Gasto
              </button>
              <button
                type="button"
                onClick={() => { setTab('income'); setCategoryId(""); }}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${tab === 'income' ? 'bg-white shadow-sm text-sky-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Cargar Ingreso
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto ($)</label>
                <input 
                  type="number" 
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Ej: 15000"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xl font-medium focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                <select 
                  required
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-colors"
                >
                  <option value="" disabled>Seleccioná una etiqueta...</option>
                  {filteredCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </select>
                {filteredCategories.length === 0 && (
                  <p className="text-xs text-orange-500 mt-1">No tenés categorías de este tipo. ¡Creá una primero!</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nota (Opcional)</label>
                <input 
                  type="text" 
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ej: Compra de mes en Coto"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
                />
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting || !categoryId}
                className={`w-full mt-2 font-medium py-3 rounded-xl transition-colors disabled:opacity-50 text-white ${tab === 'expense' ? 'bg-gray-900 hover:bg-gray-800' : 'bg-sky-600 hover:bg-sky-700'}`}
              >
                {isSubmitting ? 'Registrando...' : `Registrar ${tab === 'expense' ? 'Gasto' : 'Ingreso'}`}
              </button>
            </div>
          </form>
        </div>

        {/* Columna Derecha: Historial */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Historial Reciente</h2>
          
          {transactions.length === 0 ? (
            <div className="p-10 bg-white rounded-2xl border border-dashed border-gray-300 text-center text-gray-500">
              Todavía no registraste ningún movimiento.
            </div>
          ) : (
            transactions.map(t => {
              const isIncome = t.category?.type === 'income';
              const formattedDate = new Date(t.date).toLocaleDateString('es-AR', {
                day: '2-digit', month: 'short'
              });

              return (
                <div key={t.id} className="p-4 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-inner bg-opacity-20"
                      style={{ backgroundColor: t.category?.colorHex ? `${t.category.colorHex}30` : '#f3f4f6' }}
                    >
                      <span style={{ color: t.category?.colorHex || '#000' }}>
                        {t.category?.icon || '📁'}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{t.category?.name || 'Sin Categoría'}</h3>
                      <p className="text-sm text-gray-500">{t.note || 'Sin detalles'} • {formattedDate}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-lg font-bold ${isIncome ? 'text-sky-600' : 'text-gray-900'}`}>
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