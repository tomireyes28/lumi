import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { CreditCard, UpdateCreditCardInput } from "@/types/cards";
import { toast } from "sonner";

import { useResource } from "./useResource";
import { refreshAfterMutation } from "@/lib/mutation-refresh";
const loadCards = (signal: AbortSignal) =>
  apiFetch<CreditCard[]>("/credit-cards", { signal });

export const useCards = () => {
  const {
    data: cards = [],
    loading,
    error,
    reload: reloadCards,
  } = useResource("credit-cards", loadCards);

  const [alias, setAlias] = useState("");
  const [lastFour, setLastFour] = useState("");
  const [limit, setLimit] = useState("");
  const [closingDay, setClosingDay] = useState("");
  const [dueDay, setDueDay] = useState("");
  const [colorHex, setColorHex] = useState("#0f172a");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  const [deletingCard, setDeletingCard] = useState<CreditCard | null>(null);
  const [selectedCycleCard, setAdjustingCycleCard] =
    useState<CreditCard | null>(null);

  const adjustingCycleCard = selectedCycleCard
    ? (cards.find((card) => card.id === selectedCycleCard.id) ?? null)
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiFetch("/credit-cards", {
        method: "POST",
        body: JSON.stringify({
          alias: alias.trim(),
          lastFour: lastFour.trim(),
          colorHex,
          limit: Number(limit),
          closingDay: Number(closingDay),
          dueDay: Number(dueDay),
        }),
      });

      setAlias("");
      setLastFour("");
      setLimit("");
      setClosingDay("");
      setDueDay("");
      setColorHex("#0f172a");
      await refreshAfterMutation(reloadCards);
      toast.success("Tarjeta guardada");
    } catch (error) {
      console.error("Error creando tarjeta:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Hubo un error al guardar la tarjeta.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (
    id: string,
    updatedData: UpdateCreditCardInput,
  ) => {
    try {
      await apiFetch(`/credit-cards/${id}`, {
        method: "PATCH",
        body: JSON.stringify(updatedData),
      });
      toast.success("Tarjeta actualizada");
      setEditingCard(null);
      await refreshAfterMutation(reloadCards);
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar la tarjeta",
      );
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiFetch(`/credit-cards/${id}`, { method: "DELETE" });
      toast.success("Tarjeta eliminada");
      setDeletingCard(null);
      await refreshAfterMutation(reloadCards);
    } catch (error) {
      console.error("Error borrando tarjeta:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Hubo un error al borrar. Intentá de nuevo.",
      );
    }
  };

  const handleUpsertCycle = async (
    cardId: string,
    cycleData: {
      month: number;
      year: number;
      closingDate: string;
      dueDate?: string;
    },
  ) => {
    try {
      await apiFetch(`/credit-cards/${cardId}/cycles`, {
        method: "POST",
        body: JSON.stringify(cycleData),
      });
      toast.success("Fecha de cierre mensual actualizada");
      await refreshAfterMutation(reloadCards);
    } catch (error) {
      console.error("Error guardando ciclo:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar el ciclo de la tarjeta.",
      );
      throw error;
    }
  };

  const handleDeleteCycle = async (cardId: string, cycleId: string) => {
    try {
      await apiFetch(`/credit-cards/${cardId}/cycles/${cycleId}`, {
        method: "DELETE",
      });
      toast.success("Restablecido al día de cierre habitual");
      await refreshAfterMutation(reloadCards);
    } catch (error) {
      console.error("Error eliminando ciclo:", error);
      toast.error("No se pudo restablecer el ciclo.");
      throw error;
    }
  };

  return {
    cards,
    loading,
    error,
    reload: reloadCards,
    form: {
      alias,
      setAlias,
      lastFour,
      setLastFour,
      limit,
      setLimit,
      closingDay,
      setClosingDay,
      dueDay,
      setDueDay,
      colorHex,
      setColorHex,
      isSubmitting,
    },
    editingCard,
    setEditingCard,
    deletingCard,
    setDeletingCard,
    adjustingCycleCard,
    setAdjustingCycleCard,
    handleUpdate,
    handleSubmit,
    handleDelete,
    handleUpsertCycle,
    handleDeleteCycle,
  };
};
