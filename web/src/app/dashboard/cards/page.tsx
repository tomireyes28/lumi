"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface CreditCard {
  id: string;
  alias: string;
  lastFour: string;
  limit: number | string;
  closingDay: number;
  dueDay: number;
  colorHex: string | null;
  consumed?: number; 
}

export default function CardsPage() {
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados del formulario
  const [alias, setAlias] = useState("");
  const [lastFour, setLastFour] = useState("");
  const [limit, setLimit] = useState("");
  const [closingDay, setClosingDay] = useState("");
  const [dueDay, setDueDay] = useState("");
  const [colorHex, setColorHex] = useState("#0f172a"); // Color oscuro por defecto
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadCards();
  }, []);

  const loadCards = async () => {
    try {
      const data = await apiFetch('/credit-cards');
      setCards(data);
    } catch (error) {
      console.error("Error cargando tarjetas:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiFetch('/credit-cards', {
        method: 'POST',
        body: JSON.stringify({
          alias,
          lastFour,
          limit: Number(limit),
          closingDay: Number(closingDay),
          dueDay: Number(dueDay),
          colorHex,
        }),
      });
      
      // Limpiamos el formulario
      setAlias("");
      setLastFour("");
      setLimit("");
      setClosingDay("");
      setDueDay("");
      setColorHex("#0f172a");
      
      // Recargamos el carrusel
      await loadCards();
    } catch (error) {
      console.error("Error creando tarjeta:", error);
      alert("Hubo un error al guardar la tarjeta. Revisá los datos.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Cargando billetera...</div>;
  }

  return (
    <div className="p-6 pb-24 flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Billetera</h1>
        <p className="text-sm text-gray-500 mt-1">Gestioná tus tarjetas de crédito.</p>
      </header>

      {/* 1. CARRUSEL DE TARJETAS TIPO BANCO */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Mis Plásticos</h2>
        
        {cards.length === 0 ? (
          <div className="p-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-center text-gray-500 text-sm">
            Todavía no tenés tarjetas cargadas.
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
            {cards.map(card => {
              // Calculamos el porcentaje gastado
              const limitNum = Number(card.limit);
              const consumedNum = card.consumed || 0;
              const percent = limitNum > 0 ? Math.min((consumedNum / limitNum) * 100, 100) : 0;
              
              // Lógica de colores para la barra de alerta
              let barColor = "bg-white";
              if (percent > 85) barColor = "bg-red-400";
              else if (percent > 65) barColor = "bg-yellow-400";

              return (
                <div 
                  key={card.id} 
                  className="shrink-0 w-80 h-48 rounded-2xl p-5 text-white shadow-lg flex flex-col justify-between relative overflow-hidden snap-center"
                  style={{ backgroundColor: card.colorHex || '#0f172a' }}
                >
                  {/* Decoración circular de fondo para darle textura */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-10 -mt-10 pointer-events-none"></div>
                  
                  <div className="flex justify-between items-start z-10">
                    <h3 className="font-bold text-lg tracking-wide">{card.alias}</h3>
                    {/* El "Chip" de la tarjeta */}
                    <div className="w-8 h-6 bg-yellow-400/80 rounded flex items-center justify-center opacity-80">
                      <div className="w-full h-px bg-yellow-600/50"></div>
                    </div>
                  </div>

                  <div className="z-10 mt-auto">
                    <p className="text-xl tracking-widest font-mono mb-3">
                      **** **** **** {card.lastFour}
                    </p>
                    
                    {/* BARRA DE PROGRESO */}
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
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. FORMULARIO DE CARGA */}
      <form onSubmit={handleSubmit} className="bg-white p-5 rounded-2xl shadow-sm border border-sky-100">
        <h2 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-wider">Nueva Tarjeta</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Alias (Nombre)</label>
            <input 
              type="text" required value={alias} onChange={(e) => setAlias(e.target.value)}
              placeholder="Ej: Visa Galicia"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">Últimos 4 números</label>
              <input 
                type="text" required maxLength={4} minLength={4} value={lastFour} onChange={(e) => setLastFour(e.target.value)}
                placeholder="Ej: 4567" inputMode="numeric"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-center tracking-widest font-mono"
              />
            </div>
            <div className="w-20">
              <label className="block text-xs font-medium text-gray-700 mb-1">Color</label>
              <input 
                type="color" value={colorHex} onChange={(e) => setColorHex(e.target.value)}
                className="w-full h-[42px] p-1 border border-gray-200 rounded-xl cursor-pointer bg-gray-50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Límite Total ($)</label>
            <input 
              type="number" required min="1" step="0.01" inputMode="decimal" value={limit} onChange={(e) => setLimit(e.target.value)}
              placeholder="Ej: 500000"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">Día que Cierra</label>
              <input 
                type="number" required min="1" max="31" inputMode="numeric" value={closingDay} onChange={(e) => setClosingDay(e.target.value)}
                placeholder="Ej: 25"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">Día que Vence</label>
              <input 
                type="number" required min="1" max="31" inputMode="numeric" value={dueDay} onChange={(e) => setDueDay(e.target.value)}
                placeholder="Ej: 5"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          <button 
            type="submit" disabled={isSubmitting}
            className="w-full mt-2 bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Guardando...' : 'Agregar Tarjeta'}
          </button>
        </div>
      </form>
    </div>
  );
}