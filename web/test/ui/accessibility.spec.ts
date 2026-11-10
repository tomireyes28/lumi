import { expect, test } from "@playwright/test";
import { fixture } from "./fixture";

test("auth fields have associated accessible labels and autocomplete", async ({
  page,
}) => {
  await fixture(page);
  await page.context().clearCookies();
  await page.goto("/");
  await expect(page.getByLabel("Email", { exact: true })).toHaveAttribute(
    "autocomplete",
    "email",
  );
  await expect(page.getByLabel("Contraseña", { exact: true })).toHaveAttribute(
    "autocomplete",
    "current-password",
  );
  await page.getByRole("button", { name: "Registrarse", exact: true }).click();
  await expect(page.getByLabel("Nombre", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Contraseña", { exact: true })).toHaveAttribute(
    "autocomplete",
    "new-password",
  );
});

test("modal isolates background and traps keyboard above fixed navigation", async ({
  page,
}, testInfo) => {
  await fixture(page);
  await page.goto("/dashboard/categories");
  const trigger = page
    .getByRole("button", { name: /Editar categoría/ })
    .first();
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Editar Categoría" });
  await expect(dialog).toBeVisible();
  const field = dialog.getByRole("textbox", { name: "Nombre", exact: true });
  await expect(field).toBeFocused();
  await field.pressSequentially(" extra");
  await expect(field).toBeFocused();
  const first = dialog.getByRole("button", { name: "Cerrar modal" });
  await first.focus();
  await page.keyboard.press("Shift+Tab");
  const last = dialog.getByRole("button", { name: "Guardar Cambios" });
  await expect(last).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(first).toBeFocused();
  await page.evaluate(() =>
    document.querySelector<HTMLElement>("nav a")?.focus(),
  );
  await expect(first).toBeFocused();
  expect(await dialog.evaluate((el) => el.matches(":modal"))).toBe(true);
  expect(
    await page.evaluate(
      () =>
        document.elementFromPoint(innerWidth / 2, innerHeight - 10)?.tagName,
    ),
  ).toBe("DIALOG");
  const accessibility = await page.context().newCDPSession(page);
  const { nodes } = await accessibility.send("Accessibility.getFullAXTree");
  expect(
    nodes.some((node) => !node.ignored && node.role?.value === "navigation"),
  ).toBe(false);
  await accessibility.detach();
  await page.screenshot({ path: testInfo.outputPath("modal.png") });
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test("budget dialog keeps amount focus while typing and exposes category state", async ({
  page,
}) => {
  await fixture(page, async (route, path) => {
    if (path !== "/budgets") return false;
    await route.fulfill({
      json: {
        period: "11/2026",
        totalBudgeted: 0,
        totalSpent: 0,
        totalRemaining: 0,
        overallPercentage: 0,
        items: [],
      },
    });
    return true;
  });
  await page.goto("/dashboard/budgets");
  const trigger = page.getByRole("button", { name: "Definir", exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Definir Presupuesto" });
  const amount = dialog.getByLabel("Límite Mensual ($)", { exact: true });
  await expect(amount).toBeFocused();
  await amount.pressSequentially("123.45");
  await expect(amount).toHaveValue("123.45");
  await expect(amount).toBeFocused();
  await expect(
    dialog
      .getByRole("group", { name: "Categoría de Gasto" })
      .getByRole("button")
      .first(),
  ).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
});

test("reduced motion avoids animated transforms on form controls", async ({
  page,
}) => {
  await fixture(page);
  await page.context().clearCookies();
  await page.goto("/");
  expect(
    await page.evaluate(
      () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    ),
  ).toBe(true);
  const submit = page.getByRole("button", {
    name: "Iniciar Sesión",
    exact: true,
  });
  await submit.hover();
  await expect(submit).toHaveCSS("transform", "none");
});
