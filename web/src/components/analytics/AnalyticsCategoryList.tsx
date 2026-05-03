import { useState } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { AnalyticsData } from "@/types/analytics";

interface AnalyticsCategoryListProps {
  data: AnalyticsData;
  itemVariants: Variants;
}

export function AnalyticsCategoryList({ data, itemVariants }: AnalyticsCategoryListProps) {
  // Estado para saber qué categoría está abierta (guardamos el índice o el ID)
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (data.categoryBreakdown.length === 0) return null;

  return (
    <motion.div variants={itemVariants} className="flex flex-col gap-3">
      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-2">
        Detalle por categoría
      </h3>
      
      {data.categoryBreakdown.map((cat, index) => {
        const isExpanded = expandedIndex === index;

        return (
          <motion.div
            key={index}
            variants={itemVariants} 
            className="bg-white rounded-2xl shadow-sm border border-gray-50 overflow-hidden"
          >
            {/* Cabecera Clickable */}
            <button 
              onClick={() => setExpandedIndex(isExpanded ? null : index)}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: cat.color }}
                ></div>
                <span className="font-semibold text-gray-800 text-sm">
                  {cat.name}
                </span>
              </div>
              
              <div className="flex items-center gap-3">
                <span className="font-bold text-gray-900 text-sm">
                  ${cat.total.toLocaleString("es-AR")}
                </span>
                <ChevronDown 
                  className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} 
                />
              </div>
            </button>

            {/* Contenido Desplegable (Transacciones) */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="border-t border-gray-100 bg-gray-50/30"
                >
                  <div className="p-4 flex flex-col gap-3">
                    {/* Verificamos si el backend nos mandó las transacciones */}
                    {cat.transactions && cat.transactions.length > 0 ? (
                      cat.transactions.map((tx, txIndex: number) => (
                        <div key={txIndex} className="flex justify-between items-center">
                          <div>
                            <p className="text-sm font-medium text-gray-700">
                              {tx.note || 'Consumo'}
                            </p>
                            <p className="text-xs text-gray-400">
                              {new Date(tx.date).toLocaleDateString('es-AR', { timeZone: 'UTC', day: '2-digit', month: 'short' })}
                            </p>
                          </div>
                          <span className="text-sm font-semibold text-gray-600">
                            ${Number(tx.amount).toLocaleString('es-AR')}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-gray-400 text-center italic py-2">
                        No hay detalles para mostrar.
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
          </motion.div>
        );
      })}
    </motion.div>
  );
}