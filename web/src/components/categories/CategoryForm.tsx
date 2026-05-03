import { motion, Variants } from "framer-motion";
import { CategoryFormState } from "@/types/categories";

interface CategoryFormProps {
  form: CategoryFormState;
  handleSubmit: (e: React.FormEvent) => void;
  itemVariants: Variants;
}

export function CategoryForm({ form, handleSubmit, itemVariants }: CategoryFormProps) {
  return (
    <motion.form 
      variants={itemVariants} 
      onSubmit={handleSubmit} 
      className="bg-white p-5 rounded-2xl shadow-sm border border-sky-100"
    >
      <h2 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-wider">Nueva Categoría</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Nombre</label>
          <input 
            type="text" 
            required
            value={form.name}
            onChange={(e) => form.setName(e.target.value)}
            placeholder="Ej: Supermercado"
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Tipo</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => form.setType('expense')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${form.type === 'expense' ? 'bg-orange-100 text-orange-700 border border-orange-200' : 'bg-gray-50 text-gray-400 border border-transparent'}`}
            >
              Gasto
            </button>
            <button
              type="button"
              onClick={() => form.setType('income')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${form.type === 'income' ? 'bg-sky-100 text-sky-700 border border-sky-200' : 'bg-gray-50 text-gray-400 border border-transparent'}`}
            >
              Ingreso
            </button>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">Color</label>
            <input 
              type="color" 
              value={form.colorHex}
              onChange={(e) => form.setColorHex(e.target.value)}
              className="w-full h-10 p-1 border border-gray-200 rounded-xl cursor-pointer bg-gray-50"
            />
          </div>
          <div className="w-20">
            <label className="block text-xs font-medium text-gray-700 mb-1">Icono</label>
            <input 
              type="text" 
              required
              value={form.icon}
              onChange={(e) => form.setIcon(e.target.value)}
              className="w-full h-10 px-2 border border-gray-200 rounded-xl text-center text-xl focus:outline-none focus:ring-2 focus:ring-sky-500 bg-gray-50"
            />
          </div>
        </div>

        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit" 
          disabled={form.isSubmitting}
          className="w-full mt-2 bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          {form.isSubmitting ? 'Guardando...' : 'Crear Categoría'}
        </motion.button>
      </div>
    </motion.form>
  );
}