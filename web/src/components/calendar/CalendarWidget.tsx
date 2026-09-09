import { useMemo } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { format } from "date-fns";
import { motion, Variants } from "framer-motion";
import { CalendarTransaction, CalendarReminder } from "@/types/calendar";

interface CalendarWidgetProps {
  date: Date;
  setDate: (date: Date) => void;
  transactions: CalendarTransaction[];
  reminders: CalendarReminder[];
  itemVariants: Variants;
}

export function CalendarWidget({ date, setDate, transactions, reminders, itemVariants }: CalendarWidgetProps) {
  // Optimizamos el rendimiento de O(N * 42) a O(1) precomputando conjuntos indexados de fechas
  const transactionDates = useMemo(() => {
    const set = new Set<string>();
    for (const t of transactions) {
      if (t.date) {
        try {
          set.add(format(new Date(t.date), 'yyyy-MM-dd'));
        } catch {
          // Ignorar fechas con formato inválido
        }
      }
    }
    return set;
  }, [transactions]);

  const reminderDates = useMemo(() => {
    const set = new Set<string>();
    for (const r of reminders) {
      if (r.dueDate) {
        try {
          set.add(format(new Date(r.dueDate), 'yyyy-MM-dd'));
        } catch {
          // Ignorar fechas con formato inválido
        }
      }
    }
    return set;
  }, [reminders]);

  const renderTileContent = ({ date: tileDate, view }: { date: Date, view: string }) => {
    if (view !== 'month') return null;

    const tileKey = format(tileDate, 'yyyy-MM-dd');
    const hasTransaction = transactionDates.has(tileKey);
    const hasReminder = reminderDates.has(tileKey);

    if (!hasTransaction && !hasReminder) return null;

    return (
      <div className="flex justify-center gap-1 mt-1 h-2">
        {hasTransaction && <div className="w-1.5 h-1.5 rounded-full bg-sky-300" title="Movimiento" />}
        {hasReminder && <div className="w-1.5 h-1.5 rounded-full bg-pink-300" title="Vencimiento" />}
      </div>
    );
  };

  return (
    <>
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
    </>
  );
}