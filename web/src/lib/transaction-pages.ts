import type {
  PaginatedTransactionsResponse,
  Transaction,
} from "@/types/transactions";

export function transactionPageQuery(
  page: number,
  type = "all",
  month?: number,
  year?: number,
) {
  const params = new URLSearchParams({ page: String(page), limit: "100" });
  if (type !== "all") params.set("type", type);
  if (month !== undefined && year !== undefined) {
    params.set("month", String(month));
    params.set("year", String(year));
  }
  return `/transactions?${params}`;
}

type PageLoader = (path: string) => Promise<PaginatedTransactionsResponse>;
// Only complete requests are shared, never a partial month or a stale cross-user cache.
export function createMonthLoader(load: PageLoader) {
  const inFlight = new Map<string, Promise<Transaction[]>>();
  return (month: number, year: number) => {
    const key = `${year}-${month}`;
    const cached = inFlight.get(key);
    if (cached) return cached;
    const pending = (async () => {
      const first = await load(transactionPageQuery(1, "all", month, year));
      const pages = [first];
      for (let page = 2; page <= first.meta.totalPages; page += 2) {
        const batch = await Promise.all(
          Array.from(
            { length: Math.min(2, first.meta.totalPages - page + 1) },
            (_, i) => load(transactionPageQuery(page + i, "all", month, year)),
          ),
        );
        pages.push(...batch);
      }
      const all = pages.flatMap((p) => p.data);
      if (
        pages.some(
          (p, i) =>
            p.meta.page !== i + 1 ||
            p.meta.total !== first.meta.total ||
            p.meta.limit !== first.meta.limit ||
            p.meta.totalPages !== first.meta.totalPages,
        ) ||
        all.length !== first.meta.total ||
        new Set(all.map((t) => t.id)).size !== all.length
      ) {
        throw new Error(
          "Los movimientos cambiaron durante la consulta. Reintentá para cargar el mes completo.",
        );
      }
      return all;
    })();
    inFlight.set(key, pending);
    void pending
      .finally(() => {
        if (inFlight.get(key) === pending) inFlight.delete(key);
      })
      .catch(() => {});
    return pending;
  };
}
