import { useEffect, useState, useMemo } from 'react';
import { apiFetch } from '@/lib/api';
import { BudgetsSummaryResponse } from '@/types/budgets';
import { Category } from '@/types/categories';
import { toast } from 'sonner';

export const useBudgets = () => {
  const [data, setData] = useState<BudgetsSummaryResponse | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const now = new Date();
  const [month, setMonthState] = useState<number>(now.getMonth() + 1);
  const [year, setYearState] = useState<number>(now.getFullYear());
  const [refreshIndex, setRefreshIndex] = useState(0);

  const setMonth = (newMonth: number) => {
    setLoading(true);
    setMonthState(newMonth);
  };

  const setYear = (newYear: number) => {
    setLoading(true);
    setYearState(newYear);
  };

  const reload = () => {
    setLoading(true);
    setRefreshIndex((prev) => prev + 1);
  };

  // Carga categorías para el formulario
  useEffect(() => {
    let isMounted = true;
    const fetchCategories = async () => {
      try {
        const catData = await apiFetch('/categories');
        if (isMounted) setCategories(catData);
      } catch (err) {
        console.error('Error cargando categorías:', err);
      }
    };
    fetchCategories();
    return () => {
      isMounted = false;
    };
  }, []);

  // Carga presupuestos del período seleccionado evitando condiciones de carrera
  useEffect(() => {
    let isMounted = true;
    const loadBudgets = async () => {
      try {
        const res: BudgetsSummaryResponse = await apiFetch(`/budgets?month=${month}&year=${year}`);
        if (isMounted) setData(res);
      } catch (err) {
        console.error('Error cargando presupuestos:', err);
        if (isMounted) toast.error('No se pudieron cargar los presupuestos');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadBudgets();

    return () => {
      isMounted = false;
    };
  }, [month, year, refreshIndex]);

  const upsertBudget = async (categoryId: string, amount: number) => {
    setIsSubmitting(true);
    try {
      await apiFetch('/budgets', {
        method: 'POST',
        body: JSON.stringify({ categoryId, amount }),
      });
      toast.success('Presupuesto guardado con éxito');
      reload();
      return true;
    } catch (err) {
      console.error('Error guardando presupuesto:', err);
      toast.error('No se pudo guardar el presupuesto');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteBudget = async (id: string) => {
    try {
      await apiFetch(`/budgets/${id}`, { method: 'DELETE' });
      toast.success('Presupuesto eliminado');
      reload();
      return true;
    } catch (err) {
      console.error('Error eliminando presupuesto:', err);
      toast.error('No se pudo eliminar el presupuesto');
      return false;
    }
  };

  const expenseCategories = useMemo(() => {
    return categories.filter((c) => c.type === 'expense');
  }, [categories]);

  return {
    data,
    loading,
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
