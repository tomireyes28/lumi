import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { CashflowForecastResponse } from '@/types/forecast';
import { toast } from 'sonner';

export const useForecast = () => {
  const [data, setData] = useState<CashflowForecastResponse | null>(null);
  const [monthsCount, setMonthsCount] = useState<number>(6);
  const [loading, setLoading] = useState(true);

  const fetchForecast = useCallback(async () => {
    setLoading(true);
    try {
      const res: CashflowForecastResponse = await apiFetch(`/analytics/forecast?months=${monthsCount}`);
      setData(res);
    } catch (err) {
      console.error('Error cargando proyección financiera:', err);
      toast.error('No se pudo cargar la proyección de cuotas');
    } finally {
      setLoading(false);
    }
  }, [monthsCount]);

  useEffect(() => {
    fetchForecast();
  }, [fetchForecast]);

  return {
    data,
    loading,
    monthsCount,
    setMonthsCount,
    reload: fetchForecast,
  };
};
