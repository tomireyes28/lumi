"use client";

import { motion, Variants } from "framer-motion";
import { QueryError } from "@/components/ui/QueryError";
import { useCalendar } from "@/hooks/useCalendar";
import { CalendarWidget } from "@/components/calendar/CalendarWidget";
import { DayDetails } from "@/components/calendar/DayDetails";

export default function CalendarPage() {
  const {
    date,
    setDate,
    setActiveMonthDate,
    transactions,
    reminders,
    loading,
    error,
    reload,
    selectedTransactions,
    selectedReminders,
  } = useCalendar();

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: "easeOut" },
    },
  };

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
        onActiveMonthChange={setActiveMonthDate}
        transactions={transactions}
        reminders={reminders}
        itemVariants={itemVariants}
      />

      {loading ? (
        <p role="status">Cargando el mes seleccionado…</p>
      ) : error ? (
        <QueryError message={error} retry={reload} />
      ) : (
        <DayDetails
          date={date}
          selectedTransactions={selectedTransactions}
          selectedReminders={selectedReminders}
          itemVariants={itemVariants}
        />
      )}
    </motion.div>
  );
}
