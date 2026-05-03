import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Category } from "@/types/categories";
import { toast } from "sonner";

export const useCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados del formulario
  const [name, setName] = useState("");
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [colorHex, setColorHex] = useState("#fb923c"); 
  const [icon, setIcon] = useState("ShoppingCart"); 
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados de los Modales
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);

  // 1. Carga Inicial
  useEffect(() => {
    let isMounted = true;
    const initialLoad = async () => {
      try {
        const data = await apiFetch('/categories');
        if (isMounted) setCategories(data);
      } catch (error) {
        console.error("Error cargando categorías:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    initialLoad();
    return () => { isMounted = false; };
  }, []);

  // 2. Función de recarga
  const reloadCategories = async () => {
    try {
      const data = await apiFetch('/categories');
      setCategories(data);
    } catch (error) {
      console.error("Error recargando categorías:", error);
    }
  };

  // --- ACCIONES CRUD ---

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiFetch('/categories', {
        method: 'POST',
        body: JSON.stringify({ name, type, colorHex, icon }),
      });
      
      setName(""); setIcon("ShoppingCart"); setType('expense'); setColorHex("#fb923c");
      await reloadCategories();
      toast.success("Categoría creada");
    } catch (error) {
      console.error("Error creando categoría:", error);
      toast.error("Hubo un error al crear la categoría");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (id: string, updatedData: Partial<Category>) => {
    try {
      await apiFetch(`/categories/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updatedData),
      });
      toast.success('Categoría actualizada');
      setEditingCategory(null);
      await reloadCategories();
    } catch (error) {
      console.error(error);
      toast.error('No se pudo actualizar la categoría');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiFetch(`/categories/${id}`, { method: 'DELETE' });
      toast.success("Categoría eliminada");
      setDeletingCategory(null);
      await reloadCategories();
    } catch (error) { // <-- Chau 'any'
      console.error("Error borrando categoría:", error);
      // Validamos correctamente si el error es nativo
      const errorMessage = error instanceof Error 
        ? error.message 
        : "No se puede borrar. ¿Tiene movimientos asociados?";
        
      toast.error(errorMessage);
      setDeletingCategory(null);
    }
  };

  return {
    categories, loading,
    form: { name, setName, type, setType, colorHex, setColorHex, icon, setIcon, isSubmitting },
    editingCategory, setEditingCategory,
    deletingCategory, setDeletingCategory,
    handleUpdate, handleSubmit, handleDelete
  };
};