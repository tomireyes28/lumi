import { motion, AnimatePresence, Variants } from "framer-motion";
import { CheckCircle2, Clock } from "lucide-react";
import { Reminder } from "@/types/reminders";

interface PendingRemindersProps {
  reminders: Reminder[];
  handleMarkAsPaid: (id: string) => void;
  itemVariants: Variants;
}

export function PendingReminders({ reminders, handleMarkAsPaid, itemVariants }: PendingRemindersProps) {
  return (
    <motion.div variants={itemVariants} className="flex flex-col gap-3">
      <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Próximos a Vencer</h2>
      
      {reminders.length === 0 ? (
        <div className="p-6 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-center text-gray-500 text-sm">
          ¡Todo al día! No hay pagos pendientes.
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          {reminders.map(r => (
            <motion.div 
              key={r.id}
              layout 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, x: -50 }}
              transition={{ duration: 0.3 }}
              className="p-4 bg-white rounded-2xl shadow-sm border-l-4 border-l-brand-expense border-y border-r border-gray-100 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-pink-50 text-pink-500 rounded-lg">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{r.title}</h3>
                  <p className="text-xs text-gray-500">
                    Vence: {new Date(r.dueDate).toLocaleDateString('es-AR', { timeZone: 'UTC' })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {r.amount && (
                  <span className="font-bold text-gray-900">${Number(r.amount).toLocaleString('es-AR')}</span>
                )}
                <button 
                  onClick={() => handleMarkAsPaid(r.id)}
                  className="p-2 text-gray-300 hover:text-green-500 hover:bg-green-50 rounded-lg transition-colors"
                  title="Marcar como pagado"
                >
                  <CheckCircle2 className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      )}
    </motion.div>
  );
}