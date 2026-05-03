"use client";

import { motion, Variants } from "framer-motion";
import { useCards } from "@/hooks/useCards";
import { CardCarousel } from "@/components/cards/CardCarrousel";
import { CardForm, EditCardForm } from "@/components/cards/CardForm";
import { Modal } from "@/components/ui/Modal";
import { AlertTriangle, Trash2 } from "lucide-react";

export default function CardsPage() {
  const { 
    cards, loading, form, handleSubmit, handleUpdate, handleDelete,
    editingCard, setEditingCard, deletingCard, setDeletingCard
  } = useCards();

  const containerVariants: Variants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.15 } } };
  const itemVariants: Variants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } } };
  const cardVariants: Variants = { hidden: { opacity: 0, x: 50 }, visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: "easeOut" } } };

  if (loading) return <div className="p-8 text-center text-gray-500 animate-pulse">Cargando billetera...</div>;

  return (
    <>
      <motion.div className="p-6 pb-24 flex flex-col gap-8" initial="hidden" animate="visible" variants={containerVariants}>
        <motion.header variants={itemVariants}>
          <h1 className="text-2xl font-bold text-gray-900">Billetera</h1>
          <p className="text-sm text-gray-500 mt-1">Gestioná tus tarjetas de crédito.</p>
        </motion.header>

        <CardCarousel 
          cards={cards} itemVariants={itemVariants} cardVariants={cardVariants} 
          onEditClick={setEditingCard} onDeleteClick={setDeletingCard}
        />
        <CardForm form={form} handleSubmit={handleSubmit} itemVariants={itemVariants} />
      </motion.div>

      {/* MODAL DE EDICIÓN */}
      <Modal isOpen={!!editingCard} onClose={() => setEditingCard(null)} title="Editar Tarjeta">
        {editingCard && (
          <EditCardForm card={editingCard} onSave={handleUpdate} onCancel={() => setEditingCard(null)} />
        )}
      </Modal>

      {/* MODAL DE BORRADO */}
      <Modal isOpen={!!deletingCard} onClose={() => setDeletingCard(null)} title="¿Borrar tarjeta?">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <p className="text-gray-600 mb-1">
            Vas a eliminar la tarjeta <strong className="text-gray-900">{deletingCard?.alias}</strong>.
          </p>
          <p className="text-sm text-gray-500 mb-6">Los movimientos asociados quedarán huérfanos. Esta acción no se deshace.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setDeletingCard(null)} className="flex-1 py-3 font-bold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200">Cancelar</button>
          <button onClick={() => { if (deletingCard) handleDelete(deletingCard.id); }} className="flex-1 py-3 font-bold text-white bg-red-500 rounded-xl hover:bg-red-600 flex items-center justify-center gap-2">
            <Trash2 className="w-4 h-4" /> Sí, borrar
          </button>
        </div>
      </Modal>
    </>
  );
}