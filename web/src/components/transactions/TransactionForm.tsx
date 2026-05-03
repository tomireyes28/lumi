import { motion, AnimatePresence, Variants } from "framer-motion";
import { Category } from "@/types/categories";
import { CreditCard } from "@/types/cards";

export interface TransactionFormState {
  amount: string;
  setAmount: (value: string) => void;
  categoryId: string;
  setCategoryId: (value: string) => void;
  creditCardId: string;
  setCreditCardId: (value: string) => void;
  note: string;
  setNote: (value: string) => void;
  isSubmitting: boolean;
}

interface TransactionFormProps {
  tab: 'expense' | 'income';
  setTab: (tab: 'expense' | 'income') => void;
  form: TransactionFormState; 
  cards: CreditCard[];
  filteredCategories: Category[];
  handleSubmit: (e: React.FormEvent) => void;
  itemVariants: Variants; 
}

export function TransactionForm({ 
  tab, setTab, form, cards, filteredCategories, handleSubmit, itemVariants 
}: TransactionFormProps) {
  return (
    <motion.form 
      variants={itemVariants} 
      onSubmit={handleSubmit} 
      className="bg-white p-5 rounded-2xl shadow-sm border border-sky-100"
    >
      {/* Pestañas Gasto/Ingreso */}
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
  );
}