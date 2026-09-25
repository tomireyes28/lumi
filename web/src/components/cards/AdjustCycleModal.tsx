"use client";

import { useState, useId } from "react";
import { CreditCard, CardCycle } from "@/types/cards";
import { Modal } from "@/components/ui/Modal";
import { Calendar, CheckCircle2, RotateCcw } from "lucide-react";

interface AdjustCycleModalProps {
  card: CreditCard | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveCycle: (
    cardId: string,
    data: { month: number; year: number; closingDate: string; dueDate?: string },
  ) => Promise<void>;
  onDeleteCycle: (cardId: string, cycleId: string) => Promise<void>;
}

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

export function AdjustCycleModal({
  card,
  isOpen,
  onClose,
  onSaveCycle,
  onDeleteCycle,
}: AdjustCycleModalProps) {
  const monthSelectId = useId();
  const yearSelectId = useId();
  const closingDateId = useId();
  const dueDateId = useId();

  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth() + 1); // 1 - 12
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!card) return null;

  // Buscar si ya existe un ciclo configurado para el mes/año seleccionado
  const existingCycle: CardCycle | undefined = card.cycles?.find(
    (c) => c.month === selectedMonth && c.year === selectedYear,
  );

  // Helper para generar fecha por defecto en formato YYYY-MM-DD
  const formatDefaultDate = (year: number, month: number, day: number) => {
    const daysInMonth = new Date(year, month, 0).getDate();
    const clampedDay = Math.min(day, daysInMonth);
    return `${year}-${String(month).padStart(2, "0")}-${String(clampedDay).padStart(2, "0")}`;
  };

  const currentClosingValue = existingCycle
    ? existingCycle.closingDate.split("T")[0]
    : formatDefaultDate(selectedYear, selectedMonth, card.closingDay);

  const currentDueValue = existingCycle?.dueDate
    ? existingCycle.dueDate.split("T")[0]
    : (() => {
        const dueMonth = card.dueDay < card.closingDay ? (selectedMonth === 12 ? 1 : selectedMonth + 1) : selectedMonth;
        const dueYear = card.dueDay < card.closingDay && selectedMonth === 12 ? selectedYear + 1 : selectedYear;
        return formatDefaultDate(dueYear, dueMonth, card.dueDay);
      })();

  const [formClosingDate, setFormClosingDate] = useState<string>(currentClosingValue);
  const [formDueDate, setFormDueDate] = useState<string>(currentDueValue);

  // Al cambiar mes o año, sincronizamos los valores del formulario
  const handleMonthChange = (month: number) => {
    setSelectedMonth(month);
    const cycle = card.cycles?.find((c) => c.month === month && c.year === selectedYear);
    if (cycle) {
      setFormClosingDate(cycle.closingDate.split("T")[0]);
      setFormDueDate(cycle.dueDate ? cycle.dueDate.split("T")[0] : "");
    } else {
      setFormClosingDate(formatDefaultDate(selectedYear, month, card.closingDay));
      const dueMonth = card.dueDay < card.closingDay ? (month === 12 ? 1 : month + 1) : month;
      const dueYear = card.dueDay < card.closingDay && month === 12 ? selectedYear + 1 : selectedYear;
      setFormDueDate(formatDefaultDate(dueYear, dueMonth, card.dueDay));
    }
  };

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    const cycle = card.cycles?.find((c) => c.month === selectedMonth && c.year === year);
    if (cycle) {
      setFormClosingDate(cycle.closingDate.split("T")[0]);
      setFormDueDate(cycle.dueDate ? cycle.dueDate.split("T")[0] : "");
    } else {
      setFormClosingDate(formatDefaultDate(year, selectedMonth, card.closingDay));
      const dueMonth = card.dueDay < card.closingDay ? (selectedMonth === 12 ? 1 : selectedMonth + 1) : selectedMonth;
      const dueYear = card.dueDay < card.closingDay && selectedMonth === 12 ? year + 1 : year;
      setFormDueDate(formatDefaultDate(dueYear, dueMonth, card.dueDay));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formClosingDate) return;
    setIsSubmitting(true);
    try {
      await onSaveCycle(card.id, {
        month: selectedMonth,
        year: selectedYear,
        closingDate: formClosingDate,
        dueDate: formDueDate || undefined,
      });
      onClose();
    } catch {
      // El toast ya lo maneja useCards
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetToDefault = async () => {
    if (!existingCycle) return;
    setIsDeleting(true);
    try {
      await onDeleteCycle(card.id, existingCycle.id);
      // Volvemos a los valores por defecto
      setFormClosingDate(formatDefaultDate(selectedYear, selectedMonth, card.closingDay));
    } catch {
      // Error manejado en hook
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Elegir cierre de este mes">
      <div className="flex flex-col gap-5">
        {/* Cabecera de la Tarjeta */}
        <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-4 h-10 rounded-lg shadow-xs"
              style={{ backgroundColor: card.colorHex || "#0f172a" }}
            />
            <div>
              <h4 className="font-bold text-gray-900 text-sm">{card.alias}</h4>
              <p className="text-xs text-gray-500 font-mono tracking-wider">
                **** **** **** {card.lastFour}
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
              Día Habitual
            </span>
            <span className="text-xs font-semibold text-gray-700">
              Cierra el {card.closingDay}
            </span>
          </div>
        </div>

        {/* Selector de Mes y Año */}
        <div>
          <span className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">
            ¿Para qué mes querés definir la fecha?
          </span>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={monthSelectId} className="block text-[11px] text-gray-500 mb-1 font-medium">Mes del resumen</label>
              <select
                id={monthSelectId}
                value={selectedMonth}
                onChange={(e) => handleMonthChange(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor={yearSelectId} className="block text-[11px] text-gray-500 mb-1 font-medium">Año</label>
              <select
                id={yearSelectId}
                value={selectedYear}
                onChange={(e) => handleYearChange(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value={today.getFullYear() - 1}>{today.getFullYear() - 1}</option>
                <option value={today.getFullYear()}>{today.getFullYear()}</option>
                <option value={today.getFullYear() + 1}>{today.getFullYear() + 1}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Estado actual del mes seleccionado */}
        <div className="flex items-center justify-between text-xs px-1">
          {existingCycle ? (
            <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Fecha personalizada guardada
            </span>
          ) : (
            <span className="text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Usando día habitual ({card.closingDay})
            </span>
          )}

          {existingCycle && (
            <button
              type="button"
              onClick={handleResetToDefault}
              disabled={isDeleting}
              className="text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 hover:underline disabled:opacity-50"
            >
              <RotateCcw className="w-3 h-3" />
              {isDeleting ? "Restableciendo..." : "Restablecer a día habitual"}
            </button>
          )}
        </div>

        {/* Formulario de fechas exactas */}
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label htmlFor={closingDateId} className="block text-xs font-semibold text-gray-800 mb-1">
              Fecha exacta de cierre
            </label>
            <input
              id={closingDateId}
              type="date"
              required
              value={formClosingDate}
              onChange={(e) => setFormClosingDate(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <p className="text-[11px] text-gray-500 mt-1">
              Los consumos hasta las 23:59hs de este día entrarán en el resumen de {MONTH_NAMES[selectedMonth - 1]}.
            </p>
          </div>

          <div>
            <label htmlFor={dueDateId} className="block text-xs font-semibold text-gray-800 mb-1">
              Fecha de vencimiento del pago (opcional)
            </label>
            <input
              id={dueDateId}
              type="date"
              value={formDueDate}
              onChange={(e) => setFormDueDate(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <p className="text-[11px] text-gray-500 mt-1">
              La fecha límite en la que debés abonar el resumen de la tarjeta.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 font-bold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 font-bold text-white bg-gray-900 rounded-xl hover:bg-gray-800 transition-colors text-sm disabled:opacity-50"
            >
              {isSubmitting ? "Guardando..." : "Guardar para este mes"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
