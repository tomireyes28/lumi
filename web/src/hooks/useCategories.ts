import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Category } from "@/types/categories";
import { toast } from "sonner";

export const useCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados del formulario agrupados
  const [name, setName] = useState("");
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [colorHex, setColorHex] = useState("#fb923c"); // Naranja/Durazno por defecto
  const [icon, setIcon] = useState("🛒");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Carga Inicial (segura para useEffect)
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

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Función de recarga post-mutación
  const reloadCategories = async () => {
    try {
      const data = await apiFetch('/categories');
      setCategories(data);
    } catch (error) {
      console.error("Error recargando categorías:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiFetch('/categories', {
        method: 'POST',
        body: JSON.stringify({ name, type, colorHex, icon }),
      });
      
      // Limpiamos los datos principales del formulario
      setName("");
      setIcon("🛒");
      
      // Recargamos la lista
      await reloadCategories();
    } catch (error) {
      console.error("Error creando categoría:", error);
      toast.error("Hubo un error al crear la categoría");
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    categories,
    loading,
    form: {
      name, setName,
      type, setType,
      colorHex, setColorHex,
      icon, setIcon,
      isSubmitting
    },
    handleSubmit
  };
};