import { useEffect, useState, useMemo } from "react";
import { apiFetch } from "@/lib/api";
import { Reminder } from "@/types/reminders";
import { toast } from "sonner";

export const useReminders = () => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados del formulario
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Carga Inicial segura
  useEffect(() => {
    let isMounted = true;

    const initialLoad = async () => {
      try {
        const data = await apiFetch('/reminders');
        if (isMounted) setReminders(data);
      } catch (error) {
        console.error("Error cargando recordatorios:", error);
        toast.error("Hubo un error al cargar los recordatorios.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initialLoad();

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Recarga post-mutaciones
  const reloadReminders = async () => {
    try {
      const data = await apiFetch('/reminders');
      setReminders(data);
    } catch (error) {
      console.error("Error recargando recordatorios:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiFetch('/reminders', {
        method: 'POST',
        body: JSON.stringify({
          title,
          amount: amount ? Number(amount) : undefined,
          dueDate, 
        }),
      });
      
      setTitle("");
      setAmount("");
      setDueDate("");
      await reloadReminders();
    } catch (error) {
      console.error("Error creando recordatorio:", error);
      toast.error("Error al guardar el recordatorio.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkAsPaid = async (id: string) => {
    try {
      await apiFetch(`/reminders/${id}/pay`, { method: 'PATCH' });
      await reloadReminders();
    } catch (error) {
      console.error("Error al actualizar:", error);
      toast.error("Hubo un error al actualizar el recordatorio.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("¿Borrar este recordatorio?")) return;
    try {
      await apiFetch(`/reminders/${id}`, { method: 'DELETE' });
      await reloadReminders();
    } catch (error) {
      
      console.error("Error al borrar:", error);
      toast.error("Hubo un error al borrar el recordatorio.");
    }
  };

  // Optimizamos los filtros para no recalcular en cada renderizado tonto
  const pendingReminders = useMemo(() => reminders.filter(r => !r.isPaid), [reminders]);
  const paidReminders = useMemo(() => reminders.filter(r => r.isPaid), [reminders]);

  return {
    loading,
    pendingReminders,
    paidReminders,
    form: { title, setTitle, amount, setAmount, dueDate, setDueDate, isSubmitting },
    handleSubmit,
    handleMarkAsPaid,
    handleDelete
  };
};