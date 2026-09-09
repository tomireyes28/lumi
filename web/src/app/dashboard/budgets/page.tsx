'use client';

import { useState } from 'react';
import { motion, Variants } from 'framer-motion';
import { Plus, ChevronLeft, ChevronRight, Target, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useBudgets } from '@/hooks/useBudgets';
import { BudgetOverviewCard } from '@/components/budgets/BudgetOverviewCard';
import { BudgetCard } from '@/components/budgets/BudgetCard';
import { BudgetFormModal } from '@/components/budgets/BudgetFormModal';
import { BudgetProgressItem } from '@/types/budgets';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export default function BudgetsPage() {
  const {
    data,
    loading,
    isSubmitting,
    month,
    year,
    setMonth,
    setYear,
    expenseCategories,
    upsertBudget,
    deleteBudget,
  } = useBudgets();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BudgetProgressItem | null>(null);

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
  };

  const handlePrevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  const handleOpenCreate = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: BudgetProgressItem) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  if (loading && !data) {
    return (
      <div className="p-8 text-center text-gray-500 animate-pulse">
        Calculando presupuestos y gastos...
      </div>
    );
  }

  return (
    <motion.div
      className="p-6 pb-28 flex flex-col gap-6"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Header con botón atrás y nuevo */}
      <motion.header variants={itemVariants} className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-2 -ml-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Presupuestos</h1>
            <p className="text-xs text-gray-500 mt-0.5">Controlá tus topes de gasto mensual</p>
          </div>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-2xl text-xs font-bold shadow-sm shadow-sky-200 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Definir</span>
        </button>
      </motion.header>

      {/* Selector de Mes */}
      <motion.div
        variants={itemVariants}
        className="flex items-center justify-between bg-white px-4 py-2.5 rounded-2xl border border-gray-100 shadow-xs"
      >
        <button
          onClick={handlePrevMonth}
          className="p-1.5 hover:bg-gray-100 text-gray-600 rounded-xl transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-bold text-gray-800">
          {MONTH_NAMES[month - 1]} {year}
        </span>
        <button
          onClick={handleNextMonth}
          className="p-1.5 hover:bg-gray-100 text-gray-600 rounded-xl transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </motion.div>

      {/* Overview general */}
      {data && data.items.length > 0 ? (
        <>
          <BudgetOverviewCard data={data} itemVariants={itemVariants} />

          <motion.div variants={itemVariants} className="flex flex-col gap-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">
              Desglose por Categoría
            </h3>
            <div className="flex flex-col gap-3">
              {data.items.map((item) => (
                <BudgetCard
                  key={item.id}
                  item={item}
                  onEdit={handleOpenEdit}
                  onDelete={deleteBudget}
                  itemVariants={itemVariants}
                />
              ))}
            </div>
          </motion.div>
        </>
      ) : (
        /* Estado vacío */
        <motion.div
          variants={itemVariants}
          className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm text-center flex flex-col items-center gap-4 mt-2"
        >
          <div className="w-16 h-16 bg-sky-50 text-sky-500 rounded-3xl flex items-center justify-center">
            <Target className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">Sin presupuestos definidos</h3>
            <p className="text-xs text-gray-500 max-w-xs mt-1 leading-relaxed">
              Definí un tope mensual para categorías como Comida, Salidas o Supermercado para saber en
              tiempo real si estás gastando de más.
            </p>
          </div>
          <button
            onClick={handleOpenCreate}
            className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-sky-100 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Crear mi primer presupuesto
          </button>
        </motion.div>
      )}

      {/* Modal para Crear / Editar */}
      <BudgetFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingItem(null);
        }}
        categories={expenseCategories}
        initialData={
          editingItem
            ? { categoryId: editingItem.categoryId, amount: editingItem.budgetedAmount }
            : null
        }
        onSubmit={upsertBudget}
        isSubmitting={isSubmitting}
      />
    </motion.div>
  );
}
