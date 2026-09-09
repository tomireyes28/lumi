import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { SummaryData, CardRecommendation, Reminder } from "@/types/dashboard";

export const useDashboard = () => {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [recommendation, setRecommendation] = useState<CardRecommendation | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [dueToday, setDueToday] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true; // Patrón para evitar memory leaks y renders en cascada

    const loadDashboardData = async () => {
      try {
        const [summaryData, recData, remindersData] = await Promise.all([
          apiFetch('/transactions/summary'),
          apiFetch('/credit-cards/recommendation').catch(() => null),
          apiFetch('/reminders').catch(() => []) 
        ]);
        
        if (!isMounted) return;

        setSummary(summaryData);
        setRecommendation(recData);
        
        const allReminders = remindersData as Reminder[];
        setReminders(allReminders);

        const today = new Date();
        const todayYear = today.getFullYear();
        const todayMonth = String(today.getMonth() + 1).padStart(2, '0');
        const todayDay = String(today.getDate()).padStart(2, '0');
        const todayString = `${todayYear}-${todayMonth}-${todayDay}`;

        const todayAlerts = allReminders.filter(r => {
          if (r.isPaid) return false;
          const dueString = typeof r.dueDate === 'string' ? r.dueDate.split('T')[0] : new Date(r.dueDate).toISOString().split('T')[0];
          return dueString === todayString;
        });
        
        setDueToday(todayAlerts);
      } catch (error) {
        console.error("Error cargando el dashboard:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadDashboardData();

    return () => {
      isMounted = false; // Cleanup function: si el usuario sale de la pantalla, abortamos los setStates
    };
  }, []);

  return { summary, recommendation, reminders, dueToday, loading };
};