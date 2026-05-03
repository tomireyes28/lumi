import { motion, Variants } from "framer-motion";
import { CardFormState, CreditCard } from "@/types/cards";
import { useState } from "react";

// ==========================================
// 1. FORMULARIO DE CREACIÓN
// ==========================================
interface CardFormProps {
  form: CardFormState;
  handleSubmit: (e: React.FormEvent) => void;
  itemVariants: Variants;
}

export function CardForm({ form, handleSubmit, itemVariants }: CardFormProps) {
  return (
    <motion.form variants={itemVariants} onSubmit={handleSubmit} className="bg-white p-5 rounded-2xl shadow-sm border border-sky-100">
      <h2 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-wider">Nueva Tarjeta</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Alias (Nombre)</label>
          <input type="text" required value={form.alias} onChange={(e) => form.setAlias(e.target.value)} placeholder="Ej: Visa Galicia" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500" />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">Últimos 4 números</label>
            <input type="text" required maxLength={4} minLength={4} value={form.lastFour} onChange={(e) => form.setLastFour(e.target.value)} placeholder="Ej: 4567" inputMode="numeric" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-center tracking-widest font-mono" />
          </div>
          <div className="w-20">
            <label className="block text-xs font-medium text-gray-700 mb-1">Color</label>
            <input type="color" value={form.colorHex} onChange={(e) => form.setColorHex(e.target.value)} className="w-full h-10 p-1 border border-gray-200 rounded-xl cursor-pointer bg-gray-50" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Límite Total ($)</label>
          <input type="number" required min="1" step="0.01" inputMode="decimal" value={form.limit} onChange={(e) => form.setLimit(e.target.value)} placeholder="Ej: 500000" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500" />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">Día que Cierra</label>
            <input type="number" required min="1" max="31" inputMode="numeric" value={form.closingDay} onChange={(e) => form.setClosingDay(e.target.value)} placeholder="Ej: 25" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500" />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">Día que Vence</label>
            <input type="number" required min="1" max="31" inputMode="numeric" value={form.dueDay} onChange={(e) => form.setDueDay(e.target.value)} placeholder="Ej: 5" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500" />
          </div>
        </div>

        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={form.isSubmitting} className="w-full mt-2 bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50">
          {form.isSubmitting ? 'Guardando...' : 'Agregar Tarjeta'}
        </motion.button>
      </div>
    </motion.form>
  );
}

// ==========================================
// 2. FORMULARIO DE EDICIÓN (Para el Modal)
// ==========================================
interface EditCardFormProps {
  card: CreditCard;
  onSave: (id: string, data: Partial<CreditCard>) => void;
  onCancel: () => void;
}

export function EditCardForm({ card, onSave, onCancel }: EditCardFormProps) {
  const [alias, setAlias] = useState(card.alias);
  const [lastFour, setLastFour] = useState(card.lastFour);
  const [limit, setLimit] = useState(card.limit.toString());
  const [closingDay, setClosingDay] = useState(card.closingDay.toString());
  const [dueDay, setDueDay] = useState(card.dueDay.toString());
  const [colorHex, setColorHex] = useState(card.colorHex || "#0f172a");
  const [isSaving, setIsSaving] = useState(false);

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await onSave(card.id, {
      alias, lastFour, colorHex,
      limit: Number(limit), closingDay: Number(closingDay), dueDay: Number(dueDay)
    });
    setIsSaving(false);
  };

  return (
    <form onSubmit={submitEdit} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Alias (Nombre)</label>
        <input type="text" required value={alias} onChange={(e) => setAlias(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none" />
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-700 mb-1">Últimos 4 números</label>
          <input type="text" required maxLength={4} minLength={4} value={lastFour} onChange={(e) => setLastFour(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none text-center tracking-widest font-mono" />
        </div>
        <div className="w-20">
          <label className="block text-xs font-medium text-gray-700 mb-1">Color</label>
          <input type="color" value={colorHex} onChange={(e) => setColorHex(e.target.value)} className="w-full h-10 p-1 border border-gray-200 rounded-xl cursor-pointer bg-gray-50" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Límite Total ($)</label>
        <input type="number" required min="1" step="0.01" value={limit} onChange={(e) => setLimit(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none" />
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-700 mb-1">Día que Cierra</label>
          <input type="number" required min="1" max="31" value={closingDay} onChange={(e) => setClosingDay(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none" />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-700 mb-1">Día que Vence</label>
          <input type="number" required min="1" max="31" value={dueDay} onChange={(e) => setDueDay(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none" />
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