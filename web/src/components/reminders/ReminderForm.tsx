import { motion, Variants } from "framer-motion";
import { CalendarClock } from "lucide-react";
import { ReminderFormState } from "@/types/reminders";

interface ReminderFormProps {
  form: ReminderFormState;
  handleSubmit: (e: React.FormEvent) => void;
  itemVariants: Variants;
}

export function ReminderForm({ form, handleSubmit, itemVariants }: ReminderFormProps) {
  return (
    <motion.form 
      variants={itemVariants}
      onSubmit={handleSubmit} 
      className="bg-white p-5 rounded-2xl shadow-sm border border-pink-100"
    >
      <h2 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-wider flex items-center gap-2">
        <CalendarClock className="w-4 h-4 text-pink-400" />
        Agendar Pago
      </h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">¿Qué hay que pagar?</label>
          <input 
            type="text" required value={form.title} onChange={(e) => form.setTitle(e.target.value)}
            placeholder="Ej: Alquiler, Tarjeta, Luz..."
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400"
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">Monto (Opcional)</label>
            <input 
              type="number" step="0.01" inputMode="decimal" value={form.amount} onChange={(e) => form.setAmount(e.target.value)}
              placeholder="Ej: 45000"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">Fecha de Vencimiento</label>
            <input 
              type="date" required value={form.dueDate} onChange={(e) => form.setDueDate(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400"
            />
          </div>
        </div>

        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit" disabled={form.isSubmitting}
          className="w-full mt-2 bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          {form.isSubmitting ? 'Guardando...' : 'Guardar Recordatorio'}
        </motion.button>
      </div>
    </motion.form>
  );
}