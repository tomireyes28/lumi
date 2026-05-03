import { motion, Variants } from "framer-motion";
import { Category } from "@/types/categories";
import { Pencil, Trash2, Tag } from "lucide-react";
import { ICON_MAP } from "./CategoryForm"; // Importamos el mapa de íconos

interface CategoryListProps {
  categories: Category[];
  itemVariants: Variants;
  onEditClick: (category: Category) => void;
  onDeleteClick: (category: Category) => void;
}

export function CategoryList({ categories, itemVariants, onEditClick, onDeleteClick }: CategoryListProps) {
  return (
    <motion.div variants={itemVariants} className="flex flex-col gap-3">
      <h2 className="text-sm font-bold text-gray-800 mb-1 uppercase tracking-wider">Tus Etiquetas</h2>
      
      {categories.length === 0 ? (
        <div className="p-8 bg-sky-50 rounded-2xl border border-dashed border-sky-200 text-center text-sky-700 text-sm">
          No hay categorías todavía.
        </div>
      ) : (
        categories.map(cat => {
          // Buscamos el componente SVG en nuestro mapa, si no existe usamos el Tag por defecto
          const IconComponent = ICON_MAP[cat.icon || ""] || Tag;

          return (
            <motion.div 
              variants={itemVariants}
              key={cat.id} 
              className="p-3 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-xl shadow-inner text-gray-700"
                  style={{ backgroundColor: cat.colorHex ? `${cat.colorHex}40` : '#f3f4f6' }}
                >
                  <IconComponent className="w-5 h-5" style={{ color: cat.colorHex || '#374151' }} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">{cat.name}</h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 inline-block ${cat.type === 'income' ? 'bg-sky-50 text-sky-600' : 'bg-orange-50 text-orange-600'}`}>
                    {cat.type === 'income' ? 'Ingreso' : 'Gasto'}
                  </span>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => onEditClick(cat)} className="p-2 text-gray-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors" title="Editar">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => onDeleteClick(cat)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Borrar">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          );
        })
      )}
    </motion.div>
  );
}