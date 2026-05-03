"use client";

import { motion, Variants } from "framer-motion";
import { useReminders } from "@/hooks/useReminders";
import { ReminderForm } from "@/components/reminders/ReminderForm";
import { PendingReminders } from "@/components/reminders/PendingReminders";
import { PaidReminders } from "@/components/reminders/PaidReminders";

export default function RemindersPage() {
  const { 
    loading, pendingReminders, paidReminders, 
    form, handleSubmit, handleMarkAsPaid, handleDelete 
  } = useReminders();

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500 animate-pulse">Cargando vencimientos...</div>;
  }

  return (
    <motion.div 
      className="p-6 pb-24 flex flex-col gap-8"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.header variants={itemVariants}>
        <h1 className="text-2xl font-bold text-gray-900">Vencimientos</h1>
        <p className="text-sm text-gray-500 mt-1">Que no se te pase ninguna fecha.</p>
      </motion.header>

      <ReminderForm 
        form={form} 
        handleSubmit={handleSubmit} 
        itemVariants={itemVariants} 
      />

      <PendingReminders 
        reminders={pendingReminders} 
        handleMarkAsPaid={handleMarkAsPaid} 
        itemVariants={itemVariants} 
      />

      <PaidReminders 
        reminders={paidReminders} 
        handleDelete={handleDelete} 
        itemVariants={itemVariants} 
      />
      
    </motion.div>
  );
}