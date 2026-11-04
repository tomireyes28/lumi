import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { CashflowForecastResponse } from '@/types/forecast';
import { toast } from 'sonner';

export const useForecast = () => {
  const [data, setData] = useState<CashflowForecastResponse | null>(null);
  const [monthsCount, setMonthsCountState] = useState<number>(6);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshIndex, setRefreshIndex] = useState(0);

  const setMonthsCount = (count: number) => {
    setLoading(true);
    setError(null);
    setMonthsCountState(count);
  };

  const reload = () => {
    setLoading(true);
    setError(null);
    setRefreshIndex((prev) => prev + 1);
  };

  useEffect(() => {
    let isMounted = true;
    const loadForecast = async () => {
      try {
        const res = await apiFetch<CashflowForecastResponse>(
          `/analytics/forecast?months=${monthsCount}`,
        );
        if (isMounted) {
          setData(res);
          setError(null);
        }
      } catch (err) {
        console.error('Error cargando proyección financiera:', err);
        if (isMounted) {
          setError('No se pudo cargar la proyección financiera.');
          toast.error('No se pudo cargar la proyección de cuotas');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void loadForecast();

    return () => {
      isMounted = false;
    };
  }, [monthsCount, refreshIndex]);

  return {
    data,
    loading,
    error,
    monthsCount,
    setMonthsCount,
    reload,
  };
};
