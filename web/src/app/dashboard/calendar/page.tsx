"use client";

import { motion, Variants } from "framer-motion";
import { useCalendar } from "@/hooks/useCalendar";
import { CalendarWidget } from "@/components/calendar/CalendarWidget";
import { DayDetails } from "@/components/calendar/DayDetails";

export default function CalendarPage() {
  const { 
    date, setDate, transactions, reminders, loading, selectedTransactions, selectedReminders 
  } = useCalendar();

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500 animate-pulse">Cargando calendario...</div>;
  }

  return (
    <motion.div 
      className="p-6 pb-24 flex flex-col gap-6"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.header variants={itemVariants}>
        <h1 className="text-2xl font-bold text-gray-900">Calendario</h1>
        <p className="text-sm text-gray-500 mt-1">Tus finanzas mes a mes.</p>
      </motion.header>

      <CalendarWidget 
        date={date}
        setDate={setDate}
        transactions={transactions}
        reminders={reminders}
        itemVariants={itemVariants}
      />

      <DayDetails 
        date={date}
        selectedTransactions={selectedTransactions}
        selectedReminders={selectedReminders}
        itemVariants={itemVariants}
      />
    </motion.div>
  );
}