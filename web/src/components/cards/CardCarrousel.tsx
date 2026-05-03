import { motion, Variants } from "framer-motion";
import { CreditCard } from "@/types/cards";
import { Pencil, Trash2 } from "lucide-react";

interface CardCarouselProps {
  cards: CreditCard[];
  itemVariants: Variants;
  cardVariants: Variants;
  onEditClick: (card: CreditCard) => void;
  onDeleteClick: (card: CreditCard) => void;
}

export function CardCarousel({ cards, itemVariants, cardVariants, onEditClick, onDeleteClick }: CardCarouselProps) {
  return (
    <motion.div variants={itemVariants} className="flex flex-col gap-3">
      <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Mis Plásticos</h2>
      
      {cards.length === 0 ? (
        <div className="p-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-center text-gray-500 text-sm">
          Todavía no tenés tarjetas cargadas.
        </div>
      ) : (
        /* 
          1. CONTENEDOR DEL SCROLL:
          - snap-x snap-mandatory: Activa el magnetismo.
          - scrollbar-hide: Oculta la barra nativa. (Si no te funciona, podemos usar clases estándar).
          - -mx-6 px-6: Esto es un truco PRO de Tailwind. Permite que la tarjeta se deslice hasta 
            el borde de la pantalla, pero cuando vuelve al inicio, respeta el padding general de tu app.
        */
        <div className="flex gap-4 overflow-x-auto pb-4 pt-2 -mx-6 px-6 scrollbar-hide snap-x snap-mandatory">
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
                /* 
                  2. LA TARJETA:
                  - min-w-[85vw] sm:min-w-[320px]: En celu ocupa el 85% de la pantalla (deja espiar a la otra), 
                    en compu/tablet se clava en 320px para no quedar gigante.
                  - snap-center: Cuando soltás el dedo, la tarjeta se centra.
                */
                className="shrink-0 min-w-[85vw] sm:min-w-[320px] h-48 rounded-2xl p-5 text-white shadow-lg flex flex-col justify-between relative overflow-hidden snap-center group"
                style={{ backgroundColor: card.colorHex || '#0f172a' }}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-10 -mt-10 pointer-events-none"></div>
                
                {/* Botones de acción */}
                <div className="absolute top-3 left-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20 bg-black/20 p-1.5 rounded-lg backdrop-blur-sm">
                  <button onClick={() => onEditClick(card)} className="p-1 hover:text-white text-white/70 transition-colors" title="Editar">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => onDeleteClick(card)} className="p-1 hover:text-red-400 text-white/70 transition-colors" title="Borrar">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex justify-between items-start z-10 pl-16">
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
                      <div className={`h-1.5 rounded-full ${barColor} transition-all duration-500`} style={{ width: `${percent}%` }}></div>
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
  );
}