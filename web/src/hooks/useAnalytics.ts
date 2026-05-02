import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { AnalyticsData } from "@/types/analytics";
import { toast } from "sonner";

export const useAnalytics = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadAnalytics = async () => {
      try {
        const result = await apiFetch('/analytics/monthly');
        if (isMounted) {
          setData(result);
        }
      } catch (error) {
        console.error("Error cargando analíticas:", error);
        toast.error("Hubo un error al cargar las analíticas.");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadAnalytics();

    return () => {
      isMounted = false;
    };
  }, []);

  // Lógica de presentación abstraída del componente visual
  const isGoodTrend = data ? data.percentageChange <= 0 : true;
  
  return { 
    data, 
    loading, 
    isGoodTrend 
  };
};