// 1. Creamos el tipo para los gastitos individuales
export interface AnalyticsTransaction {
  id: string;
  note: string | null;
  amount: number;
  date: Date | string;
}

// 2. Le sumamos las transacciones a la categoría
export interface CategoryBreakdown {
  name: string;
  color: string;
  total: number;
  transactions: AnalyticsTransaction[]; // <-- ¡Esto es lo que TypeScript no encontraba!
}

// AnalyticsData queda igual, seguro ya lo tenés así:
export interface AnalyticsData {
  currentMonthTotal: number;
  lastMonthTotal: number;
  percentageChange: number;
  categoryBreakdown: CategoryBreakdown[];
}