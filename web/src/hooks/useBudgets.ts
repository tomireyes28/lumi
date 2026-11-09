import { calendarWidgetToday } from "@/lib/business-date";
import { useCallback, useState, useMemo } from "react";
import { apiFetch } from "@/lib/api";
import { BudgetsSummaryResponse } from "@/types/budgets";
import { Category } from "@/types/categories";
import { toast } from "sonner";

import { useResource } from "./useResource";
import { refreshAfterMutation } from "@/lib/mutation-refresh";
export const useBudgets = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const now = calendarWidgetToday();
  const [month, setMonthState] = useState<number>(now.getMonth() + 1);
  const [year, setYearState] = useState<number>(now.getFullYear());
  const load = useCallback(
    async (signal: AbortSignal) => {
      const [summary, categories] = await Promise.all([
        apiFetch<BudgetsSummaryResponse>(
          `/budgets?month=${month}&year=${year}`,
          { signal },
        ),
        apiFetch<Category[]>("/categories", { signal }),
      ]);
      return { summary, categories };
    },
    [month, year],
  );
  const {
    data: resource,
    loading,
    error,
    reload,
  } = useResource(`budgets-${year}-${month}`, load);
  const data = resource?.summary ?? null;
  const categories = useMemo(() => resource?.categories ?? [], [resource]);
  const setMonth = setMonthState,
    setYear = setYearState;

  const upsertBudget = async (categoryId: string, amount: number) => {
    setIsSubmitting(true);
    try {
      await apiFetch("/budgets", {
        method: "POST",
        body: JSON.stringify({ categoryId, amount }),
      });
      toast.success("Presupuesto guardado con éxito");
      await refreshAfterMutation(reload);
      return true;
    } catch (err) {
      console.error("Error guardando presupuesto:", err);
      toast.error(
        err instanceof Error
          ? err.message
          : "No se pudo guardar el presupuesto",
      );
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteBudget = async (id: string) => {
    try {
      await apiFetch(`/budgets/${id}`, { method: "DELETE" });
      toast.success("Presupuesto eliminado");
      await refreshAfterMutation(reload);
      return true;
    } catch (err) {
      console.error("Error eliminando presupuesto:", err);
      toast.error("No se pudo eliminar el presupuesto");
      return false;
    }
  };

  const expenseCategories = useMemo(() => {
    return categories.filter((c) => c.type === "expense");
  }, [categories]);

  return {
    data,
    loading,
    error,
    isSubmitting,
    month,
    year,
    setMonth,
    setYear,
    expenseCategories,
    upsertBudget,
    deleteBudget,
    reload,
  };
};
