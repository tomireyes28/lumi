import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { CreditCard } from "@/types/cards";
import { toast } from "sonner";

export const useCards = () => {
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados del formulario de Creación
  const [alias, setAlias] = useState("");
  const [lastFour, setLastFour] = useState("");
  const [limit, setLimit] = useState("");
  const [closingDay, setClosingDay] = useState("");
  const [dueDay, setDueDay] = useState("");
  const [colorHex, setColorHex] = useState("#0f172a");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados de los Modales
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  const [deletingCard, setDeletingCard] = useState<CreditCard | null>(null);

  // 1. Carga inicial
  useEffect(() => {
    let isMounted = true;
    const initialLoad = async () => {
      try {
        const data = await apiFetch('/credit-cards');
        if (isMounted) setCards(data);
      } catch (error) {
        console.error("Error cargando tarjetas:", error);
        toast.error("Hubo un error al cargar las tarjetas.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    initialLoad();
    return () => { isMounted = false; };
  }, []);

  // 2. Función de recarga
  const reloadCards = async () => {
    try {
      const data = await apiFetch('/credit-cards');
      setCards(data);
    } catch (error) {
      console.error("Error recargando tarjetas:", error);
      toast.error("Hubo un error al recargar las tarjetas.");
    }
  };

  // --- ACCIONES CRUD ---

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiFetch('/credit-cards', {
        method: 'POST',
        body: JSON.stringify({
          alias, lastFour, colorHex,
          limit: Number(limit),
          closingDay: Number(closingDay),
          dueDay: Number(dueDay),
        }),
      });
      
      setAlias(""); setLastFour(""); setLimit(""); setClosingDay(""); setDueDay(""); setColorHex("#0f172a");
      await reloadCards();
      toast.success("Tarjeta guardada");
    } catch (error) {
      console.error("Error creando tarjeta:", error);
      toast.error("Hubo un error al guardar la tarjeta.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (id: string, updatedData: Partial<CreditCard>) => {
    try {
      await apiFetch(`/credit-cards/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updatedData),
      });
      toast.success('Tarjeta actualizada');
      setEditingCard(null);
      await reloadCards();
    } catch (error) {
      console.error(error);
      toast.error('No se pudo actualizar la tarjeta');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiFetch(`/credit-cards/${id}`, { method: 'DELETE' });
      toast.success("Tarjeta eliminada");
      setDeletingCard(null);
      await reloadCards();
    } catch (error) {
      console.error("Error borrando tarjeta:", error);
      toast.error("Hubo un error al borrar. Intentá de nuevo.");
    }
  };

  return {
    cards, loading,
    form: { alias, setAlias, lastFour, setLastFour, limit, setLimit, closingDay, setClosingDay, dueDay, setDueDay, colorHex, setColorHex, isSubmitting },
    editingCard, setEditingCard,
    deletingCard, setDeletingCard,
    handleUpdate, handleSubmit, handleDelete
  };
};