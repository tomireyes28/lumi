import { motion, Variants } from "framer-motion";
import { Category } from "@/types/categories";

interface CategoryListProps {
  categories: Category[];
  itemVariants: Variants;
}

export function CategoryList({ categories, itemVariants }: CategoryListProps) {
  return (
    <motion.div variants={itemVariants} className="flex flex-col gap-3">
      <h2 className="text-sm font-bold text-gray-800 mb-1 uppercase tracking-wider">Tus Etiquetas</h2>
      
      {categories.length === 0 ? (
        <div className="p-8 bg-sky-50 rounded-2xl border border-dashed border-sky-200 text-center text-sky-700 text-sm">
          No hay categorías todavía.
        </div>
      ) : (
        categories.map(cat => (
          <motion.div 
            variants={itemVariants}
            key={cat.id} 
            className="p-3 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center text-xl bg-opacity-20 shadow-inner"
                style={{ backgroundColor: cat.colorHex ? `${cat.colorHex}40` : '#f3f4f6' }}
              >
                {cat.icon}
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm">{cat.name}</h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 inline-block ${cat.type === 'income' ? 'bg-sky-50 text-sky-600' : 'bg-orange-50 text-orange-600'}`}>
                  {cat.type === 'income' ? 'Ingreso' : 'Gasto'}
                </span>
              </div>
            </div>
          </motion.div>
        ))
      )}
    </motion.div>
  );
}