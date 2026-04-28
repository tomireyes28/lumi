"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  colorHex: string | null;
  icon: string | null;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados del formulario
  const [name, setName] = useState("");
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [colorHex, setColorHex] = useState("#fb923c"); // Naranja/Durazno por defecto
  const [icon, setIcon] = useState("🛒");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const data = await apiFetch('/categories');
      setCategories(data);
    } catch (error) {
      console.error("Error cargando categorías:", error);
    } finally {
      setLoading(false);
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
      
      setName("");
      setIcon("🛒");
      await loadCategories();
    } catch (error) {
      console.error("Error creando categoría:", error);
      alert("Hubo un error al crear la categoría");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-gray-500 font-medium">Cargando categorías...</p>
      </div>
    );
  }

  return (
    <div className="p-6 pb-24 flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Categorías</h1>
        <p className="text-sm text-gray-500 mt-1">Personalizá tus clasificaciones.</p>
      </header>

      {/* Formulario de Nueva Categoría */}
      <form onSubmit={handleSubmit} className="bg-white p-5 rounded-2xl shadow-sm border border-sky-100">
        <h2 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-wider">Nueva Categoría</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Nombre</label>
            <input 
              type="text" 
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Supermercado"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Tipo</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setType('expense')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${type === 'expense' ? 'bg-orange-100 text-orange-700 border border-orange-200' : 'bg-gray-50 text-gray-400 border border-transparent'}`}
              >
                Gasto
              </button>
              <button
                type="button"
                onClick={() => setType('income')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${type === 'income' ? 'bg-sky-100 text-sky-700 border border-sky-200' : 'bg-gray-50 text-gray-400 border border-transparent'}`}
              >
                Ingreso
              </button>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">Color</label>
              <input 
                type="color" 
                value={colorHex}
                onChange={(e) => setColorHex(e.target.value)}
                className="w-full h-10 p-1 border border-gray-200 rounded-xl cursor-pointer bg-gray-50"
              />
            </div>
            <div className="w-20">
              <label className="block text-xs font-medium text-gray-700 mb-1">Icono</label>
              <input 
                type="text" 
                required
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                className="w-full h-10 px-2 border border-gray-200 rounded-xl text-center text-xl focus:outline-none focus:ring-2 focus:ring-sky-500 bg-gray-50"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full mt-2 bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Guardando...' : 'Crear Categoría'}
          </button>
        </div>
      </form>

      {/* Lista de Categorías */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-bold text-gray-800 mb-1 uppercase tracking-wider">Tus Etiquetas</h2>
        {categories.length === 0 ? (
          <div className="p-8 bg-sky-50 rounded-2xl border border-dashed border-sky-200 text-center text-sky-700 text-sm">
            No hay categorías todavía.
          </div>
        ) : (
          categories.map(cat => (
            <div key={cat.id} className="p-3 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-xl bg-opacity-20 shadow-inner"
                  style={{ backgroundColor: cat.colorHex ? `${cat.colorHex}40` : '#f3f4f6' }}
                >
                  {cat.icon}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">{cat.name}</h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 inline-block ${cat.type === 'income' ? 'bg-sky-50 text-sky-600' : 'bg-orange-50 text-orange-600'}`}>
                    {cat.type === 'income' ? 'Ingreso' : 'Gasto'}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}