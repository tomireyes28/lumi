"use client";

import { motion, Variants } from "framer-motion";
import { useTransactions } from "@/hooks/useTransactions";
import { TransactionForm, EditTransactionForm } from "@/components/transactions/TransactionForm";
import { TransactionList } from "@/components/transactions/TransactionList";
import { Modal } from "@/components/ui/Modal";
import { AlertTriangle, Trash2 } from "lucide-react";

export default function TransactionsPage() {
  const { 
    transactions, cards, categories, loading, 
    form, tab, setTab, filterType, setFilterType, 
    filteredCategories, handleSubmit, handleDelete, handleUpdate,
    editingTx, setEditingTx, deletingTx, setDeletingTx
  } = useTransactions();

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } }
  };

  return (
    <>
      <motion.div className="p-6 pb-24" initial="hidden" animate="visible" variants={containerVariants}>
        <motion.header variants={itemVariants} className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Movimientos</h1>
          <p className="text-sm text-gray-500 mt-1">Registrá y administrá tus finanzas.</p>
        </motion.header>

        <div className="flex flex-col gap-8">
          <TransactionForm 
            tab={tab} setTab={setTab} form={form} cards={cards} 
            filteredCategories={filteredCategories} handleSubmit={handleSubmit} itemVariants={itemVariants}
          />

          <TransactionList 
            transactions={transactions} loading={loading} filterType={filterType} setFilterType={setFilterType}
            onEditClick={(tx) => setEditingTx(tx)} 
            onDeleteClick={(tx) => setDeletingTx(tx)} 
            itemVariants={itemVariants}
          />
        </div>
      </motion.div>

      {/* MODAL DE EDICIÓN */}
      <Modal isOpen={!!editingTx} onClose={() => setEditingTx(null)} title="Editar Movimiento">
        {editingTx && (
          <EditTransactionForm 
            transaction={editingTx} categories={categories} cards={cards}
            onSave={handleUpdate} onCancel={() => setEditingTx(null)}
          />
        )}
      </Modal>

      {/* MODAL DE BORRADO */}
      <Modal isOpen={!!deletingTx} onClose={() => setDeletingTx(null)} title="¿Borrar movimiento?">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <p className="text-gray-600 mb-1">
            Vas a eliminar un movimiento por <strong className="text-gray-900">${deletingTx?.amount}</strong>.
          </p>
          <p className="text-sm text-gray-500 mb-6">Esta acción no se puede deshacer.</p>
        </div>
        
        <div className="flex gap-3">
          <button onClick={() => setDeletingTx(null)} className="flex-1 py-3 font-bold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200">Cancelar</button>
          <button onClick={() => { if (deletingTx) handleDelete(deletingTx.id); }} className="flex-1 py-3 font-bold text-white bg-red-500 rounded-xl hover:bg-red-600 flex items-center justify-center gap-2">
            <Trash2 className="w-4 h-4" /> Sí, borrar
          </button>
        </div>
      </Modal>
    </>
  );
}