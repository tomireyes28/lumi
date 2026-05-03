import { motion, Variants } from "framer-motion";
import { CalendarClock } from "lucide-react";
import { ReminderFormState, Reminder } from "@/types/reminders";
import { useState } from "react";

// ==========================================
// 1. FORMULARIO DE CREACIÓN
// ==========================================
interface ReminderFormProps {
  form: ReminderFormState;
  handleSubmit: (e: React.FormEvent) => void;
  itemVariants: Variants;
}

export function ReminderForm({ form, handleSubmit, itemVariants }: ReminderFormProps) {
  return (
    <motion.form variants={itemVariants} onSubmit={handleSubmit} className="bg-white p-5 rounded-2xl shadow-sm border border-pink-100">
      <h2 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-wider flex items-center gap-2">
        <CalendarClock className="w-4 h-4 text-pink-400" />
        Agendar Pago
      </h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">¿Qué hay que pagar?</label>
          <input type="text" required value={form.title} onChange={(e) => form.setTitle(e.target.value)} placeholder="Ej: Alquiler, Tarjeta, Luz..." className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400" />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">Monto (Opcional)</label>
            <input type="number" step="0.01" inputMode="decimal" value={form.amount} onChange={(e) => form.setAmount(e.target.value)} placeholder="Ej: 45000" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400" />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">Fecha de Vencimiento</label>
            <input type="date" required value={form.dueDate} onChange={(e) => form.setDueDate(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400" />
          </div>
        </div>

        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={form.isSubmitting} className="w-full mt-2 bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50">
          {form.isSubmitting ? 'Guardando...' : 'Guardar Recordatorio'}
        </motion.button>
      </div>
    </motion.form>
  );
}

// ==========================================
// 2. FORMULARIO DE EDICIÓN (Para el Modal)
// ==========================================
interface EditReminderFormProps {
  reminder: Reminder;
  onSave: (id: string, data: Partial<{ title: string; amount: number | null; dueDate: string }>) => void;
  onCancel: () => void;
}

export function EditReminderForm({ reminder, onSave, onCancel }: EditReminderFormProps) {
  // Parseamos la fecha ISO del backend al formato YYYY-MM-DD del input de HTML
  const initialDate = new Date(reminder.dueDate).toISOString().split('T')[0];
  
  const [title, setTitle] = useState(reminder.title);
  const [amount, setAmount] = useState(reminder.amount ? reminder.amount.toString() : "");
  const [dueDate, setDueDate] = useState(initialDate);
  const [isSaving, setIsSaving] = useState(false);

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await onSave(reminder.id, {
      title,
      amount: amount ? Number(amount) : null, 
      dueDate
    });
    setIsSaving(false);
  };

  return (
    <form onSubmit={submitEdit} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">¿Qué hay que pagar?</label>
        <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none" />
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-700 mb-1">Monto (Opcional)</label>
          <input type="number" step="0.01" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none" />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-700 mb-1">Fecha de Vencimiento</label>
          <input type="date" required value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none" />
        </div>
      </div>

      <div className="mt-6 flex gap-3 pt-2 border-t border-gray-100">
        <button type="button" onClick={onCancel} className="flex-1 py-3 font-bold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200">Cancelar</button>
        <button type="submit" disabled={isSaving} className="flex-1 py-3 font-bold text-white bg-sky-500 rounded-xl hover:bg-sky-600 disabled:opacity-50">
          {isSaving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>
    </form>
  );
}