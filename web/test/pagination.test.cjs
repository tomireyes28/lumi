/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createMonthLoader, transactionPageQuery } =
  require("./load-helper.cjs").load("transaction-pages");
for (const count of [101, 201])
  test(`loads all ${count} movements on different days with at most two pages concurrently`, async () => {
    let active = 0,
      peak = 0,
      calls = 0;
    const load = createMonthLoader(async (path) => {
      const q = new URL(path, "http://test").searchParams;
      const page = Number(q.get("page"));
      assert.equal(q.get("month"), "11");
      assert.equal(q.get("year"), "2026");
      calls++;
      peak = Math.max(peak, ++active);
      await new Promise((r) => setTimeout(r, 2));
      active--;
      return {
        data: Array.from(
          { length: Math.min(100, count - (page - 1) * 100) },
          (_, i) => ({
            id: String((page - 1) * 100 + i),
            date: `2026-11-${String(1 + (i % 28)).padStart(2, "0")}`,
          }),
        ),
        meta: {
          page,
          total: count,
          limit: 100,
          totalPages: Math.ceil(count / 100),
        },
      };
    });
    const [a, b] = await Promise.all([load(11, 2026), load(11, 2026)]);
    assert.equal(a.length, count);
    assert.equal(a, b);
    assert.equal(calls, Math.ceil(count / 100));
    assert.ok(peak <= 2);
  });
test("rejects a failed second page and retries the entire month", async () => {
  let fail = true;
  const load = createMonthLoader(async (path) => {
    const page = Number(new URL(path, "http://test").searchParams.get("page"));
    if (page === 2 && fail) throw Error("timeout");
    return {
      data: Array.from({ length: page === 1 ? 100 : 1 }, (_, i) => ({
        id: `${page}-${i}`,
      })),
      meta: { page, total: 101, limit: 100, totalPages: 2 },
    };
  });
  await assert.rejects(load(11, 2026), /timeout/);
  fail = false;
  assert.equal((await load(11, 2026)).length, 101);
});
test("page query preserves filters and supports backward navigation", () => {
  for (const page of [1, 2, 3, 2, 1]) {
    const q = new URL(transactionPageQuery(page, "income"), "http://test")
      .searchParams;
    assert.equal(q.get("page"), String(page));
    assert.equal(q.get("type"), "income");
  }
});
