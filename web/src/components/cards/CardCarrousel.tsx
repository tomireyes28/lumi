import { motion, Variants } from "framer-motion";
import { CreditCard } from "@/types/cards";
import { Pencil, Trash2, CalendarDays } from "lucide-react";

interface CardCarouselProps {
  cards: CreditCard[];
  itemVariants: Variants;
  cardVariants: Variants;
  onEditClick: (card: CreditCard) => void;
  onDeleteClick: (card: CreditCard) => void;
  onAdjustCycleClick?: (card: CreditCard) => void;
}

export function CardCarousel({
  cards,
  itemVariants,
  cardVariants,
  onEditClick,
  onDeleteClick,
  onAdjustCycleClick,
}: CardCarouselProps) {
  return (
    <motion.div variants={itemVariants} className="flex flex-col gap-3">
      <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Mis Plásticos</h2>

      {cards.length === 0 ? (
        <div className="p-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-center text-gray-500 text-sm">
          Todavía no tenés tarjetas cargadas.
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 pt-2 -mx-6 px-6 scrollbar-hide snap-x snap-mandatory">
          {cards.map((card) => {
            const limitNum = Number(card.limit);
            const consumedNum = card.consumed || 0;
            const percent = limitNum > 0 ? Math.min((consumedNum / limitNum) * 100, 100) : 0;

            let barColor = "bg-white";
            if (percent > 85) barColor = "bg-red-400";
            else if (percent > 65) barColor = "bg-yellow-400";

            // Formateo de fecha de cierre y vencimiento para este ciclo
            const closingLabel = card.currentCycle?.closingDate
              ? new Date(card.currentCycle.closingDate).toLocaleDateString("es-AR", {
                  day: "numeric",
                  month: "short",
                })
              : `Día ${card.closingDay}`;

            const dueLabel = card.currentCycle?.dueDate
              ? new Date(card.currentCycle.dueDate).toLocaleDateString("es-AR", {
                  day: "numeric",
                  month: "short",
                })
              : `Día ${card.dueDay}`;

            return (
              <motion.div
                variants={cardVariants}
                key={card.id}
                className="shrink-0 min-w-[85vw] sm:min-w-[320px] h-48 rounded-2xl p-5 text-white shadow-lg flex flex-col justify-between relative overflow-hidden snap-center group"
                style={{ backgroundColor: card.colorHex || "#0f172a" }}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-10 -mt-10 pointer-events-none"></div>

                {/* Botones de acción en hover/desktop */}
                <div className="absolute top-3 left-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20 bg-black/20 p-1.5 rounded-lg backdrop-blur-sm">
                  {onAdjustCycleClick && (
                    <button
                      onClick={() => onAdjustCycleClick(card)}
                      className="p-1 hover:text-sky-300 text-white/70 transition-colors"
                      title="Ajustar fecha de cierre mensual"
                    >
                      <CalendarDays className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => onEditClick(card)}
                    className="p-1 hover:text-white text-white/70 transition-colors"
                    title="Editar tarjeta"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDeleteClick(card)}
                    className="p-1 hover:text-red-400 text-white/70 transition-colors"
                    title="Borrar tarjeta"
                  >
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
                      <span>Consumido: ${consumedNum.toLocaleString("es-AR")}</span>
                      <span>Límite: ${limitNum.toLocaleString("es-AR")}</span>
                    </div>
                    <div className="w-full bg-black/20 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${barColor} transition-all duration-500`}
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[10px] uppercase tracking-wider opacity-90 font-bold">
                    <div className="flex items-center gap-1.5">
                      <span>Cierre: {closingLabel}</span>
                      {card.currentCycle?.isCustom && (
                        <span className="bg-sky-400/30 text-sky-200 border border-sky-400/40 text-[9px] px-1.5 py-0.5 rounded font-semibold tracking-normal normal-case">
                          Ajustado
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span>Vence: {dueLabel}</span>
                      {onAdjustCycleClick && (
                        <button
                          type="button"
                          onClick={() => onAdjustCycleClick(card)}
                          className="text-[10px] font-bold normal-case underline hover:text-sky-300 text-white/90 transition-colors"
                          title="Ajustar fecha de cierre"
                        >
                          Cambiar
                        </button>
                      )}
                    </div>
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