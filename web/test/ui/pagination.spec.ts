import { Page, Route, expect, test } from "@playwright/test";
export const category = {
  id: "category",
  name: "Synthetic expenses",
  type: "expense",
  colorHex: "#123456",
  icon: "ShoppingCart",
};
export const user = {
  id: "synthetic",
  email: "synthetic@example.invalid",
  name: "Synthetic",
  picture: null,
};
export async function fixture(
  page: Page,
  override?: (route: Route, path: string) => Promise<boolean>,
) {
  const token =
    "e30." +
    Buffer.from(
      JSON.stringify({
        sub: "synthetic",
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    ).toString("base64url") +
    ".synthetic";
  await page
    .context()
    .addCookies([
      {
        name: "lumi_session",
        value: token,
        url: "http://127.0.0.1:3101",
        httpOnly: true,
      },
    ]);
  await page.route("**/api/backend/**", async (route) => {
    const url = new URL(route.request().url()),
      path = url.pathname.replace("/api/backend", "");
    if (override && (await override(route, path))) return;
    let value: unknown = [];
    if (path === "/auth/me") value = user;
    if (path === "/categories") value = [category];
    if (path === "/transactions") {
      const type = url.searchParams.get("type");
      const count = type === "income" ? 101 : type === "expense" ? 100 : 201;
      const current = Number(url.searchParams.get("page") ?? 1);
      const today = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Argentina/Buenos_Aires",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());
      value = {
        data: Array.from(
          { length: Math.max(0, Math.min(100, count - (current - 1) * 100)) },
          (_, i) => ({
            id: `tx-${(current - 1) * 100 + i}`,
            note: `Movement ${(current - 1) * 100 + i}`,
            amount: "1.00",
            date: today + "T15:00:00Z",
            category: {
              ...category,
              type: type === "income" ? "income" : "expense",
            },
            creditCard: null,
            paymentMethod: "cash",
          }),
        ),
        meta: {
          page: current,
          total: count,
          limit: 100,
          totalPages: Math.ceil(count / 100),
        },
      };
    }
    await route.fulfill({ json: value });
  });
}
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
