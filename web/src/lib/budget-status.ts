export function budgetStatus(
  spent: number,
  budget: number,
): "ok" | "warning" | "exceeded" {
  const spentCents = Math.round(spent * 100),
    budgetCents = Math.round(budget * 100);
  if (budgetCents > 0 && spentCents > budgetCents) return "exceeded";
  if (budgetCents > 0 && spentCents * 100 >= budgetCents * 75) return "warning";
  return "ok";
}
