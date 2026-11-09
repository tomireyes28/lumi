import { expect, test } from "@playwright/test";
import { fixture } from "./fixture";
test("history navigates forward/back and resets page when filtering", async ({
  page,
}) => {
  await fixture(page);
  await page.goto("/dashboard/transactions");
  await expect(page.getByText(/^Movement 0(?: •|$)/)).toBeVisible();
  await page.getByRole("button", { name: "Siguiente", exact: true }).click();
  await expect(page.getByText(/^Movement 100(?: •|$)/)).toBeVisible();
  await page.getByRole("button", { name: "Siguiente", exact: true }).click();
  await expect(page.getByText(/^Movement 200(?: •|$)/)).toBeVisible();
  await page.getByRole("button", { name: "Anterior", exact: true }).click();
  await expect(page.getByText(/^Movement 100(?: •|$)/)).toBeVisible();
  await page.getByRole("button", { name: "Solo Ingresos" }).click();
  await expect(page.getByText("Página 1 de 2 · 101 movimientos")).toBeVisible();
});
test("calendar includes movement 201 in the day details", async ({ page }) => {
  await fixture(page);
  await page.goto("/dashboard/calendar");
  await expect(page.getByText(/^Movement 200(?: •|$)/)).toBeVisible();
});
