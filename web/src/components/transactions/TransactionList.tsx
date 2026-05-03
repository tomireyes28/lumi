import { Trash2, Pencil } from "lucide-react"; 
import { motion, AnimatePresence, Variants } from "framer-motion";
import { Transaction } from "@/types/transactions";

interface TransactionListProps {
  transactions: Transaction[];
  loading: boolean;
  filterType: 'all' | 'income' | 'expense';
  setFilterType: (type: 'all' | 'income' | 'expense') => void;
  onEditClick: (tx: Transaction) => void;
  onDeleteClick: (tx: Transaction) => void;
  itemVariants: Variants; 
}

export function TransactionList({ 
  transactions, loading, filterType, setFilterType, onEditClick, onDeleteClick, itemVariants 
}: TransactionListProps) {
  return (
    <motion.div variants={itemVariants} className="space-y-3">
      <h2 className="text-lg font-bold text-gray-800">Recientes</h2>
      
      {/* Botones de Filtro */}
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
                    layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9, x: -50 }} transition={{ duration: 0.2 }}
                    key={t.id} 
                    className="p-3 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-between relative group"
                  >
                    {t.creditCard && (
                      <span className="absolute top-2 right-16 text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md flex items-center gap-1">
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

                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-base font-bold ${isIncome ? 'text-sky-600' : 'text-gray-900'}`}>
                        {isIncome ? '+' : '-'}${Number(t.amount).toLocaleString('es-AR')}
                      </span>
                      <div className="flex gap-1">
                        <button onClick={() => onEditClick(t)} className="p-1.5 text-gray-300 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors" title="Editar movimiento">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => onDeleteClick(t)} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Borrar movimiento">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}