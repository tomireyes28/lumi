export interface ForecastMonthItem {
  period: string;
  label: string;
  month: number;
  year: number;
  installmentExpenses: number;
  fixedExpenses: number;
  totalCommitted: number;
  estimatedIncome: number;
  projectedNetCashflow: number;
  commitmentRatio: number;
  installments: {
    id: string;
    note: string;
    amount: number;
    creditCardAlias: string;
  }[];
}

export interface ActivePlanItem {
  groupId: string;
  concept: string;
  totalInstallments: number;
  paidInstallments: number;
  remainingInstallments: number;
  installmentAmount: number;
  remainingAmount: number;
  totalAmount: number;
  completionPercentage: number;
  finishDate: string;
  finishPeriod: string;
  creditCard: {
    alias: string;
    lastFour: string;
    colorHex: string | null;
  } | null;
}

export interface CashflowForecastResponse {
  monthsCount: number;
  estimatedMonthlyIncome: number;
  totalFutureDebt: number;
  debtFreePeriod: string | null;
  averageCommitmentRatio: number;
  forecastTimeline: ForecastMonthItem[];
  activePlans: ActivePlanItem[];
}
