import { expect, test } from "@playwright/test";
import { fixture } from "./fixture";
test("social metadata references an actual 1200 by 630 PNG", async ({
  page,
}, info) => {
  await page.goto("/");
  const source = await page
    .locator('meta[property="og:image"]')
    .getAttribute("content");
  expect(source).toBeTruthy();
  const url = new URL(source!);
  const response = await page.request.get(url.pathname + url.search);
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toContain("image/png");
  const bytes = await response.body();
  expect(bytes.readUInt32BE(16)).toBe(1200);
  expect(bytes.readUInt32BE(20)).toBe(630);
  await response
    .body()
    .then((buffer) =>
      import("node:fs/promises").then((fs) =>
        fs.writeFile(info.outputPath("social.png"), buffer),
      ),
    );
});
test("card actions do not cover its alias and navigation reserves space", async ({
  page,
}) => {
  await fixture(page, async (route, path) => {
    if (path !== "/credit-cards") return false;
    await route.fulfill({
      json: [
        {
          id: "card",
          alias: "Visa · principal",
          lastFour: "4242",
          limit: "2250000",
          closingDay: 25,
          dueDay: 5,
          colorHex: "#173b61",
          consumed: 120000,
          cycles: [],
        },
      ],
    });
    return true;
  });
  await page.goto("/dashboard/cards");
  const alias = page.getByRole("heading", {
    name: "Visa · principal",
    exact: true,
  });
  await expect(alias).toBeVisible();
  const button = page.getByRole("button", {
    name: "Ajustar fecha de cierre de Visa · principal",
  });
  const a = await alias.boundingBox(),
    b = await button.boundingBox();
  expect(a!.y).toBeGreaterThanOrEqual(b!.y + b!.height - 1);
  expect(
    await page
      .locator("main")
      .evaluate((el) => parseFloat(getComputedStyle(el).paddingBottom)),
  ).toBeGreaterThanOrEqual(80);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
