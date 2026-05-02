"use client";

import { useEffect, useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css"; // Estilos base
import { apiFetch } from "@/lib/api";
import { isSameDay } from "date-fns";

interface Transaction {
  id: string;
  date: string;
  amount: string;
  type: 'INCOME' | 'EXPENSE';
}

interface Reminder {
  id: string;
  title: string;
  amount: string | null;
  dueDate: string;
  isPaid: boolean;
}

export default function CalendarPage() {
  const [date, setDate] = useState<Date>(new Date());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [transData, remData] = await Promise.all([
        apiFetch('/transactions'),
        apiFetch('/reminders')
      ]);
      setTransactions(transData);
      setReminders(remData);
    } catch (error) {
      console.error("Error cargando datos del calendario:", error);
    } finally {
      setLoading(false);
    }
  };

  // Función que le inyecta contenido (los puntitos) a cada día del calendario
  const renderTileContent = ({ date: tileDate, view }: { date: Date, view: string }) => {
    if (view !== 'month') return null;

    // Buscamos si hay algo en esta fecha específica
    const hasTransaction = transactions.some(t => isSameDay(new Date(t.date), tileDate));
    const hasReminder = reminders.some(r => isSameDay(new Date(r.dueDate), tileDate));

    return (
      <div className="flex justify-center gap-1 mt-1 h-2">
        {hasTransaction && <div className="w-1.5 h-1.5 rounded-full bg-[#7DD3FC]" title="Movimiento" />}
        {hasReminder && <div className="w-1.5 h-1.5 rounded-full bg-[#F9A8D4]" title="Vencimiento" />}
      </div>
    );
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Cargando calendario...</div>;
  }

  // Filtramos qué pasó o qué va a pasar en el día seleccionado
  const selectedTransactions = transactions.filter(t => isSameDay(new Date(t.date), date));
  const selectedReminders = reminders.filter(r => isSameDay(new Date(r.dueDate), date));

  return (
    <div className="p-6 pb-24 flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Calendario</h1>
        <p className="text-sm text-gray-500 mt-1">Tus finanzas mes a mes.</p>
      </header>

      {/* PISANDO LOS ESTILOS DE LA LIBRERÍA */}
      <style dangerouslySetInnerHTML={{ __html: `
        .react-calendar {
          width: 100%;
          border: none;
          font-family: inherit;
          background: transparent;
        }
        .react-calendar__navigation button {
          color: #0F172A;
          font-weight: bold;
          font-size: 1.125rem;
          border-radius: 0.5rem;
        }
        .react-calendar__navigation button:enabled:hover,
        .react-calendar__navigation button:enabled:focus {
          background-color: #f3f4f6;
        }
        abbr[title] {
          text-decoration: none;
          font-weight: 700;
          color: #9ca3af;
          font-size: 0.75rem;
          text-transform: uppercase;
        }
        .react-calendar__tile {
          padding: 0.75rem 0.5rem;
          border-radius: 1rem;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .react-calendar__tile:enabled:hover,
        .react-calendar__tile:enabled:focus {
          background-color: #f9fafb;
        }
        .react-calendar__tile--now {
          background: #fff1f2 !important;
          color: #F9A8D4;
          font-weight: bold;
        }
        .react-calendar__tile--active {
          background: #0F172A !important;
          color: white !important;
        }
      `}} />

      <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
        <Calendar 
          onChange={(value) => setDate(value as Date)} 
          value={date}
          tileContent={renderTileContent}
          minDetail="year"
          next2Label={null} // Oculta botones de saltar años
          prev2Label={null}
        />
      </div>

      {/* DETALLE DEL DÍA SELECCIONADO */}
      <div className="flex flex-col gap-4 mt-2">
        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
          {date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </h3>

        {selectedTransactions.length === 0 && selectedReminders.length === 0 && (
          <div className="p-4 bg-gray-50 rounded-2xl text-center text-sm text-gray-500 border border-dashed border-gray-200">
            No hay movimientos ni pagos para este día.
          </div>
        )}

        {/* Lista de Vencimientos (Futuro) */}
        {selectedReminders.map(r => (
          <div key={r.id} className="p-3 bg-pink-50 rounded-xl border border-[#F9A8D4] flex justify-between items-center">
            <span className="font-bold text-gray-900 text-sm">🔔 {r.title}</span>
            <span className="font-bold text-pink-600 text-sm">
              {r.amount ? `$${Number(r.amount).toLocaleString('es-AR')}` : 'Pendiente'}
            </span>
          </div>
        ))}

        {/* Lista de Transacciones (Pasado) */}
        {selectedTransactions.map(t => (
          <div key={t.id} className="p-3 bg-white shadow-sm border border-gray-100 rounded-xl flex justify-between items-center">
            <span className="font-medium text-gray-700 text-sm">
              {t.type === 'INCOME' ? 'Ingreso' : 'Gasto'}
            </span>
            <span className={`font-bold text-sm ${t.type === 'INCOME' ? 'text-sky-600' : 'text-gray-900'}`}>
              {t.type === 'INCOME' ? '+' : '-'}${Number(t.amount).toLocaleString('es-AR')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}