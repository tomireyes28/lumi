import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { Category, UpdateCategoryInput } from "@/types/categories";
import { toast } from "sonner";

import { useResource } from "./useResource";
import { refreshAfterMutation } from "@/lib/mutation-refresh";
const loadCategories = (signal: AbortSignal) =>
  apiFetch<Category[]>("/categories", { signal });

export const useCategories = () => {
  const {
    data: categories = [],
    loading,
    error,
    reload: reloadCategories,
  } = useResource("categories", loadCategories);

  const [name, setName] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [colorHex, setColorHex] = useState("#fb923c");
  const [icon, setIcon] = useState("ShoppingCart");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(
    null,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiFetch("/categories", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), type, colorHex, icon }),
      });

      setName("");
      setIcon("ShoppingCart");
      setType("expense");
      setColorHex("#fb923c");
      await refreshAfterMutation(reloadCategories);
      toast.success("Categoría creada");
    } catch (error) {
      console.error("Error creando categoría:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Hubo un error al crear la categoría",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (id: string, updatedData: UpdateCategoryInput) => {
    try {
      await apiFetch(`/categories/${id}`, {
        method: "PATCH",
        body: JSON.stringify(updatedData),
      });
      toast.success("Categoría actualizada");
      setEditingCategory(null);
      await refreshAfterMutation(reloadCategories);
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar la categoría",
      );
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiFetch(`/categories/${id}`, { method: "DELETE" });
      toast.success("Categoría eliminada");
      setDeletingCategory(null);
      await refreshAfterMutation(reloadCategories);
    } catch (error) {
      console.error("Error borrando categoría:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "No se puede borrar. ¿Tiene movimientos asociados?";

      toast.error(errorMessage);
      setDeletingCategory(null);
    }
  };

  return {
    categories,
    loading,
    error,
    reload: reloadCategories,
    form: {
      name,
      setName,
      type,
      setType,
      colorHex,
      setColorHex,
      icon,
      setIcon,
      isSubmitting,
    },
    editingCategory,
    setEditingCategory,
    deletingCategory,
    setDeletingCategory,
    handleUpdate,
    handleSubmit,
    handleDelete,
  };
};
