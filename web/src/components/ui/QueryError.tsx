export function QueryError({
  message,
  retry,
}: {
  message: string;
  retry: () => unknown;
}) {
  return (
    <div
      role="alert"
      aria-label="Error al cargar"
      className="p-4 rounded-2xl border border-rose-200 bg-rose-50 text-rose-900 space-y-2"
    >
      <p className="text-sm">{message}</p>
      <button
        type="button"
        onClick={() => {
          void retry();
        }}
        className="px-3 py-2 rounded-xl bg-white border border-rose-300 text-sm font-semibold"
      >
        Reintentar carga
      </button>
    </div>
  );
}
