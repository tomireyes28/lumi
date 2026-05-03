import { motion, Variants } from "framer-motion";
import { CardFormState } from "@/types/cards";

interface CardFormProps {
  form: CardFormState;
  handleSubmit: (e: React.FormEvent) => void;
  itemVariants: Variants;
}

export function CardForm({ form, handleSubmit, itemVariants }: CardFormProps) {
  return (
    <motion.form 
      variants={itemVariants}
      onSubmit={handleSubmit} 
      className="bg-white p-5 rounded-2xl shadow-sm border border-sky-100"
    >
      <h2 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-wider">Nueva Tarjeta</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Alias (Nombre)</label>
          <input 
            type="text" required value={form.alias} onChange={(e) => form.setAlias(e.target.value)}
            placeholder="Ej: Visa Galicia"
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">Últimos 4 números</label>
            <input 
              type="text" required maxLength={4} minLength={4} value={form.lastFour} onChange={(e) => form.setLastFour(e.target.value)}
              placeholder="Ej: 4567" inputMode="numeric"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-center tracking-widest font-mono"
            />
          </div>
          <div className="w-20">
            <label className="block text-xs font-medium text-gray-700 mb-1">Color</label>
            <input 
              type="color" value={form.colorHex} onChange={(e) => form.setColorHex(e.target.value)}
              className="w-full h-10 p-1 border border-gray-200 rounded-xl cursor-pointer bg-gray-50"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Límite Total ($)</label>
          <input 
            type="number" required min="1" step="0.01" inputMode="decimal" value={form.limit} onChange={(e) => form.setLimit(e.target.value)}
            placeholder="Ej: 500000"
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">Día que Cierra</label>
            <input 
              type="number" required min="1" max="31" inputMode="numeric" value={form.closingDay} onChange={(e) => form.setClosingDay(e.target.value)}
              placeholder="Ej: 25"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">Día que Vence</label>
            <input 
              type="number" required min="1" max="31" inputMode="numeric" value={form.dueDay} onChange={(e) => form.setDueDay(e.target.value)}
              placeholder="Ej: 5"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>

        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit" disabled={form.isSubmitting}
          className="w-full mt-2 bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          {form.isSubmitting ? 'Guardando...' : 'Agregar Tarjeta'}
        </motion.button>
      </div>
    </motion.form>
  );
}