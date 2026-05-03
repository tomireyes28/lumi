"use client";

import { motion, Variants } from "framer-motion";
import { useReminders } from "@/hooks/useReminders";
import { ReminderForm, EditReminderForm } from "@/components/reminders/ReminderForm";
import { PendingReminders } from "@/components/reminders/PendingReminders";
import { PaidReminders } from "@/components/reminders/PaidReminders";
import { Modal } from "@/components/ui/Modal";
import { AlertTriangle, Trash2 } from "lucide-react";

export default function RemindersPage() {
  const { 
    loading, pendingReminders, paidReminders, 
    form, handleSubmit, handleUpdate, handleMarkAsPaid, handleDelete,
    editingReminder, setEditingReminder, deletingReminder, setDeletingReminder
  } = useReminders();

  const containerVariants: Variants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants: Variants = { hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } } };

  if (loading) return <div className="p-8 text-center text-gray-500 animate-pulse">Cargando vencimientos...</div>;

  return (
    <>
      <motion.div className="p-6 pb-24 flex flex-col gap-8" initial="hidden" animate="visible" variants={containerVariants}>
        <motion.header variants={itemVariants}>
          <h1 className="text-2xl font-bold text-gray-900">Vencimientos</h1>
          <p className="text-sm text-gray-500 mt-1">Que no se te pase ninguna fecha.</p>
        </motion.header>

        <ReminderForm form={form} handleSubmit={handleSubmit} itemVariants={itemVariants} />

        <PendingReminders 
          reminders={pendingReminders} 
          handleMarkAsPaid={handleMarkAsPaid} 
          onEditClick={setEditingReminder}
          onDeleteClick={setDeletingReminder}
          itemVariants={itemVariants} 
        />

        <PaidReminders 
          reminders={paidReminders} 
          onDeleteClick={setDeletingReminder} 
          itemVariants={itemVariants} 
        />
      </motion.div>

      {/* MODAL DE EDICIÓN */}
      <Modal isOpen={!!editingReminder} onClose={() => setEditingReminder(null)} title="Editar Vencimiento">
        {editingReminder && (
          <EditReminderForm reminder={editingReminder} onSave={handleUpdate} onCancel={() => setEditingReminder(null)} />
        )}
      </Modal>

      {/* MODAL DE BORRADO */}
      <Modal isOpen={!!deletingReminder} onClose={() => setDeletingReminder(null)} title="¿Borrar vencimiento?">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <p className="text-gray-600 mb-1">
            Vas a eliminar el recordatorio de <strong className="text-gray-900">{deletingReminder?.title}</strong>.
          </p>
          <p className="text-sm text-gray-500 mb-6">Esta acción no se puede deshacer.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setDeletingReminder(null)} className="flex-1 py-3 font-bold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200">Cancelar</button>
          <button onClick={() => { if (deletingReminder) handleDelete(deletingReminder.id); }} className="flex-1 py-3 font-bold text-white bg-red-500 rounded-xl hover:bg-red-600 flex items-center justify-center gap-2">
            <Trash2 className="w-4 h-4" /> Sí, borrar
          </button>
        </div>
      </Modal>
    </>
  );
}