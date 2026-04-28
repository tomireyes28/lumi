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
      
      // Limpiamos el formulario y recargamos la lista
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500 font-medium">Cargando tus categorías...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900">Mis Categorías</h1>
        <p className="text-gray-500 mt-2">Personalizá cómo clasificás tus movimientos.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Columna Izquierda: Formulario */}
        <div className="md:col-span-1">
          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-sm border border-sky-100 sticky top-8">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Nueva Categoría</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input 
                  type="text" 
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Supermercado"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setType('expense')}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${type === 'expense' ? 'bg-orange-100 text-orange-700 border border-orange-200' : 'bg-gray-50 text-gray-500 border border-gray-200'}`}
                  >
                    Gasto
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('income')}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${type === 'income' ? 'bg-sky-100 text-sky-700 border border-sky-200' : 'bg-gray-50 text-gray-500 border border-gray-200'}`}
                  >
                    Ingreso
                  </button>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                  <input 
                    type="color" 
                    value={colorHex}
                    onChange={(e) => setColorHex(e.target.value)}
                    className="w-full h-10 p-1 border border-gray-200 rounded-lg cursor-pointer"
                  />
                </div>
                <div className="w-20">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Emoji</label>
                  <input 
                    type="text" 
                    required
                    value={icon}
                    onChange={(e) => setIcon(e.target.value)}
                    className="w-full h-10 px-2 border border-gray-200 rounded-lg text-center text-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full mt-4 bg-gray-900 text-white font-medium py-2.5 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Guardando...' : 'Crear Categoría'}
              </button>
            </div>
          </form>
        </div>

        {/* Columna Derecha: Lista */}
        <div className="md:col-span-2 space-y-3">
          {categories.length === 0 ? (
            <div className="p-8 bg-sky-50 rounded-2xl border border-dashed border-sky-200 text-center text-sky-700">
              Todavía no creaste ninguna categoría. ¡Probá el formulario!
            </div>
          ) : (
            categories.map(cat => (
              <div key={cat.id} className="p-4 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                  <div 
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-inner"
                    style={{ backgroundColor: cat.colorHex || '#ccc' }}
                  >
                    {cat.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{cat.name}</h3>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full mt-1 inline-block ${cat.type === 'income' ? 'bg-sky-50 text-sky-600' : 'bg-orange-50 text-orange-600'}`}>
                      {cat.type === 'income' ? 'Ingreso' : 'Gasto'}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}