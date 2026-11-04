import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { AnalyticsData } from '@/types/analytics';
import { toast } from 'sonner';

export const useAnalytics = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
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

    const loadAnalytics = async () => {
      try {
        const result = await apiFetch<AnalyticsData>('/analytics/monthly');
        if (isMounted) {
          setData(result);
          setError(null);
        }
      } catch (err) {
        console.error('Error cargando analíticas:', err);
        if (isMounted) {
          setError('No se pudieron cargar las analíticas del mes.');
          toast.error('Hubo un error al cargar las analíticas.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadAnalytics();

    return () => {
      isMounted = false;
    };
  }, [refreshIndex]);

  const isGoodTrend = data ? data.percentageChange <= 0 : true;

  return {
    data,
    loading,
    error,
    reload,
    isGoodTrend,
  };
};
