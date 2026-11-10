import { businessDateKey, storedCalendarKey } from "@/lib/business-date";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { SummaryData, CardRecommendation, Reminder } from "@/types/dashboard";

export const useDashboard = () => {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [recommendation, setRecommendation] =
    useState<CardRecommendation | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [dueToday, setDueToday] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshIndex, setRefreshIndex] = useState(0);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    setRefreshIndex((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadDashboardData = async () => {
      try {
        const [summaryData, recData, remindersData] = await Promise.all([
          apiFetch<SummaryData>("/transactions/summary"),
          apiFetch<CardRecommendation | null>("/credit-cards/recommendation"),
          apiFetch<Reminder[]>("/reminders"),
        ]);

        if (!isMounted) return;

        setSummary(summaryData);
        setRecommendation(recData);
        setError(null);

        const allReminders = Array.isArray(remindersData) ? remindersData : [];
        setReminders(allReminders);

        const todayString = businessDateKey(new Date());

        const todayAlerts = allReminders.filter((r) => {
          if (r.isPaid) return false;
          const dueString = storedCalendarKey(r.dueOn ?? String(r.dueDate));
          return dueString === todayString;
        });

        setDueToday(todayAlerts);
      } catch (err) {
        console.error("Error cargando el dashboard:", err);
        if (isMounted) {
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo obtener tu resumen financiero.",
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadDashboardData();

    return () => {
      isMounted = false;
    };
  }, [refreshIndex]);

  return {
    summary,
    recommendation,
    reminders,
    dueToday,
    loading,
    error,
    reload,
  };
};
