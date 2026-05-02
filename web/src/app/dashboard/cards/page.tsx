"use client";

import { motion, Variants } from "framer-motion";
import { useCards } from "@/hooks/useCards";

export default function CardsPage() {
  const { cards, loading, form, handleSubmit } = useCards();

  // Variantes de animación
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
  };

  // Variante especial para que las tarjetas entren de costado (slide in)
  const cardVariants: Variants = {
    hidden: { opacity: 0, x: 50 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: "easeOut" } }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500 animate-pulse">Cargando billetera...</div>;
  }

  return (
    <motion.div 
      className="p-6 pb-24 flex flex-col gap-8"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.header variants={itemVariants}>
        <h1 className="text-2xl font-bold text-gray-900">Billetera</h1>
        <p className="text-sm text-gray-500 mt-1">Gestioná tus tarjetas de crédito.</p>
      </motion.header>

      {/* 1. CARRUSEL DE TARJETAS TIPO BANCO */}
      <motion.div variants={itemVariants} className="flex flex-col gap-3">
        <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Mis Plásticos</h2>
        
        {cards.length === 0 ? (
          <div className="p-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-center text-gray-500 text-sm">
            Todavía no tenés tarjetas cargadas.
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
            {cards.map(card => {
              const limitNum = Number(card.limit);
              const consumedNum = card.consumed || 0;
              const percent = limitNum > 0 ? Math.min((consumedNum / limitNum) * 100, 100) : 0;
              
              let barColor = "bg-white";
              if (percent > 85) barColor = "bg-red-400";
              else if (percent > 65) barColor = "bg-yellow-400";

              return (
                <motion.div 
                  variants={cardVariants}
                  key={card.id} 
                  className="shrink-0 w-80 h-48 rounded-2xl p-5 text-white shadow-lg flex flex-col justify-between relative overflow-hidden snap-center"
                  style={{ backgroundColor: card.colorHex || '#0f172a' }}
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-10 -mt-10 pointer-events-none"></div>
                  
                  <div className="flex justify-between items-start z-10">
                    <h3 className="font-bold text-lg tracking-wide">{card.alias}</h3>
                    <div className="w-8 h-6 bg-yellow-400/80 rounded flex items-center justify-center opacity-80">
                      <div className="w-full h-px bg-yellow-600/50"></div>
                    </div>
                  </div>

                  <div className="z-10 mt-auto">
                    <p className="text-xl tracking-widest font-mono mb-3">
                      **** **** **** {card.lastFour}
                    </p>
                    
                    <div className="mb-3">
                      <div className="flex justify-between text-xs font-medium mb-1 opacity-90">
                        <span>Consumido: ${consumedNum.toLocaleString('es-AR')}</span>
                        <span>Límite: ${limitNum.toLocaleString('es-AR')}</span>
                      </div>
                      <div className="w-full bg-black/20 rounded-full h-1.5">
                        <div 
                          className={`h-1.5 rounded-full ${barColor} transition-all duration-500`} 
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="flex justify-between text-[10px] uppercase tracking-wider opacity-70 font-bold">
                      <span>Cierra: {card.closingDay}</span>
                      <span>Vence: {card.dueDay}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* 2. FORMULARIO DE CARGA */}
      <motion.form 
        variants={itemVariants}
        onSubmit={handleSubmit} 
        className="bg-white p-5 rounded-2xl shadow-sm border border-sky-100"
      >
        <h2 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-wider">Nueva Tarjeta</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Alias (Nombre)</label>
            <input 
              type="text" required value={form.alias} onChange={(e) => form.setAlias(e.target.value)}
              placeholder="Ej: Visa Galicia"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">Últimos 4 números</label>
              <input 
                type="text" required maxLength={4} minLength={4} value={form.lastFour} onChange={(e) => form.setLastFour(e.target.value)}
                placeholder="Ej: 4567" inputMode="numeric"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-center tracking-widest font-mono"
              />
            </div>
            <div className="w-20">
              <label className="block text-xs font-medium text-gray-700 mb-1">Color</label>
              <input 
                type="color" value={form.colorHex} onChange={(e) => form.setColorHex(e.target.value)}
                className="w-full h-10.5 p-1 border border-gray-200 rounded-xl cursor-pointer bg-gray-50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Límite Total ($)</label>
            <input 
              type="number" required min="1" step="0.01" inputMode="decimal" value={form.limit} onChange={(e) => form.setLimit(e.target.value)}
              placeholder="Ej: 500000"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">Día que Cierra</label>
              <input 
                type="number" required min="1" max="31" inputMode="numeric" value={form.closingDay} onChange={(e) => form.setClosingDay(e.target.value)}
                placeholder="Ej: 25"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">Día que Vence</label>
              <input 
                type="number" required min="1" max="31" inputMode="numeric" value={form.dueDay} onChange={(e) => form.setDueDay(e.target.value)}
                placeholder="Ej: 5"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit" disabled={form.isSubmitting}
            className="w-full mt-2 bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {form.isSubmitting ? 'Guardando...' : 'Agregar Tarjeta'}
          </motion.button>
        </div>
      </motion.form>
    </motion.div>
  );
}