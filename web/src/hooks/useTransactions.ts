import { useEffect, useState, useMemo } from "react";
import { apiFetch } from "@/lib/api";
import { Transaction } from "@/types/transactions";
import { Category } from "@/types/categories";
import { CreditCard } from "@/types/cards";
import { toast } from "sonner";

export const useTransactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados del formulario de Creación
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [creditCardId, setCreditCardId] = useState(""); 
  const [installments, setInstallments] = useState("1"); // <-- NUEVO: Estado de cuotas
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tab, setTab] = useState<'expense' | 'income'>('expense');
  
  // Estados para los Modales
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [deletingTx, setDeletingTx] = useState<Transaction | null>(null);

  // Filtro de lista
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');

  // 1. Carga inicial de datos de soporte
  useEffect(() => {
    let isMounted = true;
    const fetchInitialData = async () => {
      try {
        const [catData, cardsData] = await Promise.all([
          apiFetch('/categories'),
          apiFetch('/credit-cards')
        ]);
        if (isMounted) {
          setCategories(catData);
          setCards(cardsData);
        }
      } catch (error) {
        console.error("Error cargando datos iniciales:", error);
      }
    };
    fetchInitialData();
    return () => { isMounted = false; };
  }, []);

  // 2. Efecto seguro para cargar transacciones
  useEffect(() => {
    let isMounted = true;
    const fetchTransactions = async () => {
      if (isMounted) setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (filterType !== 'all') {
          queryParams.append('type', filterType);
        }
        const data = await apiFetch(`/transactions?${queryParams.toString()}`);
        if (isMounted) setTransactions(data);
      } catch (error) {
        console.error("Error cargando transacciones:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchTransactions();
    return () => { isMounted = false; };
  }, [filterType]);

  // 3. Función exclusiva para recargar
  const reloadTransactions = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (filterType !== 'all') {
        queryParams.append('type', filterType);
      }
      const data = await apiFetch(`/transactions?${queryParams.toString()}`);
      setTransactions(data);
    } catch (error) {
      console.error("Error recargando transacciones:", error);
    }
  };

  // --- ACCIONES CRUD ---

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiFetch('/transactions', {
        method: 'POST',
        body: JSON.stringify({
          amount: Number(amount),
          categoryId,
          note: note || undefined,
          creditCardId: tab === 'expense' && creditCardId ? creditCardId : undefined,
          // Mandamos las cuotas solo si es gasto con tarjeta
          installments: tab === 'expense' && creditCardId ? Number(installments) : undefined,
        }),
      });
      
      // Reseteamos todo (incluyendo cuotas a 1)
      setAmount(""); setNote(""); setCategoryId(""); setCreditCardId(""); setInstallments("1");
      await reloadTransactions(); 
      toast.success("Movimiento registrado");
    } catch (error) {
      console.error("Error creando transacción:", error);
      toast.error("Hubo un error al guardar el movimiento");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (id: string, updatedData: Partial<{ amount: number; categoryId: string; note: string; creditCardId: string | null }>) => {
    try {
      await apiFetch(`/transactions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updatedData),
      });
      toast.success('Movimiento actualizado con éxito');
      setEditingTx(null);
      await reloadTransactions(); 
    } catch (error) {
      console.error(error);
      toast.error('No se pudo actualizar el movimiento');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiFetch(`/transactions/${id}`, { method: 'DELETE' });
      toast.success("Movimiento eliminado");
      setDeletingTx(null); // Cerramos el modal
      await reloadTransactions(); 
    } catch (error) {
      console.error("Error borrando transacción:", error);
      toast.error("Hubo un error al borrar. Intentá de nuevo.");
    }
  };

  const filteredCategories = useMemo(() => {
    return categories.filter(cat => cat.type === tab);
  }, [categories, tab]);

  return {
    transactions, cards, categories, loading,
    // Agregamos installments al return del form
    form: { amount, setAmount, categoryId, setCategoryId, creditCardId, setCreditCardId, installments, setInstallments, note, setNote, isSubmitting },
    tab, setTab,
    filterType, setFilterType, filteredCategories,
    editingTx, setEditingTx,
    deletingTx, setDeletingTx,
    handleUpdate, handleSubmit, handleDelete
  };
};