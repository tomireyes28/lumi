"use client";

import { motion, Variants } from "framer-motion";
import { useCategories } from "@/hooks/useCategories";

export default function CategoriesPage() {
  const { categories, loading, form, handleSubmit } = useCategories();

  // Variantes de animación
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 animate-pulse">
        <p className="text-gray-500 font-medium">Cargando categorías...</p>
      </div>
    );
  }

  return (
    <motion.div 
      className="p-6 pb-24 flex flex-col gap-8"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.header variants={itemVariants}>
        <h1 className="text-2xl font-bold text-gray-900">Categorías</h1>
        <p className="text-sm text-gray-500 mt-1">Personalizá tus clasificaciones.</p>
      </motion.header>

      {/* Formulario de Nueva Categoría */}
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

      {/* Lista de Categorías */}
      <motion.div variants={itemVariants} className="flex flex-col gap-3">
        <h2 className="text-sm font-bold text-gray-800 mb-1 uppercase tracking-wider">Tus Etiquetas</h2>
        
        {categories.length === 0 ? (
          <div className="p-8 bg-sky-50 rounded-2xl border border-dashed border-sky-200 text-center text-sky-700 text-sm">
            No hay categorías todavía.
          </div>
        ) : (
          categories.map(cat => (
            <motion.div 
              variants={itemVariants} // ¡Magia! Reutilizamos la variante para que entren en cascada
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
    </motion.div>
  );
}