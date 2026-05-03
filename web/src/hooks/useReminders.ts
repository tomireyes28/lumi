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

  // Estados de los Modales
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [deletingReminder, setDeletingReminder] = useState<Reminder | null>(null);

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
    return () => { isMounted = false; };
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

  // --- ACCIONES CRUD ---

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
      
      setTitle(""); setAmount(""); setDueDate("");
      await reloadReminders();
      toast.success("Vencimiento agendado");
    } catch (error) {
      console.error("Error creando recordatorio:", error);
      toast.error("Error al guardar el recordatorio.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (id: string, updatedData: Partial<{ title: string; amount: number | null; dueDate: string }>) => {
    try {
      await apiFetch(`/reminders/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updatedData),
      });
      toast.success('Vencimiento actualizado');
      setEditingReminder(null);
      await reloadReminders();
    } catch (error) {
      console.error(error);
      toast.error('No se pudo actualizar el recordatorio');
    }
  };

  const handleMarkAsPaid = async (id: string) => {
    try {
      await apiFetch(`/reminders/${id}/pay`, { method: 'PATCH' });
      toast.success("¡Pago registrado!");
      await reloadReminders();
    } catch (error) {
      console.error("Error al actualizar:", error);
      toast.error("Hubo un error al registrar el pago.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiFetch(`/reminders/${id}`, { method: 'DELETE' });
      toast.success("Vencimiento eliminado");
      setDeletingReminder(null);
      await reloadReminders();
    } catch (error) {
      console.error("Error al borrar:", error);
      toast.error("Hubo un error al borrar el recordatorio.");
      setDeletingReminder(null);
    }
  };

  // Optimizamos los filtros
  const pendingReminders = useMemo(() => reminders.filter(r => !r.isPaid), [reminders]);
  const paidReminders = useMemo(() => reminders.filter(r => r.isPaid), [reminders]);

  return {
    loading, pendingReminders, paidReminders,
    form: { title, setTitle, amount, setAmount, dueDate, setDueDate, isSubmitting },
    editingReminder, setEditingReminder,
    deletingReminder, setDeletingReminder,
    handleSubmit, handleUpdate, handleMarkAsPaid, handleDelete
  };
};