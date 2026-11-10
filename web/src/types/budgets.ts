export type BudgetStatus = "ok" | "warning" | "exceeded";

export type BudgetProgressItem = import("@/lib/contracts").BudgetItemDto;

export type BudgetsSummaryResponse = import("@/lib/contracts").BudgetSummaryDto;
