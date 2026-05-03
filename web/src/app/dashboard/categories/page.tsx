"use client";

import { motion, Variants } from "framer-motion";
import { useCategories } from "@/hooks/useCategories";
import { CategoryForm } from "@/components/categories/CategoryForm";
import { CategoryList } from "@/components/categories/CategoryList";

export default function CategoriesPage() {
  const { categories, loading, form, handleSubmit } = useCategories();

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

      <CategoryForm 
        form={form} 
        handleSubmit={handleSubmit} 
        itemVariants={itemVariants} 
      />

      <CategoryList 
        categories={categories} 
        itemVariants={itemVariants} 
      />

    </motion.div>
  );
}