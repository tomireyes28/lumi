import { expect, test } from "@playwright/test";
import { fixture, category } from "./fixture";
for (const [spent, status] of [
  [100.01, "exceeded"],
  [74.99, "ok"],
  [75, "warning"],
] as const)
  test(`budget overview and category agree at ${spent}`, async ({ page }) => {
    await fixture(page, async (route, path) => {
      if (path !== "/budgets") return false;
      await route.fulfill({
        json: {
          period: "11/2026",
          totalBudgeted: 100,
          totalSpent: spent,
          totalRemaining: Math.max(0, 100 - spent),
          overallPercentage: Math.round(spent),
          items: [
            {
              id: "budget",
              categoryId: category.id,
              category,
              budgetedAmount: 100,
              spentAmount: spent,
              remainingAmount: Math.max(0, 100 - spent),
              percentageSpent: Math.round(spent),
              status,
            },
          ],
        },
      });
      return true;
    });
    await page.goto("/dashboard/budgets");
    await expect(
      page.getByText("Total de categorías presupuestadas"),
    ).toBeVisible();
    if (status === "exceeded") {
      await expect(page.getByText("Excedido por $0,01")).toBeVisible();
      await expect(page.getByText("Límite superado por $0,01")).toBeVisible();
    }
    const overview = page
      .getByText("Total de categorías presupuestadas")
      .locator("..")
      .locator("..")
      .locator("..")
      .locator("..");
    await expect(
      overview.locator(
        status === "ok"
          ? ".bg-emerald-500"
          : status === "warning"
            ? ".bg-amber-500"
            : ".bg-rose-500",
      ),
    ).toHaveCount(1);
  });
