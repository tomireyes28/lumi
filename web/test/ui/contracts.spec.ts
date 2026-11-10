import { expect, test } from "@playwright/test";
import { fixture } from "./fixture";
test("malformed financial response shows incompatibility rather than empty results", async ({
  page,
}) => {
  await fixture(page, async (route, path) => {
    if (path !== "/transactions") return false;
    await route.fulfill({ json: { data: [] } });
    return true;
  });
  await page.goto("/dashboard/transactions");
  await expect(
    page.getByRole("alert", { name: "Error al cargar" }),
  ).toContainText("incompatible");
  await expect(
    page.getByText("No hay movimientos con este filtro."),
  ).toHaveCount(0);
});
test("incomplete auth response does not navigate into an authenticated session", async ({
  page,
}) => {
  await fixture(page, async (route, path) => {
    if (path !== "/auth/login") return false;
    await route.fulfill({ json: { user: { id: "synthetic" } } });
    return true;
  });
  await page.context().clearCookies();
  await page.goto("/");
  await page.getByPlaceholder("tu@email.com").fill("synthetic@example.invalid");
  await page.getByPlaceholder("••••••••").fill("synthetic-password");
  await page.getByRole("button", { name: "Iniciar Sesión", exact: true }).click();
  await expect(
    page.getByText("Respuesta de autenticación inválida"),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
});
