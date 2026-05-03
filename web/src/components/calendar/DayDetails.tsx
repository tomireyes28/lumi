import { motion, AnimatePresence, Variants } from "framer-motion";
import { CalendarTransaction, CalendarReminder } from "@/types/calendar";

interface DayDetailsProps {
  date: Date;
  selectedTransactions: CalendarTransaction[];
  selectedReminders: CalendarReminder[];
  itemVariants: Variants;
}

export function DayDetails({ date, selectedTransactions, selectedReminders, itemVariants }: DayDetailsProps) {
  return (
    <motion.div variants={itemVariants} className="flex flex-col gap-4 mt-2">
      <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
        {date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
      </h3>

      {selectedTransactions.length === 0 && selectedReminders.length === 0 && (
        <div className="p-4 bg-gray-50 rounded-2xl text-center text-sm text-gray-500 border border-dashed border-gray-200">
          No hay movimientos ni pagos para este día.
        </div>
      )}

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
  );
}