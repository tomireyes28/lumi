import { expect, test } from "@playwright/test";
import { fixture, category } from "./fixture";
for (const [path, endpoint] of [
  ["cards", "/credit-cards"],
  ["categories", "/categories"],
  ["reminders", "/reminders"],
  ["calendar", "/transactions"],
]) {
  test(`${path} displays failure and retries instead of claiming empty results`, async ({
    page,
  }) => {
    let fail = true;
    await fixture(page, async (route, p) => {
      if (p !== endpoint) return false;
      if (fail) {
        await route.fulfill({
          status: 503,
          json: { message: "API sintética no disponible" },
        });
        return true;
      }
      return false;
    });
    await page.goto("/dashboard/" + path);
    await expect(
      page.getByRole("alert", { name: "Error al cargar" }),
    ).toContainText("API sintética no disponible");
    await expect(
      page.getByText(/No hay movimientos ni pagos para este día/),
    ).toHaveCount(0);
    fail = false;
    await page.getByRole("button", { name: "Reintentar carga" }).click();
    await expect(
      page.getByRole("alert", { name: "Error al cargar" }),
    ).toHaveCount(0);
  });
}
test("acknowledged creation followed by failed GET does not invite duplicate POST", async ({
  page,
}) => {
  let saved = false,
    posts = 0,
    failRefresh = true;
  await fixture(page, async (route, path) => {
    if (path !== "/categories") return false;
    if (route.request().method() === "POST") {
      posts++;
      saved = true;
      await route.fulfill({
        status: 201,
        json: { ...category, name: "Saved synthetic" },
      });
      return true;
    }
    if (saved && failRefresh) {
      await route.fulfill({
        status: 503,
        json: { message: "Falló solo la recarga" },
      });
      return true;
    }
    return false;
  });
  await page.goto("/dashboard/categories");
  await page
    .getByRole("textbox", { name: "Nombre", exact: true })
    .fill("Saved synthetic");
  await page.getByRole("button", { name: /Crear Categoría/i }).click();
  await expect(page.getByText(/El cambio se guardó, pero/)).toBeVisible();
  expect(posts).toBe(1);
  failRefresh = false;
  await page
    .getByRole("alert", { name: "Error al cargar" })
    .getByRole("button", { name: "Reintentar carga" })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Nombre", exact: true }),
  ).toHaveValue("");
  expect(posts).toBe(1);
});
test("calendar keeps current period while an earlier month request finishes late", async ({
  page,
}) => {
  let held: (() => void) | undefined;
  let hold = false;
  await fixture(page, async (route, path) => {
    if (path !== "/transactions" || !hold) return false;
    hold = false;
    await new Promise<void>((resolve) => {
      held = resolve;
    });
    await route.fulfill({
      json: {
        data: [],
        meta: { page: 1, total: 0, limit: 100, totalPages: 0 },
      },
    });
    return true;
  });
  await page.goto("/dashboard/calendar");
  await expect(page.getByText("Movement 200", { exact: true })).toBeVisible();
  hold = true;
  await page.locator(".react-calendar__navigation__next-button").click();
  await expect(page.getByRole("status")).toContainText(
    "Cargando el mes seleccionado",
  );
  await expect(page.getByText("Movement 200", { exact: true })).toHaveCount(0);
  await page.locator(".react-calendar__navigation__next-button").click();
  await expect(page.getByRole("status")).toHaveCount(0);
  held?.();
  await expect(
    page.getByText(/No hay movimientos ni pagos para este día/),
  ).not.toBeVisible();
});
test("timeout is visible and does not become an empty calendar", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = AbortSignal.timeout.bind(AbortSignal);
    AbortSignal.timeout = () => original(100);
  });
  await fixture(page, async (route, path) => {
    if (path !== "/transactions") return false;
    await new Promise((resolve) => setTimeout(resolve, 500));
    await route
      .fulfill({
        json: {
          data: [],
          meta: { page: 1, total: 0, limit: 100, totalPages: 0 },
        },
      })
      .catch(() => {});
    return true;
  });
  await page.goto("/dashboard/calendar");
  await expect(
    page.getByRole("alert", { name: "Error al cargar" }),
  ).toContainText("La consulta tardó demasiado");
  await expect(
    page.getByText("No hay movimientos ni pagos para este día."),
  ).toHaveCount(0);
});
