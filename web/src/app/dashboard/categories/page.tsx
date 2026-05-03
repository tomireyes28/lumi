"use client";

import { motion, Variants } from "framer-motion";
import { useCategories } from "@/hooks/useCategories";
import { CategoryForm, EditCategoryForm } from "@/components/categories/CategoryForm";
import { CategoryList } from "@/components/categories/CategoryList";
import { Modal } from "@/components/ui/Modal";
import { AlertTriangle, Trash2 } from "lucide-react";

export default function CategoriesPage() {
  const { 
    categories, loading, form, handleSubmit, handleUpdate, handleDelete,
    editingCategory, setEditingCategory, deletingCategory, setDeletingCategory
  } = useCategories();

  const containerVariants: Variants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants: Variants = { hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } } };

  if (loading) return <div className="flex items-center justify-center p-12 animate-pulse"><p className="text-gray-500 font-medium">Cargando categorías...</p></div>;

  return (
    <>
      <motion.div className="p-6 pb-24 flex flex-col gap-8" initial="hidden" animate="visible" variants={containerVariants}>
        <motion.header variants={itemVariants}>
          <h1 className="text-2xl font-bold text-gray-900">Categorías</h1>
          <p className="text-sm text-gray-500 mt-1">Personalizá tus clasificaciones.</p>
        </motion.header>

        <CategoryForm form={form} handleSubmit={handleSubmit} itemVariants={itemVariants} />

        <CategoryList 
          categories={categories} itemVariants={itemVariants} 
          onEditClick={setEditingCategory} onDeleteClick={setDeletingCategory} 
        />
      </motion.div>

      {/* MODAL DE EDICIÓN */}
      <Modal isOpen={!!editingCategory} onClose={() => setEditingCategory(null)} title="Editar Categoría">
        {editingCategory && (
          <EditCategoryForm category={editingCategory} onSave={handleUpdate} onCancel={() => setEditingCategory(null)} />
        )}
      </Modal>

      {/* MODAL DE BORRADO */}
      <Modal isOpen={!!deletingCategory} onClose={() => setDeletingCategory(null)} title="¿Borrar categoría?">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <p className="text-gray-600 mb-1">
            Vas a eliminar la categoría <strong className="text-gray-900">{deletingCategory?.name}</strong>.
          </p>
          <p className="text-sm text-gray-500 mb-6">Si esta categoría ya tiene gastos asignados, el sistema no te permitirá borrarla.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setDeletingCategory(null)} className="flex-1 py-3 font-bold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200">Cancelar</button>
          <button onClick={() => { if (deletingCategory) handleDelete(deletingCategory.id); }} className="flex-1 py-3 font-bold text-white bg-red-500 rounded-xl hover:bg-red-600 flex items-center justify-center gap-2">
            <Trash2 className="w-4 h-4" /> Sí, intentar borrar
          </button>
        </div>
      </Modal>
    </>
  );
}