

export interface DashboardSummary {
  period: string;
  availableCash: number;
  totalIncome: number;
  totalCashExpense: number;
  totalCardExpense: number;
}


export interface SummaryData {
  period: string;
  totalIncome: number;
  totalCashExpense: number;
  totalCardExpense: number;
  availableCash: number;
}

export interface CardRecommendation {
  card: {
    alias: string;
    lastFour: string;
  };
  daysToClose: number;
  message: string;
}

export interface Reminder {
  id: string;
  title: string;
  amount: string | null;
  dueDate: string;
  isPaid: boolean;
}