import { MotionButton } from "@/components/ui/MotionButton";
import { motion, Variants } from "framer-motion";
import {
  CardFormState,
  CreditCard,
  UpdateCreditCardInput,
} from "@/types/cards";
import { useId, useState } from "react";

interface CardFormProps {
  form: CardFormState;
  handleSubmit: (e: React.FormEvent) => void;
  itemVariants: Variants;
}

export function CardForm({ form, handleSubmit, itemVariants }: CardFormProps) {
  const aliasId = useId();
  const lastFourId = useId();
  const colorId = useId();
  const limitId = useId();
  const closingDayId = useId();
  const dueDayId = useId();

  return (
    <motion.form
      variants={itemVariants}
      onSubmit={handleSubmit}
      className="bg-white p-5 rounded-2xl shadow-sm border border-sky-100"
    >
      <h2 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-wider">
        Nueva Tarjeta
      </h2>

      <div className="space-y-4">
        <div>
          <label
            htmlFor={aliasId}
            className="block text-xs font-medium text-gray-700 mb-1"
          >
            Alias (Nombre)
          </label>
          <input
            id={aliasId}
            type="text"
            required
            value={form.alias}
            onChange={(e) => form.setAlias(e.target.value)}
            placeholder="Ej: Visa Galicia"
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label
              htmlFor={lastFourId}
              className="block text-xs font-medium text-gray-700 mb-1"
            >
              Últimos 4 números
            </label>
            <input
              id={lastFourId}
              type="text"
              required
              pattern="\d{4}"
              maxLength={4}
              minLength={4}
              value={form.lastFour}
              onChange={(e) =>
                form.setLastFour(e.target.value.replace(/\D/g, ""))
              }
              placeholder="Ej: 4567"
              inputMode="numeric"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-center tracking-widest font-mono"
            />
          </div>
          <div className="w-20">
            <label
              htmlFor={colorId}
              className="block text-xs font-medium text-gray-700 mb-1"
            >
              Color
            </label>
            <input
              id={colorId}
              type="color"
              value={form.colorHex}
              onChange={(e) => form.setColorHex(e.target.value)}
              className="w-full h-10 p-1 border border-gray-200 rounded-xl cursor-pointer bg-gray-50"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor={limitId}
            className="block text-xs font-medium text-gray-700 mb-1"
          >
            Límite Total ($)
          </label>
          <input
            id={limitId}
            type="number"
            required
            min="1"
            step="0.01"
            inputMode="decimal"
            value={form.limit}
            onChange={(e) => form.setLimit(e.target.value)}
            placeholder="Ej: 500000"
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label
              htmlFor={closingDayId}
              className="block text-xs font-medium text-gray-700 mb-1"
            >
              Día que Cierra
            </label>
            <input
              id={closingDayId}
              type="number"
              required
              min="1"
              max="31"
              step="1"
              inputMode="numeric"
              value={form.closingDay}
              onChange={(e) => form.setClosingDay(e.target.value)}
              placeholder="Ej: 25"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <div className="flex-1">
            <label
              htmlFor={dueDayId}
              className="block text-xs font-medium text-gray-700 mb-1"
            >
              Día que Vence
            </label>
            <input
              id={dueDayId}
              type="number"
              required
              min="1"
              max="31"
              step="1"
              inputMode="numeric"
              value={form.dueDay}
              onChange={(e) => form.setDueDay(e.target.value)}
              placeholder="Ej: 5"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>

        <MotionButton
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={form.isSubmitting}
          className="w-full mt-2 bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          {form.isSubmitting ? "Guardando..." : "Agregar Tarjeta"}
        </MotionButton>
      </div>
    </motion.form>
  );
}

interface EditCardFormProps {
  card: CreditCard;
  onSave: (id: string, data: UpdateCreditCardInput) => Promise<void> | void;
  onCancel: () => void;
}

export function EditCardForm({ card, onSave, onCancel }: EditCardFormProps) {
  const editAliasId = useId();
  const editLastFourId = useId();
  const editColorId = useId();
  const editLimitId = useId();
  const editClosingDayId = useId();
  const editDueDayId = useId();

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
    try {
      await onSave(card.id, {
        alias: alias.trim(),
        lastFour: lastFour.trim(),
        colorHex,
        limit: Number(limit),
        closingDay: Number(closingDay),
        dueDay: Number(dueDay),
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={submitEdit} className="space-y-4">
      <div>
        <label
          htmlFor={editAliasId}
          className="block text-xs font-medium text-gray-700 mb-1"
        >
          Alias (Nombre)
        </label>
        <input
          id={editAliasId}
          type="text"
          required
          value={alias}
          onChange={(e) => setAlias(e.target.value)}
          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none"
        />
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label
            htmlFor={editLastFourId}
            className="block text-xs font-medium text-gray-700 mb-1"
          >
            Últimos 4 números
          </label>
          <input
            id={editLastFourId}
            type="text"
            required
            pattern="\d{4}"
            maxLength={4}
            minLength={4}
            value={lastFour}
            onChange={(e) => setLastFour(e.target.value.replace(/\D/g, ""))}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none text-center tracking-widest font-mono"
          />
        </div>
        <div className="w-20">
          <label
            htmlFor={editColorId}
            className="block text-xs font-medium text-gray-700 mb-1"
          >
            Color
          </label>
          <input
            id={editColorId}
            type="color"
            value={colorHex}
            onChange={(e) => setColorHex(e.target.value)}
            className="w-full h-10 p-1 border border-gray-200 rounded-xl cursor-pointer bg-gray-50"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor={editLimitId}
          className="block text-xs font-medium text-gray-700 mb-1"
        >
          Límite Total ($)
        </label>
        <input
          id={editLimitId}
          type="number"
          required
          min="1"
          step="0.01"
          value={limit}
          onChange={(e) => setLimit(e.target.value)}
          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none"
        />
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label
            htmlFor={editClosingDayId}
            className="block text-xs font-medium text-gray-700 mb-1"
          >
            Día que Cierra
          </label>
          <input
            id={editClosingDayId}
            type="number"
            required
            min="1"
            max="31"
            step="1"
            value={closingDay}
            onChange={(e) => setClosingDay(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none"
          />
        </div>
        <div className="flex-1">
          <label
            htmlFor={editDueDayId}
            className="block text-xs font-medium text-gray-700 mb-1"
          >
            Día que Vence
          </label>
          <input
            id={editDueDayId}
            type="number"
            required
            min="1"
            max="31"
            step="1"
            value={dueDay}
            onChange={(e) => setDueDay(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none"
          />
        </div>
      </div>

      <div className="mt-6 flex gap-3 pt-2 border-t border-gray-100">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 font-bold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="flex-1 py-3 font-bold text-white bg-sky-500 rounded-xl hover:bg-sky-600 disabled:opacity-50"
        >
          {isSaving ? "Guardando..." : "Guardar Cambios"}
        </button>
      </div>
    </form>
  );
}
