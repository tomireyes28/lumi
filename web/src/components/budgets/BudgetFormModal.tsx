import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Category } from '@/types/categories';
import { IconRenderer } from '@/components/ui/IconRenderer';

interface BudgetFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  initialData?: { categoryId: string; amount: number } | null;
  onSubmit: (categoryId: string, amount: number) => Promise<boolean>;
  isSubmitting: boolean;
}

export function BudgetFormModal({
  isOpen,
  onClose,
  categories,
  initialData,
  onSubmit,
  isSubmitting,
}: BudgetFormModalProps) {
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');

  useEffect(() => {
    if (initialData) {
      setCategoryId(initialData.categoryId);
      setAmount(initialData.amount.toString());
    } else {
      setCategoryId(categories.length > 0 ? categories[0].id : '');
      setAmount('');
    }
  }, [initialData, categories, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId || !amount || Number(amount) <= 0) return;

    const ok = await onSubmit(categoryId, Number(amount));
    if (ok) {
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Modificar Presupuesto' : 'Definir Presupuesto'}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
            Categoría de Gasto
          </label>
          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
            {categories.map((cat) => {
              const isSelected = categoryId === cat.id;
              return (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => setCategoryId(cat.id)}
                  disabled={Boolean(initialData)} // Si se está editando, no cambiamos la categoría
                  className={`flex items-center gap-2.5 p-3 rounded-2xl border text-left transition-all ${
                    isSelected
                      ? 'border-sky-500 bg-sky-50/50 text-sky-900 shadow-xs'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  } ${initialData ? 'opacity-75 cursor-not-allowed' : ''}`}
                >
                  <div
                    className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: cat.colorHex ? `${cat.colorHex}25` : '#f1f5f9' }}
                  >
                    <IconRenderer iconName={cat.icon} colorHex={cat.colorHex} className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold truncate">{cat.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
            Límite Mensual ($)
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-gray-400">
              $
            </span>
            <input
              type="number"
              min="1"
              step="any"
              placeholder="Ej: 80000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="w-full pl-9 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-gray-900 font-bold text-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all"
            />
          </div>
          <p className="text-[11px] text-gray-400 mt-1.5">
            Te avisaremos cuando tus gastos de este mes alcancen el 75% o superen este monto.
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm rounded-2xl transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !categoryId || !amount}
            className="flex-1 py-3 px-4 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-bold text-sm rounded-2xl shadow-md shadow-sky-100 transition-colors"
          >
            {isSubmitting ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
