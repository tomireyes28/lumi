import { useState, useMemo } from "react";
import { apiFetch } from "@/lib/api";
import { Reminder, UpdateReminderInput } from "@/types/reminders";
import { toast } from "sonner";

import { useResource } from "./useResource";
import { refreshAfterMutation } from "@/lib/mutation-refresh";
const loadReminders = (signal: AbortSignal) =>
  apiFetch<Reminder[]>("/reminders", { signal });

export const useReminders = () => {
  const {
    data: reminders = [],
    loading,
    error,
    reload: reloadReminders,
  } = useResource("reminders", loadReminders);

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [deletingReminder, setDeletingReminder] = useState<Reminder | null>(
    null,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiFetch("/reminders", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          amount: amount ? Number(amount) : undefined,
          dueDate,
          isRecurring,
        }),
      });

      setTitle("");
      setAmount("");
      setDueDate("");
      setIsRecurring(false);
      await refreshAfterMutation(reloadReminders);
      toast.success("Vencimiento agendado");
    } catch (error) {
      console.error("Error creando recordatorio:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Error al guardar el recordatorio.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (id: string, updatedData: UpdateReminderInput) => {
    try {
      await apiFetch(`/reminders/${id}`, {
        method: "PATCH",
        body: JSON.stringify(updatedData),
      });
      toast.success("Vencimiento actualizado");
      setEditingReminder(null);
      await refreshAfterMutation(reloadReminders);
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar el recordatorio",
      );
    }
  };

  const handleMarkAsPaid = async (id: string) => {
    try {
      await apiFetch(`/reminders/${id}/pay`, { method: "PATCH" });
      toast.success("¡Pago registrado!");
      await refreshAfterMutation(reloadReminders);
    } catch (error) {
      console.error("Error al actualizar:", error);
      toast.error("Hubo un error al registrar el pago.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiFetch(`/reminders/${id}`, { method: "DELETE" });
      toast.success("Vencimiento eliminado");
      setDeletingReminder(null);
      await refreshAfterMutation(reloadReminders);
    } catch (error) {
      console.error("Error al borrar:", error);
      toast.error("Hubo un error al borrar el recordatorio.");
      setDeletingReminder(null);
    }
  };

  const pendingReminders = useMemo(
    () => reminders.filter((r) => !r.isPaid),
    [reminders],
  );
  const paidReminders = useMemo(
    () => reminders.filter((r) => r.isPaid),
    [reminders],
  );

  return {
    loading,
    error,
    reload: reloadReminders,
    pendingReminders,
    paidReminders,
    form: {
      title,
      setTitle,
      amount,
      setAmount,
      dueDate,
      setDueDate,
      isRecurring,
      setIsRecurring,
      isSubmitting,
    },
    editingReminder,
    setEditingReminder,
    deletingReminder,
    setDeletingReminder,
    handleSubmit,
    handleUpdate,
    handleMarkAsPaid,
    handleDelete,
  };
};
