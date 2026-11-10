import { MotionButton } from "@/components/ui/MotionButton";
import { motion, Variants } from "framer-motion";
import {
  CategoryFormState,
  Category,
  UpdateCategoryInput,
} from "@/types/categories";
import { useId, useState } from "react";
import { ICON_MAP } from "@/components/ui/IconRenderer";

export { ICON_MAP };
const AVAILABLE_ICONS = Object.keys(ICON_MAP).filter((k) => k !== "Folder");

interface CategoryFormProps {
  form: CategoryFormState;
  handleSubmit: (e: React.FormEvent) => void;
  itemVariants: Variants;
}

export function CategoryForm({
  form,
  handleSubmit,
  itemVariants,
}: CategoryFormProps) {
  const nameId = useId();
  const colorId = useId();

  return (
    <motion.form
      variants={itemVariants}
      onSubmit={handleSubmit}
      className="bg-white p-5 rounded-2xl shadow-sm border border-sky-100"
    >
      <h2 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-wider">
        Nueva Categoría
      </h2>

      <div className="space-y-4">
        <div>
          <label
            htmlFor={nameId}
            className="block text-xs font-medium text-gray-700 mb-1"
          >
            Nombre
          </label>
          <input
            id={nameId}
            type="text"
            required
            value={form.name}
            onChange={(e) => form.setName(e.target.value)}
            placeholder="Ej: Supermercado"
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div>
          <span className="block text-xs font-medium text-gray-700 mb-1">
            Tipo
          </span>
          <div
            className="flex gap-2"
            role="group"
            aria-label="Tipo de categoría"
          >
            <button
              type="button"
              aria-pressed={form.type === "expense"}
              onClick={() => form.setType("expense")}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                form.type === "expense"
                  ? "bg-orange-100 text-orange-700 border border-orange-200"
                  : "bg-gray-50 text-gray-400 border border-transparent"
              }`}
            >
              Gasto
            </button>
            <button
              type="button"
              aria-pressed={form.type === "income"}
              onClick={() => form.setType("income")}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                form.type === "income"
                  ? "bg-sky-100 text-sky-700 border border-sky-200"
                  : "bg-gray-50 text-gray-400 border border-transparent"
              }`}
            >
              Ingreso
            </button>
          </div>
        </div>

        <div className="flex gap-4 items-start">
          <div className="w-24 shrink-0">
            <label
              htmlFor={colorId}
              className="block text-xs font-medium text-gray-700 mb-1"
            >
              Color
            </label>
            <input
              id={colorId}
              type="color"
              value={form.colorHex}
              onChange={(e) => form.setColorHex(e.target.value)}
              className="w-full h-12 p-1 border border-gray-200 rounded-xl cursor-pointer bg-gray-50"
            />
          </div>
          <div className="flex-1">
            <span className="block text-xs font-medium text-gray-700 mb-1">
              Seleccionar Ícono
            </span>
            <div
              role="group"
              aria-label="Seleccionar ícono de categoría"
              className="grid grid-cols-6 gap-2 bg-gray-50 p-2 rounded-xl border border-gray-200 max-h-32 overflow-y-auto scrollbar-hide"
            >
              {AVAILABLE_ICONS.map((iconName) => {
                const Icon = ICON_MAP[iconName];
                return (
                  <button
                    key={iconName}
                    type="button"
                    aria-label={`Ícono ${iconName}`}
                    aria-pressed={form.icon === iconName}
                    onClick={() => form.setIcon(iconName)}
                    className={`p-2 rounded-lg flex items-center justify-center transition-colors ${
                      form.icon === iconName
                        ? "bg-sky-500 text-white shadow-md"
                        : "text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <MotionButton
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={form.isSubmitting}
          className="w-full mt-2 bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          {form.isSubmitting ? "Guardando..." : "Crear Categoría"}
        </MotionButton>
      </div>
    </motion.form>
  );
}

interface EditCategoryFormProps {
  category: Category;
  onSave: (id: string, data: UpdateCategoryInput) => Promise<void> | void;
  onCancel: () => void;
}

export function EditCategoryForm({
  category,
  onSave,
  onCancel,
}: EditCategoryFormProps) {
  const editNameId = useId();
  const editColorId = useId();

  const [name, setName] = useState(category.name);
  const [type, setType] = useState<"income" | "expense">(category.type);
  const [colorHex, setColorHex] = useState(category.colorHex || "#fb923c");
  const [icon, setIcon] = useState(category.icon || "Tag");
  const [isSaving, setIsSaving] = useState(false);

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(category.id, { name: name.trim(), type, colorHex, icon });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={submitEdit} className="space-y-4">
      <div>
        <label
          htmlFor={editNameId}
          className="block text-xs font-medium text-gray-700 mb-1"
        >
          Nombre
        </label>
        <input
          id={editNameId}
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none"
        />
      </div>

      <div>
        <span className="block text-xs font-medium text-gray-700 mb-1">
          Tipo
        </span>
        <div className="flex gap-2" role="group" aria-label="Tipo de categoría">
          <button
            type="button"
            aria-pressed={type === "expense"}
            onClick={() => setType("expense")}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              type === "expense"
                ? "bg-orange-100 text-orange-700 border border-orange-200"
                : "bg-gray-50 text-gray-400 border border-transparent"
            }`}
          >
            Gasto
          </button>
          <button
            type="button"
            aria-pressed={type === "income"}
            onClick={() => setType("income")}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              type === "income"
                ? "bg-sky-100 text-sky-700 border border-sky-200"
                : "bg-gray-50 text-gray-400 border border-transparent"
            }`}
          >
            Ingreso
          </button>
        </div>
      </div>

      <div className="flex gap-4 items-start">
        <div className="w-24 shrink-0">
          <label
            htmlFor={editColorId}
            className="block text-xs font-medium text-gray-700 mb-1"
          >
            Color
          </label>
          <input
            id={editColorId}
            type="color"
            value={colorHex}
            onChange={(e) => setColorHex(e.target.value)}
            className="w-full h-12 p-1 border border-gray-200 rounded-xl cursor-pointer bg-gray-50"
          />
        </div>
        <div className="flex-1">
          <span className="block text-xs font-medium text-gray-700 mb-1">
            Seleccionar Ícono
          </span>
          <div
            role="group"
            aria-label="Seleccionar ícono de categoría"
            className="grid grid-cols-6 gap-2 bg-gray-50 p-2 rounded-xl border border-gray-200 max-h-32 overflow-y-auto scrollbar-hide"
          >
            {AVAILABLE_ICONS.map((iconName) => {
              const Icon = ICON_MAP[iconName];
              return (
                <button
                  key={iconName}
                  type="button"
                  aria-label={`Ícono ${iconName}`}
                  aria-pressed={icon === iconName}
                  onClick={() => setIcon(iconName)}
                  className={`p-2 rounded-lg flex items-center justify-center transition-colors ${
                    icon === iconName
                      ? "bg-sky-500 text-white shadow-md"
                      : "text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-6 flex gap-3 pt-2 border-t border-gray-100">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 font-bold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="flex-1 py-3 font-bold text-white bg-sky-500 rounded-xl hover:bg-sky-600 disabled:opacity-50"
        >
          {isSaving ? "Guardando..." : "Guardar Cambios"}
        </button>
      </div>
    </form>
  );
}
