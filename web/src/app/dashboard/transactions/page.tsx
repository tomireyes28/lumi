"use client";

import { Trash2 } from "lucide-react"; 
import { motion, Variants, AnimatePresence } from "framer-motion";
import { useTransactions } from "@/hooks/useTransactions";

export default function TransactionsPage() {
  const { 
    transactions, cards, loading, 
    form, tab, setTab, filterType, setFilterType, 
    filteredCategories, handleSubmit, handleDelete 
  } = useTransactions();

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } }
  };

  return (
    <motion.div 
      className="p-6 pb-24"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.header variants={itemVariants} className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Movimientos</h1>
        <p className="text-sm text-gray-500 mt-1">Registrá tus ingresos y gastos.</p>
      </motion.header>

      <div className="flex flex-col gap-8">
        
        {/* FORMULARIO */}
        <motion.form 
          variants={itemVariants} 
          onSubmit={handleSubmit} 
          className="bg-white p-5 rounded-2xl shadow-sm border border-sky-100"
        >
          <div className="flex bg-gray-100 p-1 rounded-xl mb-5">
            <button
              type="button"
              onClick={() => { setTab('expense'); form.setCategoryId(""); form.setCreditCardId(""); }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${tab === 'expense' ? 'bg-white shadow-sm text-orange-600' : 'text-gray-500'}`}
            >
              Gasto
            </button>
            <button
              type="button"
              onClick={() => { setTab('income'); form.setCategoryId(""); form.setCreditCardId(""); }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${tab === 'income' ? 'bg-white shadow-sm text-sky-600' : 'text-gray-500'}`}
            >
              Ingreso
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Monto ($)</label>
              <input 
                type="number" inputMode="decimal" step="0.01" required value={form.amount} onChange={(e) => form.setAmount(e.target.value)}
                placeholder="Ej: 15000"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xl font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Categoría</label>
              <select 
                required value={form.categoryId} onChange={(e) => form.setCategoryId(e.target.value)}
                className="w-full px-3 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="" disabled>Seleccionar...</option>
                {filteredCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                ))}
              </select>
            </div>

            <AnimatePresence>
              {tab === 'expense' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <label className="block text-xs font-medium text-gray-700 mb-1 mt-1">Medio de Pago</label>
                  <select 
                    value={form.creditCardId} onChange={(e) => form.setCreditCardId(e.target.value)}
                    className="w-full px-3 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                  >
                    <option value="">💵 Efectivo / Débito (Ya pagado)</option>
                    {cards.map(card => (
                      <option key={card.id} value={card.id}>
                        💳 {card.alias} (...{card.lastFour})
                      </option>
                    ))}
                  </select>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Nota (Opcional)</label>
              <input 
                type="text" value={form.note} onChange={(e) => form.setNote(e.target.value)}
                placeholder="Ej: Supermercado"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit" disabled={form.isSubmitting || !form.categoryId}
              className={`w-full mt-2 font-medium py-3 rounded-xl transition-colors text-white ${tab === 'expense' ? 'bg-gray-900' : 'bg-sky-600'}`}
            >
              {form.isSubmitting ? 'Registrando...' : 'Registrar'}
            </motion.button>
          </div>
        </motion.form>

        {/* LISTA HISTORIAL */}
        <motion.div variants={itemVariants} className="space-y-3">
          <h2 className="text-lg font-bold text-gray-800">Recientes</h2>
          
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button onClick={() => setFilterType('all')} className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition-colors border ${filterType === 'all' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200'}`}>Todos</button>
            <button onClick={() => setFilterType('expense')} className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition-colors border ${filterType === 'expense' ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-white text-gray-600 border-gray-200'}`}>Solo Gastos</button>
            <button onClick={() => setFilterType('income')} className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition-colors border ${filterType === 'income' ? 'bg-sky-100 text-sky-700 border-sky-200' : 'bg-white text-gray-600 border-gray-200'}`}>Solo Ingresos</button>
          </div>

          <div className="min-h-50 relative">
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-400 animate-pulse">Filtrando...</div>
            ) : transactions.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-center text-gray-500 text-sm">
                No hay movimientos con este filtro.
              </motion.div>
            ) : (
              <div className="flex flex-col gap-2">
                <AnimatePresence mode="popLayout">
                  {transactions.map(t => {
                    const isIncome = t.category?.type === 'income';
                    const formattedDate = new Date(t.date).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });

                    return (
                      <motion.div 
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9, x: -50 }}
                        transition={{ duration: 0.2 }}
                        key={t.id} 
                        className="p-3 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-between relative"
                      >
                        {t.creditCard && (
                          <span className="absolute top-2 right-12 text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md flex items-center gap-1">
                            💳 {t.creditCard.alias}
                          </span>
                        )}
                        
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl bg-opacity-20" style={{ backgroundColor: t.category?.colorHex ? `${t.category.colorHex}30` : '#f3f4f6' }}>
                            <span>{t.category?.icon || '📁'}</span>
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900 text-sm">{t.category?.name || 'Sin Categoría'}</h3>
                            <p className="text-xs text-gray-500">{t.note || 'Sin detalles'} • {formattedDate}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className={`text-base font-bold block ${isIncome ? 'text-sky-600' : 'text-gray-900'}`}>
                              {isIncome ? '+' : '-'}${Number(t.amount).toLocaleString('es-AR')}
                            </span>
                          </div>
                          <button 
                            onClick={() => handleDelete(t.id)}
                            className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Borrar movimiento"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}