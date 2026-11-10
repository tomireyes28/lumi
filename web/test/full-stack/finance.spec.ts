import { expect, test, type Page } from "@playwright/test";
import {
  transactionPageSchema,
  budgetsSchema,
  forecastSchema,
  reminderSchema,
  categorySchema,
  cardSchema,
} from "../../src/lib/contracts";

async function json(page: Page, path: string): Promise<unknown> {
  return page.evaluate(async (endpoint) => {
    const response = await fetch("/api/backend" + endpoint);
    if (!response.ok) throw Error(`HTTP ${response.status}`);
    return response.json();
  }, path);
}
function calendarDate(year: number, monthIndex: number, day: number) {
  return new Date(Date.UTC(year, monthIndex, day)).toISOString().slice(0, 10);
}

test("real login → category → special card cycle → installments → budget → recurrence → pagination → logout", async ({
  page,
}, info) => {
  await page.route("**/*", (route) =>
    new URL(route.request().url()).origin === "http://localhost:3102"
      ? route.continue()
      : route.abort(),
  );
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const year = Number(today.slice(0, 4)),
    month = Number(today.slice(5, 7)) - 1;
  const next = new Date(Date.UTC(year, month + 1, 1));
  await page.goto("/");
  await page
    .getByLabel("Email", { exact: true })
    .fill(`e2e-${info.project.name}@example.invalid`);
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill("Lumi-e2e-synthetic-2026!");
  const loginResponse = page.waitForResponse((response) =>
    response.url().endsWith("/api/backend/auth/login"),
  );
  await page
    .getByRole("button", { name: "Iniciar Sesión", exact: true })
    .click();
  expect((await loginResponse).ok()).toBe(true);
  expect(
    (await page.context().cookies()).some(
      (cookie) => cookie.name === "lumi_session",
    ),
  ).toBe(true);
  await expect(page).toHaveURL(/\/dashboard$/);
  expect(
    (await page.context().cookies()).find((c) => c.name === "lumi_session")
      ?.httpOnly,
  ).toBe(true);
  expect(
    await page.evaluate(() => localStorage.getItem("lumi_token")),
  ).toBeNull();
  await page.goto("/dashboard/categories");
  await page.getByLabel("Nombre", { exact: true }).fill("Compra e2e");
  await page.getByRole("button", { name: "Crear Categoría" }).click();
  await expect(
    page.getByText("Categoría creada", { exact: true }),
  ).toBeVisible();
  await page.goto("/dashboard/cards");
  await page.getByLabel("Alias (Nombre)").fill("Visa e2e");
  await page.getByLabel("Últimos 4 números").fill("4242");
  await page.getByLabel("Límite Total ($)").fill("10000");
  await page.getByLabel("Día que Cierra").fill("25");
  await page.getByLabel("Día que Vence").fill("5");
  await page.getByRole("button", { name: "Agregar Tarjeta" }).click();
  await expect(
    page.getByText("Tarjeta guardada", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Ajustar fecha de cierre de Visa e2e" })
    .click();
  const cycle = page.getByRole("dialog", { name: "Elegir cierre de este mes" });
  await cycle
    .getByLabel("Mes del resumen")
    .selectOption(String(next.getUTCMonth() + 1));
  await cycle
    .getByLabel("Año", { exact: true })
    .selectOption(String(next.getUTCFullYear()));
  await cycle
    .getByLabel("Fecha exacta de cierre")
    .fill(calendarDate(year, month + 1, 10));
  await cycle
    .getByLabel("Fecha de vencimiento del pago (opcional)")
    .fill(calendarDate(year, month + 2, 7));
  await cycle.getByRole("button", { name: /Guardar/ }).click();
  await expect(cycle).not.toBeVisible();
  const categories = categorySchema
    .array()
    .parse(await json(page, "/categories"));
  const category = categories.find((c) => c.name === "Compra e2e")!;
  const card = cardSchema.array().parse(await json(page, "/credit-cards"))[0];
  await page.goto("/dashboard/transactions");
  await page
    .getByLabel("Fecha de compra o ingreso")
    .fill(calendarDate(year, month, 20));
  await page.getByLabel("Monto ($)", { exact: true }).fill("100");
  await page.getByLabel("Categoría", { exact: true }).selectOption(category.id);
  await page.getByLabel("Medio de Pago").selectOption(card.id);
  await page.getByLabel("¿En cuántas cuotas?").selectOption("3");
  await page.getByLabel("Nota (Opcional)").fill("Compra especial e2e");
  await page.getByRole("button", { name: "Registrar", exact: true }).click();
  await expect(
    page.getByText("Movimiento registrado", { exact: true }),
  ).toBeVisible();
  const movements = transactionPageSchema.parse(
    await json(page, "/transactions?page=1&limit=100"),
  );
  expect(movements.meta.total).toBe(204);
  const installments = movements.data
    .filter((t) => t.note?.startsWith("Compra especial e2e"))
    .sort((a, b) => (a.installmentNumber ?? 0) - (b.installmentNumber ?? 0));
  expect(installments).toHaveLength(3);
  expect(installments.map((t) => Number(t.amount))).toEqual([
    33.34, 33.33, 33.33,
  ]);
  expect(installments.map((t) => t.paymentDueDate?.slice(0, 10))).toEqual([
    calendarDate(year, month + 1, 5),
    calendarDate(year, month + 2, 7),
    calendarDate(year, month + 3, 5),
  ]);
  await page.getByRole("button", { name: "Siguiente", exact: true }).click();
  await expect(page.getByText("Página 2 de 3 · 204 movimientos")).toBeVisible();
  await page.getByRole("button", { name: "Siguiente", exact: true }).click();
  await expect(page.getByText("Página 3 de 3 · 204 movimientos")).toBeVisible();
  await page.goto("/dashboard/budgets");
  await page.getByRole("button", { name: "Definir", exact: true }).click();
  const budget = page.getByRole("dialog", { name: "Definir Presupuesto" });
  await budget.getByRole("button", { name: "Compra e2e", exact: true }).click();
  await budget.getByLabel("Límite Mensual ($)").fill("30");
  await budget.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(budget).not.toBeVisible();
  const summary = budgetsSchema.parse(
    await json(page, `/budgets?month=${month + 1}&year=${year}`),
  );
  expect(summary.totalSpent).toBe(33.34);
  expect(summary.overallStatus).toBe("exceeded");
  await page.goto("/dashboard/reminders");
  await page.getByLabel("¿Qué hay que pagar?").fill("Servicio e2e");
  await page.getByLabel("Monto (Opcional)").fill("20");
  const end = new Date(Date.UTC(year, month + 1, 0));
  await page
    .getByLabel("Fecha de Vencimiento")
    .fill(end.toISOString().slice(0, 10));
  await page
    .getByLabel("Se repite todos los meses (gasto fijo recurrente)")
    .check();
  await page.getByRole("button", { name: "Guardar Recordatorio" }).click();
  await expect(
    page.getByText("Vencimiento agendado", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Marcar como pagado" })
    .first()
    .click();
  await expect(
    page.getByText("¡Pago registrado!", { exact: true }),
  ).toBeVisible();
  const occurrences = reminderSchema
    .array()
    .parse(await json(page, "/reminders"));
  expect(occurrences.filter((r) => r.isPaid)).toHaveLength(1);
  expect(
    occurrences.some(
      (r) =>
        !r.isPaid &&
        r.dueOn?.slice(0, 7) === calendarDate(year, month + 1, 1).slice(0, 7),
    ),
  ).toBe(true);
  const forecast = forecastSchema.parse(
    await json(page, "/analytics/forecast?months=3"),
  );
  expect(forecast.forecastTimeline.map((m) => m.fixedExpenses)).toEqual([
    0, 20, 20,
  ]);
  await page.goto("/dashboard/calendar");
  await expect(
    page.getByText("Fixture cotidiano 0", { exact: true }),
  ).toBeVisible();
  await page.goto("/dashboard/profile");
  await page
    .getByRole("button", { name: "Cerrar Sesión", exact: true })
    .click();
  await expect(page).toHaveURL(/\/$/);
  expect(
    await page.evaluate(
      async () => (await fetch("/api/backend/auth/me")).status,
    ),
  ).toBe(401);
  expect(
    (await page.context().cookies()).find((c) => c.name === "lumi_session"),
  ).toBeUndefined();
});
