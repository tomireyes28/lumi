import { toast } from "sonner";

/** A failed refresh does not undo an acknowledged mutation. Never suggest repeating it. */
export async function refreshAfterMutation(reload: () => Promise<boolean>) {
  if (!(await reload()))
    toast.warning(
      "El cambio se guardó, pero no pudimos actualizar la vista. No repitas la operación; reintentá la carga.",
      {
        duration: 10000,
        action: {
          label: "Reintentar carga",
          onClick: () => {
            void reload();
          },
        },
      },
    );
}
