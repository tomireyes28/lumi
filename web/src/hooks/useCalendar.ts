import { useEffect, useState, useMemo } from "react";
import { apiFetch } from "@/lib/api";
import { isSameDay } from "date-fns";
import { CalendarTransaction, CalendarReminder } from "@/types/calendar";

export const useCalendar = () => {
  const [date, setDate] = useState<Date>(new Date());
  const [transactions, setTransactions] = useState<CalendarTransaction[]>([]);
  const [reminders, setReminders] = useState<CalendarReminder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const [transData, remData] = await Promise.all([
          apiFetch('/transactions'),
          apiFetch('/reminders')
        ]);
        
        if (isMounted) {
          setTransactions(transData);
          setReminders(remData);
        }
      } catch (error) {
        console.error("Error cargando datos del calendario:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Optimizamos el filtrado para que no consuma recursos innecesarios al renderizar
  const selectedTransactions = useMemo(() => {
    return transactions.filter(t => isSameDay(new Date(t.date), date));
  }, [transactions, date]);

  const selectedReminders = useMemo(() => {
    return reminders.filter(r => isSameDay(new Date(r.dueDate), date));
  }, [reminders, date]);

  return {
    date,
    setDate,
    transactions,
    reminders,
    loading,
    selectedTransactions,
    selectedReminders
  };
};