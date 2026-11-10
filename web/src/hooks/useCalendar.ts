import { useCallback, useState, useMemo } from "react";
import { apiFetch } from "@/lib/api";
import { format } from "date-fns";
import { CalendarTransaction, CalendarReminder } from "@/types/calendar";
import { PaginatedTransactionsResponse } from "@/types/transactions";
import { useResource } from "./useResource";
import {
  businessDateKey,
  storedCalendarKey,
  calendarWidgetToday,
} from "@/lib/business-date";

import { createMonthLoader } from "@/lib/transaction-pages";

export const useCalendar = () => {
  const [date, setDate] = useState<Date>(calendarWidgetToday);
  const [activeMonthDate, setActiveMonthDate] =
    useState<Date>(calendarWidgetToday);
  const viewedMonth = activeMonthDate.getMonth() + 1;
  const viewedYear = activeMonthDate.getFullYear();

  const load = useCallback(
    async (signal: AbortSignal) => {
      const loadMonth = createMonthLoader((path) =>
        apiFetch<PaginatedTransactionsResponse>(path, { signal }),
      );
      const [transactions, reminders] = await Promise.all([
        loadMonth(viewedMonth, viewedYear),
        apiFetch<CalendarReminder[]>(
          `/reminders?month=${viewedMonth}&year=${viewedYear}`,
          { signal },
        ),
      ]);
      return { transactions, reminders };
    },
    [viewedMonth, viewedYear],
  );
  const { data, loading, error, reload } = useResource(
    `${viewedYear}-${viewedMonth}`,
    load,
  );
  const transactions: CalendarTransaction[] = useMemo(
    () => data?.transactions ?? [],
    [data],
  );
  const reminders = useMemo(() => data?.reminders ?? [], [data]);

  const handleDateChange = (nextDate: Date) => {
    setDate(nextDate);
    if (
      nextDate.getMonth() !== activeMonthDate.getMonth() ||
      nextDate.getFullYear() !== activeMonthDate.getFullYear()
    ) {
      setActiveMonthDate(nextDate);
    }
  };

  const handleMonthChange = (next: Date) => {
    setActiveMonthDate(next);
    setDate((selected) =>
      selected.getFullYear() === next.getFullYear() &&
      selected.getMonth() === next.getMonth()
        ? selected
        : new Date(next.getFullYear(), next.getMonth(), 1),
    );
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
    setActiveMonthDate: handleMonthChange,
    transactions,
    reminders,
    loading,
    error,
    reload,
    selectedTransactions,
    selectedReminders,
  };
};
