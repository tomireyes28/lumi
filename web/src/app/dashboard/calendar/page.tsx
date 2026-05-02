"use client";

import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { isSameDay } from "date-fns";
import { motion, Variants, AnimatePresence } from "framer-motion";
import { useCalendar } from "@/hooks/useCalendar";

export default function CalendarPage() {
  const { 
    date, 
    setDate, 
    transactions, 
    reminders, 
    loading, 
    selectedTransactions, 
    selectedReminders 
  } = useCalendar();

  // Variantes para la página general
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
  };

  // Función inyectora para los puntitos del calendario
  const renderTileContent = ({ date: tileDate, view }: { date: Date, view: string }) => {
    if (view !== 'month') return null;

    const hasTransaction = transactions.some(t => isSameDay(new Date(t.date), tileDate));
    const hasReminder = reminders.some(r => isSameDay(new Date(r.dueDate), tileDate));

    return (
      <div className="flex justify-center gap-1 mt-1 h-2">
        {hasTransaction && <div className="w-1.5 h-1.5 rounded-full bg-sky-300" title="Movimiento" />}
        {hasReminder && <div className="w-1.5 h-1.5 rounded-full bg-pink-300" title="Vencimiento" />}
      </div>
    );
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

      {/* PISANDO LOS ESTILOS DE LA LIBRERÍA */}
      <style dangerouslySetInnerHTML={{ __html: `
        .react-calendar {
          width: 100%;
          border: none;
          font-family: inherit;
          background: transparent;
        }
        .react-calendar__navigation button {
          color: #0F172A;
          font-weight: bold;
          font-size: 1.125rem;
          border-radius: 0.5rem;
        }
        .react-calendar__navigation button:enabled:hover,
        .react-calendar__navigation button:enabled:focus {
          background-color: #f3f4f6;
        }
        abbr[title] {
          text-decoration: none;
          font-weight: 700;
          color: #9ca3af;
          font-size: 0.75rem;
          text-transform: uppercase;
        }
        .react-calendar__tile {
          padding: 0.75rem 0.5rem;
          border-radius: 1rem;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .react-calendar__tile:enabled:hover,
        .react-calendar__tile:enabled:focus {
          background-color: #f9fafb;
        }
        .react-calendar__tile--now {
          background: #fff1f2 !important;
          color: #F9A8D4;
          font-weight: bold;
        }
        .react-calendar__tile--active {
          background: #0F172A !important;
          color: white !important;
        }
      `}} />

      <motion.div variants={itemVariants} className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
        <Calendar 
          onChange={(value) => setDate(value as Date)} 
          value={date}
          tileContent={renderTileContent}
          minDetail="year"
          next2Label={null} 
          prev2Label={null}
        />
      </motion.div>

      {/* DETALLE DEL DÍA SELECCIONADO */}
      <motion.div variants={itemVariants} className="flex flex-col gap-4 mt-2">
        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
          {date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </h3>

        {selectedTransactions.length === 0 && selectedReminders.length === 0 && (
          <div className="p-4 bg-gray-50 rounded-2xl text-center text-sm text-gray-500 border border-dashed border-gray-200">
            No hay movimientos ni pagos para este día.
          </div>
        )}

        {/* AnimatePresence permite animar la entrada/salida cuando cambias de día */}
        <div className="flex flex-col gap-3">
          <AnimatePresence mode="popLayout">
            {selectedReminders.map(r => (
              <motion.div 
                key={r.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="p-3 bg-pink-50 rounded-xl border border-pink-200 flex justify-between items-center"
              >
                <span className="font-bold text-gray-900 text-sm">🔔 {r.title}</span>
                <span className="font-bold text-pink-600 text-sm">
                  {r.amount ? `$${Number(r.amount).toLocaleString('es-AR')}` : 'Pendiente'}
                </span>
              </motion.div>
            ))}

            {selectedTransactions.map(t => (
              <motion.div 
                key={t.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="p-3 bg-white shadow-sm border border-gray-100 rounded-xl flex justify-between items-center"
              >
                <span className="font-medium text-gray-700 text-sm">
                  {t.type === 'INCOME' ? 'Ingreso' : 'Gasto'}
                </span>
                <span className={`font-bold text-sm ${t.type === 'INCOME' ? 'text-sky-600' : 'text-gray-900'}`}>
                  {t.type === 'INCOME' ? '+' : '-'}${Number(t.amount).toLocaleString('es-AR')}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}