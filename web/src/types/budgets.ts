export type BudgetStatus = 'ok' | 'warning' | 'exceeded';

export interface BudgetProgressItem {
  id: string;
  categoryId: string;
  category: {
    id: string;
    name: string;
    colorHex: string | null;
    icon: string | null;
  };
  budgetedAmount: number;
  spentAmount: number;
  remainingAmount: number;
  percentageSpent: number;
  status: BudgetStatus;
}

export interface BudgetsSummaryResponse {
  period: string;
  totalBudgeted: number;
  totalSpent: number;
  totalRemaining: number;
  overallPercentage: number;
  items: BudgetProgressItem[];
}
