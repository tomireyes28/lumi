import type { Reminder } from './reminders';

export type { Reminder };

export interface DashboardSummary {
  period: string;
  availableCash: number;
  totalIncome: number;
  totalCashExpense: number;
  totalCardExpense: number;
}

export type SummaryData = DashboardSummary;

export interface CardRecommendation {
  card: {
    alias: string;
    lastFour: string;
  };
  daysToClose: number;
  message: string;
}
