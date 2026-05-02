"use client";

import { CalendarClock, CheckCircle2, Trash2, Clock } from "lucide-react";
import { motion, Variants, AnimatePresence } from "framer-motion";
import { useReminders } from "@/hooks/useReminders";

export default function RemindersPage() {
  const { 
    loading, 
    pendingReminders, 
    paidReminders, 
    form, 
    handleSubmit, 
    handleMarkAsPaid, 
    handleDelete 
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

      {/* 1. FORMULARIO PARA AGENDAR */}
      <motion.form 
        variants={itemVariants}
        onSubmit={handleSubmit} 
        className="bg-white p-5 rounded-2xl shadow-sm border border-pink-100"
      >
        <h2 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-wider flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-pink-400" />
          Agendar Pago
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">¿Qué hay que pagar?</label>
            <input 
              type="text" required value={form.title} onChange={(e) => form.setTitle(e.target.value)}
              placeholder="Ej: Alquiler, Tarjeta, Luz..."
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">Monto (Opcional)</label>
              <input 
                type="number" step="0.01" inputMode="decimal" value={form.amount} onChange={(e) => form.setAmount(e.target.value)}
                placeholder="Ej: 45000"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">Fecha de Vencimiento</label>
              <input 
                type="date" required value={form.dueDate} onChange={(e) => form.setDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400"
              />
            </div>
          </div>

          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit" disabled={form.isSubmitting}
            className="w-full mt-2 bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {form.isSubmitting ? 'Guardando...' : 'Guardar Recordatorio'}
          </motion.button>
        </div>
      </motion.form>

      {/* 2. LISTA DE PENDIENTES */}
      <motion.div variants={itemVariants} className="flex flex-col gap-3">
        <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Próximos a Vencer</h2>
        
        {pendingReminders.length === 0 ? (
          <div className="p-6 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-center text-gray-500 text-sm">
            ¡Todo al día! No hay pagos pendientes.
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {pendingReminders.map(r => (
              <motion.div 
                key={r.id}
                layout // Esto permite que los otros elementos se reacomoden suavemente
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

      {/* 3. HISTORIAL DE PAGADOS */}
      {paidReminders.length > 0 && (
        <motion.div variants={itemVariants} className="flex flex-col gap-3 opacity-60">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-4">Ya Pagados</h2>
          <AnimatePresence mode="popLayout">
            {paidReminders.map(r => (
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
      )}
    </motion.div>
  );
}