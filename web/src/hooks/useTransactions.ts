import { useEffect, useState, useMemo } from "react";
import { apiFetch } from "@/lib/api";
import { Transaction } from "@/types/transactions";
import { Category } from "@/types/categories";
import { CreditCard } from "@/types/cards";

export const useTransactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados del formulario
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [creditCardId, setCreditCardId] = useState(""); 
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tab, setTab] = useState<'expense' | 'income'>('expense');

  // Filtro de lista
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');

  // 1. Carga inicial de datos de soporte (Categorías y Tarjetas)
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

  // 2. Efecto seguro para cargar transacciones cuando cambia el filtro
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

    return () => {
      isMounted = false;
    };
  }, [filterType]);

  // 3. Función exclusiva para recargar tras una mutación (Crear/Borrar)
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
        }),
      });
      
      setAmount("");
      setNote("");
      setCategoryId("");
      setCreditCardId("");
      
      // Llamamos a la recarga segura
      await reloadTransactions(); 
    } catch (error) {
      console.error("Error creando transacción:", error);
      alert("Hubo un error al guardar el movimiento");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const isConfirmed = window.confirm("¿Estás segura de que querés borrar este movimiento? Esta acción no se puede deshacer.");
    if (!isConfirmed) return;

    try {
      await apiFetch(`/transactions/${id}`, { method: 'DELETE' });
      // Llamamos a la recarga segura
      await reloadTransactions(); 
    } catch (error) {
      console.error("Error borrando transacción:", error);
      alert("Hubo un error al borrar. Intentá de nuevo.");
    }
  };

  const filteredCategories = useMemo(() => {
    return categories.filter(cat => cat.type === tab);
  }, [categories, tab]);

  return {
    transactions,
    cards,
    loading,
    form: { amount, setAmount, categoryId, setCategoryId, creditCardId, setCreditCardId, note, setNote, isSubmitting },
    tab, setTab,
    filterType, setFilterType,
    filteredCategories,
    handleSubmit,
    handleDelete
  };
};