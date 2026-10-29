import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { CashflowForecastResponse } from '@/types/forecast';
import { toast } from 'sonner';

export const useForecast = () => {
  const [data, setData] = useState<CashflowForecastResponse | null>(null);
  const [monthsCount, setMonthsCountState] = useState<number>(6);
  const [loading, setLoading] = useState(true);
  const [refreshIndex, setRefreshIndex] = useState(0);

  const setMonthsCount = (count: number) => {
    setLoading(true);
    setMonthsCountState(count);
  };

  const reload = () => {
    setLoading(true);
    setRefreshIndex((prev) => prev + 1);
  };

  useEffect(() => {
    let isMounted = true;
    const loadForecast = async () => {
      try {
        const res: CashflowForecastResponse = await apiFetch(
          `/analytics/forecast?months=${monthsCount}`,
        );
        if (isMounted) setData(res);
      } catch (err) {
        console.error('Error cargando proyección financiera:', err);
        if (isMounted) toast.error('No se pudo cargar la proyección de cuotas');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadForecast();

    return () => {
      isMounted = false;
    };
  }, [monthsCount, refreshIndex]);

  return {
    data,
    loading,
    monthsCount,
    setMonthsCount,
    reload,
  };
};
