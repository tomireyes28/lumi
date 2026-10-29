import { useEffect, useState, useMemo } from "react";
import { apiFetch } from "@/lib/api";
import { format } from "date-fns";
import { CalendarTransaction, CalendarReminder } from "@/types/calendar";
import { toast } from "sonner";

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
        toast.error("Hubo un error al cargar los datos del calendario.");
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

  const selectedDateKey = useMemo(() => format(date, "yyyy-MM-dd"), [date]);

  // Optimizamos el filtrado comparando YYYY-MM-DD para evitar desfase por zona horaria (UTC vs UTC-3)
  const selectedTransactions = useMemo(() => {
    return transactions.filter((t) => String(t.date).split("T")[0] === selectedDateKey);
  }, [transactions, selectedDateKey]);

  const selectedReminders = useMemo(() => {
    return reminders.filter((r) => String(r.dueDate).split("T")[0] === selectedDateKey);
  }, [reminders, selectedDateKey]);

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
