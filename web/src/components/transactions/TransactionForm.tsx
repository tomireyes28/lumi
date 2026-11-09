import { businessDateKey } from "@/lib/business-date";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { Category } from "@/types/categories";
import { CreditCard } from "@/types/cards";
import { useId, useState } from "react";
import { Transaction, UpdateTransactionInput } from "@/types/transactions";

export interface TransactionFormState {
  date: string;
  setDate: (date: string) => void;
  amount: string;
  setAmount: (value: string) => void;
  categoryId: string;
  setCategoryId: (value: string) => void;
  creditCardId: string;
  setCreditCardId: (value: string) => void;
  installments: string;
  setInstallments: (value: string) => void;
  note: string;
  setNote: (value: string) => void;
  isSubmitting: boolean;
}

interface TransactionFormProps {
  tab: "expense" | "income";
  setTab: (tab: "expense" | "income") => void;
  form: TransactionFormState;
  cards: CreditCard[];
  filteredCategories: Category[];
  handleSubmit: (e: React.FormEvent) => void;
  itemVariants: Variants;
}

export function TransactionForm({
  tab,
  setTab,
  form,
  cards,
  filteredCategories,
  handleSubmit,
  itemVariants,
}: TransactionFormProps) {
  const amountId = useId();
  const purchaseDateId = useId();
  const categorySelectId = useId();
  const paymentMethodId = useId();
  const installmentsId = useId();
  const noteId = useId();

  return (
    <motion.form
      variants={itemVariants}
      onSubmit={handleSubmit}
      className="bg-white p-5 rounded-2xl shadow-sm border border-sky-100"
    >
      <div
        className="flex bg-gray-100 p-1 rounded-xl mb-5"
        role="group"
        aria-label="Tipo de movimiento"
      >
        <button
          type="button"
          aria-pressed={tab === "expense"}
          onClick={() => {
            setTab("expense");
            form.setCategoryId("");
            form.setCreditCardId("");
            form.setInstallments("1");
          }}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
            tab === "expense"
              ? "bg-white shadow-sm text-orange-600"
              : "text-gray-500"
          }`}
        >
          Gasto
        </button>
        <button
          type="button"
          aria-pressed={tab === "income"}
          onClick={() => {
            setTab("income");
            form.setCategoryId("");
            form.setCreditCardId("");
            form.setInstallments("1");
          }}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
            tab === "income"
              ? "bg-white shadow-sm text-sky-600"
              : "text-gray-500"
          }`}
        >
          Ingreso
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label
            htmlFor={purchaseDateId}
            className="block text-xs font-medium text-gray-700 mb-1"
          >
            Fecha de compra o ingreso
          </label>
          <input
            id={purchaseDateId}
            type="date"
            required
            value={form.date}
            onChange={(e) => form.setDate(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl"
          />
        </div>
        <div>
          <label
            htmlFor={amountId}
            className="block text-xs font-medium text-gray-700 mb-1"
          >
            Monto ($)
          </label>
          <input
            id={amountId}
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            required
            value={form.amount}
            onChange={(e) => form.setAmount(e.target.value)}
            placeholder="Ej: 15000"
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xl font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div>
          <label
            htmlFor={categorySelectId}
            className="block text-xs font-medium text-gray-700 mb-1"
          >
            Categoría
          </label>
          <select
            id={categorySelectId}
            required
            value={form.categoryId}
            onChange={(e) => form.setCategoryId(e.target.value)}
            className="w-full px-3 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="" disabled>
              Seleccionar...
            </option>
            {filteredCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <AnimatePresence>
          {tab === "expense" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden space-y-4 mt-2"
            >
              <div>
                <label
                  htmlFor={paymentMethodId}
                  className="block text-xs font-medium text-gray-700 mb-1"
                >
                  Medio de Pago
                </label>
                <select
                  id={paymentMethodId}
                  value={form.creditCardId}
                  onChange={(e) => {
                    form.setCreditCardId(e.target.value);
                    if (!e.target.value) form.setInstallments("1");
                  }}
                  className="w-full px-3 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                >
                  <option value="">💵 Efectivo / Débito (Ya pagado)</option>
                  {cards.map((card) => (
                    <option key={card.id} value={card.id}>
                      💳 {card.alias} (...{card.lastFour})
                    </option>
                  ))}
                </select>
              </div>

              {form.creditCardId && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <label
                    htmlFor={installmentsId}
                    className="block text-xs font-medium text-gray-700 mb-1"
                  >
                    ¿En cuántas cuotas?
                  </label>
                  <select
                    id={installmentsId}
                    value={form.installments}
                    onChange={(e) => form.setInstallments(e.target.value)}
                    className="w-full px-3 py-3 bg-sky-50 border border-sky-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-sky-900 font-medium"
                  >
                    <option value="1">1 pago (Sin cuotas)</option>
                    <option value="2">2 cuotas</option>
                    <option value="3">3 cuotas</option>
                    <option value="6">6 cuotas</option>
                    <option value="9">9 cuotas</option>
                    <option value="12">12 cuotas</option>
                    <option value="18">18 cuotas</option>
                    <option value="24">24 cuotas</option>
                  </select>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div>
          <label
            htmlFor={noteId}
            className="block text-xs font-medium text-gray-700 mb-1 mt-4"
          >
            Nota (Opcional)
          </label>
          <input
            id={noteId}
            type="text"
            value={form.note}
            onChange={(e) => form.setNote(e.target.value)}
            placeholder="Ej: Supermercado"
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={form.isSubmitting || !form.categoryId}
          className={`w-full mt-2 font-medium py-3 rounded-xl transition-colors text-white ${
            tab === "expense" ? "bg-gray-900" : "bg-sky-600"
          }`}
        >
          {form.isSubmitting ? "Registrando..." : "Registrar"}
        </motion.button>
      </div>
    </motion.form>
  );
}

interface EditTransactionFormProps {
  transaction: Transaction;
  categories: Category[];
  cards: CreditCard[];
  onSave: (id: string, data: UpdateTransactionInput) => Promise<void> | void;
  onCancel: () => void;
}

export function EditTransactionForm({
  transaction,
  categories,
  cards,
  onSave,
  onCancel,
}: EditTransactionFormProps) {
  const editAmountId = useId();
  const referenceId = useId();
  const initialReference = businessDateKey(
    transaction.referenceDate ?? transaction.date,
  );
  const [reference, setReference] = useState(initialReference);
  const editCategoryId = useId();
  const editPaymentId = useId();
  const editNoteId = useId();

  const [amount, setAmount] = useState(transaction.amount.toString());
  const [categoryId, setCategoryId] = useState(transaction.category?.id || "");
  const [creditCardId, setCreditCardId] = useState(
    transaction.creditCard?.id || "",
  );
  const [note, setNote] = useState(transaction.note || "");
  const [isSaving, setIsSaving] = useState(false);

  const isExpense = transaction.category?.type === "expense";
  const availableCategories = categories.filter(
    (c) => c.type === (isExpense ? "expense" : "income"),
  );

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(transaction.id, {
        amount: Number(amount),
        ...(reference !== initialReference ? { date: reference } : {}),
        categoryId,
        note: note.trim() ? note.trim() : null,
        creditCardId: isExpense && creditCardId ? creditCardId : null,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={submitEdit} className="space-y-4">
      <div>
        <label
          htmlFor={referenceId}
          className="block text-xs font-medium text-gray-700 mb-1"
        >
          Fecha de referencia de este movimiento
        </label>
        <input
          id={referenceId}
          type="date"
          required
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          className="w-full px-3 py-3 bg-gray-50 border border-gray-200 rounded-xl"
        />
        <p className="text-xs text-gray-500 mt-1">
          Se actualiza solo este movimiento. Se conservan la compra original y
          las otras cuotas.
        </p>
      </div>
      <div>
        <label
          htmlFor={editAmountId}
          className="block text-xs font-medium text-gray-700 mb-1"
        >
          Monto ($)
        </label>
        <input
          id={editAmountId}
          type="number"
          min="0.01"
          step="0.01"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xl font-medium focus:outline-none"
        />
      </div>

      <div>
        <label
          htmlFor={editCategoryId}
          className="block text-xs font-medium text-gray-700 mb-1"
        >
          Categoría
        </label>
        <select
          id={editCategoryId}
          required
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="w-full px-3 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none"
        >
          {availableCategories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {isExpense && (
        <div>
          <label
            htmlFor={editPaymentId}
            className="block text-xs font-medium text-gray-700 mb-1"
          >
            Medio de Pago
          </label>
          <select
            id={editPaymentId}
            value={creditCardId}
            onChange={(e) => setCreditCardId(e.target.value)}
            className="w-full px-3 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none"
          >
            <option value="">💵 Efectivo / Débito</option>
            {cards.map((card) => (
              <option key={card.id} value={card.id}>
                💳 {card.alias} (...{card.lastFour})
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label
          htmlFor={editNoteId}
          className="block text-xs font-medium text-gray-700 mb-1"
        >
          Nota
        </label>
        <input
          id={editNoteId}
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none"
        />
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
