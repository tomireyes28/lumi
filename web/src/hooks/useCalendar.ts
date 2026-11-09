import { useEffect, useState, useMemo } from "react";
import { apiFetch } from "@/lib/api";
import { format } from "date-fns";
import { CalendarTransaction, CalendarReminder } from "@/types/calendar";
import { PaginatedTransactionsResponse } from "@/types/transactions";
import { toast } from "sonner";
import {
  businessDateKey,
  storedCalendarKey,
  calendarWidgetToday,
} from "@/lib/business-date";

export const useCalendar = () => {
  const [date, setDate] = useState<Date>(calendarWidgetToday);
  const [activeMonthDate, setActiveMonthDate] =
    useState<Date>(calendarWidgetToday);
  const [transactions, setTransactions] = useState<CalendarTransaction[]>([]);
  const [reminders, setReminders] = useState<CalendarReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const viewedMonth = activeMonthDate.getMonth() + 1;
  const viewedYear = activeMonthDate.getFullYear();

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const [transData, remData] = await Promise.all([
          apiFetch<CalendarTransaction[] | PaginatedTransactionsResponse>(
            `/transactions?month=${viewedMonth}&year=${viewedYear}&page=1&limit=100`,
          ),
          apiFetch<CalendarReminder[]>(
            `/reminders?month=${viewedMonth}&year=${viewedYear}`,
          ),
        ]);

        if (isMounted) {
          const txList = Array.isArray(transData)
            ? transData
            : Array.isArray(transData?.data)
              ? transData.data
              : [];
          setTransactions(txList);
          setReminders(Array.isArray(remData) ? remData : []);
          setError(null);
        }
      } catch (err) {
        console.error("Error cargando datos del calendario:", err);
        if (isMounted) {
          setError("Hubo un error al cargar los datos del calendario.");
          toast.error("Hubo un error al cargar los datos del calendario.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [viewedMonth, viewedYear]);

  const handleDateChange = (nextDate: Date) => {
    setDate(nextDate);
    if (
      nextDate.getMonth() !== activeMonthDate.getMonth() ||
      nextDate.getFullYear() !== activeMonthDate.getFullYear()
    ) {
      setActiveMonthDate(nextDate);
    }
  };

  const selectedDateKey = useMemo(() => format(date, "yyyy-MM-dd"), [date]);

  const selectedTransactions = useMemo(() => {
    return transactions.filter(
      (t) => businessDateKey(t.date) === selectedDateKey,
    );
  }, [transactions, selectedDateKey]);

  const selectedReminders = useMemo(() => {
    return reminders.filter(
      (r) => storedCalendarKey(r.dueOn ?? r.dueDate) === selectedDateKey,
    );
  }, [reminders, selectedDateKey]);

  return {
    date,
    setDate: handleDateChange,
    activeMonthDate,
    setActiveMonthDate,
    transactions,
    reminders,
    loading,
    error,
    selectedTransactions,
    selectedReminders,
  };
};
