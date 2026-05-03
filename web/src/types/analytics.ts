export interface CategoryBreakdown {
  name: string;
  color: string;
  total: number;
}

export interface AnalyticsData {
  currentMonthTotal: number;
  lastMonthTotal: number;
  percentageChange: number;
  categoryBreakdown: CategoryBreakdown[];
}