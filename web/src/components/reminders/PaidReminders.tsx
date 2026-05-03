import { motion, AnimatePresence, Variants } from "framer-motion";
import { Trash2 } from "lucide-react";
import { Reminder } from "@/types/reminders";

interface PaidRemindersProps {
  reminders: Reminder[];
  handleDelete: (id: string) => void;
  itemVariants: Variants;
}

export function PaidReminders({ reminders, handleDelete, itemVariants }: PaidRemindersProps) {
  if (reminders.length === 0) return null;

  return (
    <motion.div variants={itemVariants} className="flex flex-col gap-3 opacity-60">
      <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-4">Ya Pagados</h2>
      <AnimatePresence mode="popLayout">
        {reminders.map(r => (
          <motion.div 
            key={r.id}
            layout
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, scale: 0.9, x: 50 }}
            transition={{ duration: 0.3 }}
            className="p-3 bg-gray-50 rounded-xl flex items-center justify-between"
          >
            <span className="text-sm font-medium line-through">{r.title}</span>
            <button 
              onClick={() => handleDelete(r.id)}
              className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}