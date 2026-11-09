import { businessDateKey } from "@/lib/business-date";
import { useEffect, useState, useMemo } from "react";
import { apiFetch } from "@/lib/api";
import {
  PaginatedTransactionsResponse,
  Transaction,
  UpdateTransactionInput,
} from "@/types/transactions";
import { Category } from "@/types/categories";
import { CreditCard } from "@/types/cards";
import { toast } from "sonner";

import { transactionPageQuery } from "@/lib/transaction-pages";

export const useTransactions = () => {
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<
    PaginatedTransactionsResponse["meta"] | null
  >(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [creditCardId, setCreditCardId] = useState("");
  const [installments, setInstallments] = useState("1");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(() => businessDateKey(new Date()));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tab, setTab] = useState<"expense" | "income">("expense");

  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [deletingTx, setDeletingTx] = useState<Transaction | null>(null);

  const [filterType, setFilterType] = useState<"all" | "income" | "expense">(
    "all",
  );

  useEffect(() => {
    let isMounted = true;
    const fetchInitialData = async () => {
      try {
        const [catData, cardsData] = await Promise.all([
          apiFetch<Category[]>("/categories"),
          apiFetch<CreditCard[]>("/credit-cards"),
        ]);
        if (isMounted) {
          setCategories(catData);
          setCards(cardsData);
        }
      } catch (err) {
        console.error("Error cargando datos iniciales:", err);
      }
    };
    void fetchInitialData();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchTransactions = async () => {
      if (isMounted) {
        setLoading(true);
        setError(null);
      }
      try {
        const data = await apiFetch<PaginatedTransactionsResponse>(
          transactionPageQuery(page, filterType),
        );
        if (isMounted) {
          setTransactions(data.data);
          setMeta(data.meta);
        }
      } catch (err) {
        console.error("Error cargando transacciones:", err);
        if (isMounted) {
          setError(
            err instanceof Error
              ? err.message
              : "No se pudieron cargar los movimientos.",
          );
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    void fetchTransactions();
    return () => {
      isMounted = false;
    };
  }, [filterType, page]);

  const reloadTransactions = async () => {
    const data = await apiFetch<PaginatedTransactionsResponse>(
      transactionPageQuery(page, filterType),
    );
    if (data.meta.totalPages > 0 && page > data.meta.totalPages) {
      setPage(data.meta.totalPages);
      return;
    }
    setTransactions(data.data);
    setMeta(data.meta);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiFetch("/transactions", {
        method: "POST",
        body: JSON.stringify({
          amount: Number(amount),
          date,
          categoryId,
          note: note.trim() ? note.trim() : undefined,
          creditCardId:
            tab === "expense" && creditCardId ? creditCardId : undefined,
          installments:
            tab === "expense" && creditCardId
              ? Number(installments)
              : undefined,
        }),
      });

      setAmount("");
      setNote("");
      setCategoryId("");
      setCreditCardId("");
      setInstallments("1");
      await reloadTransactions();
      toast.success("Movimiento registrado");
    } catch (err) {
      console.error("Error creando transacción:", err);
      toast.error(
        err instanceof Error
          ? err.message
          : "Hubo un error al guardar el movimiento",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (
    id: string,
    updatedData: UpdateTransactionInput,
  ) => {
    try {
      await apiFetch(`/transactions/${id}`, {
        method: "PATCH",
        body: JSON.stringify(updatedData),
      });
      toast.success("Movimiento actualizado con éxito");
      setEditingTx(null);
      await reloadTransactions();
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error
          ? err.message
          : "No se pudo actualizar el movimiento",
      );
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiFetch(`/transactions/${id}`, { method: "DELETE" });
      toast.success("Movimiento eliminado");
      setDeletingTx(null);
      await reloadTransactions();
    } catch (err) {
      console.error("Error borrando transacción:", err);
      toast.error(
        err instanceof Error
          ? err.message
          : "Hubo un error al borrar. Intentá de nuevo.",
      );
    }
  };

  const filteredCategories = useMemo(() => {
    return categories.filter((cat) => cat.type === tab);
  }, [categories, tab]);

  return {
    transactions,
    cards,
    categories,
    loading,
    error,
    reloadTransactions,
    form: {
      amount,
      setAmount,
      date,
      setDate,
      categoryId,
      setCategoryId,
      creditCardId,
      setCreditCardId,
      installments,
      setInstallments,
      note,
      setNote,
      isSubmitting,
    },
    tab,
    setTab,
    filterType,
    setFilterType: (value: "all" | "income" | "expense") => {
      setPage(1);
      setFilterType(value);
    },
    page,
    setPage,
    meta,
    filteredCategories,
    editingTx,
    setEditingTx,
    deletingTx,
    setDeletingTx,
    handleUpdate,
    handleSubmit,
    handleDelete,
  };
};
