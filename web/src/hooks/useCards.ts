import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { CreditCard } from "@/types/cards";

export const useCards = () => {
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados del formulario
  const [alias, setAlias] = useState("");
  const [lastFour, setLastFour] = useState("");
  const [limit, setLimit] = useState("");
  const [closingDay, setClosingDay] = useState("");
  const [dueDay, setDueDay] = useState("");
  const [colorHex, setColorHex] = useState("#0f172a");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Carga inicial: Aislada y segura dentro del useEffect
  useEffect(() => {
    let isMounted = true;

    const initialLoad = async () => {
      try {
        const data = await apiFetch('/credit-cards');
        if (isMounted) setCards(data);
      } catch (error) {
        console.error("Error cargando tarjetas:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initialLoad();
    
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Función dedicada para recargar los datos de fondo al crear una tarjeta
  const reloadCards = async () => {
    try {
      const data = await apiFetch('/credit-cards');
      setCards(data);
    } catch (error) {
      console.error("Error recargando tarjetas:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiFetch('/credit-cards', {
        method: 'POST',
        body: JSON.stringify({
          alias,
          lastFour,
          limit: Number(limit),
          closingDay: Number(closingDay),
          dueDay: Number(dueDay),
          colorHex,
        }),
      });
      
      // Limpiamos el formulario
      setAlias("");
      setLastFour("");
      setLimit("");
      setClosingDay("");
      setDueDay("");
      setColorHex("#0f172a");
      
      // Recargamos el carrusel con la función limpia
      await reloadCards();
    } catch (error) {
      console.error("Error creando tarjeta:", error);
      alert("Hubo un error al guardar la tarjeta. Revisá los datos.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    cards,
    loading,
    form: {
      alias, setAlias,
      lastFour, setLastFour,
      limit, setLimit,
      closingDay, setClosingDay,
      dueDay, setDueDay,
      colorHex, setColorHex,
      isSubmitting
    },
    handleSubmit
  };
};