import { businessDateKey } from "@/lib/business-date";
import { useCallback, useState, useMemo } from "react";
import { apiFetch } from "@/lib/api";
import {
  PaginatedTransactionsResponse,
  Transaction,
  UpdateTransactionInput,
} from "@/types/transactions";
import { Category } from "@/types/categories";
import { CreditCard } from "@/types/cards";
import { toast } from "sonner";

import { useResource } from "./useResource";
import { refreshAfterMutation } from "@/lib/mutation-refresh";

import { transactionPageQuery } from "@/lib/transaction-pages";

export const useTransactions = () => {
  const [page, setPage] = useState(1);
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

  const load = useCallback(
    async (signal: AbortSignal) => {
      const [result, categories, cards] = await Promise.all([
        apiFetch<PaginatedTransactionsResponse>(
          transactionPageQuery(page, filterType),
          { signal },
        ),
        apiFetch<Category[]>("/categories", { signal }),
        apiFetch<CreditCard[]>("/credit-cards", { signal }),
      ]);
      if (page > Math.max(1, result.meta.totalPages))
        setPage(Math.max(1, result.meta.totalPages));
      return { result, categories, cards };
    },
    [page, filterType],
  );
  const {
    data,
    loading,
    error,
    reload: reloadTransactions,
  } = useResource(`${filterType}-${page}`, load);
  const transactions = data?.result.data ?? [];
  const meta = data?.result.meta ?? null;
  const categories = useMemo(() => data?.categories ?? [], [data]);
  const cards = data?.cards ?? [];

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
      await refreshAfterMutation(reloadTransactions);
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
      await refreshAfterMutation(reloadTransactions);
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
      await refreshAfterMutation(reloadTransactions);
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
