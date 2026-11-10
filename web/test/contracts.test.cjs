/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require("node:test"),
  assert = require("node:assert/strict");
const {
  parseHttpResponse,
  transactionPageSchema,
  moneySchema,
  publicUserSchema,
} = require("./load-helper.cjs").load("contracts");
const tx = {
  id: "tx",
  amount: "12.34",
  date: "2026-11-09T15:00:00.000Z",
  note: null,
  category: {
    id: "cat",
    name: "Category",
    type: "expense",
    colorHex: null,
    icon: null,
  },
  creditCard: null,
  purchaseDate: null,
};
test("entity decimal, nullable fields and complete paginated response are supported", () => {
  const page = {
    data: [tx],
    meta: { page: 1, limit: 100, total: 1, totalPages: 1 },
  };
  const result = transactionPageSchema.parse(page);
  assert.equal(result.data[0].amount, "12.34");
  assert.equal(result.data[0].purchaseDate, null);
  assert.equal(moneySchema.safeParse("NaN").success, false);
  assert.equal(moneySchema.safeParse("1e9").success, false);
  assert.equal(moneySchema.safeParse(null).success, false);
});
test("incomplete or inconsistent financial JSON is rejected before use", () => {
  for (const value of [
    { data: [tx] },
    { data: [], meta: { page: 1, total: 1, limit: 100, totalPages: 1 } },
    {
      data: [{ ...tx, amount: null }],
      meta: { page: 1, total: 1, limit: 100, totalPages: 1 },
    },
  ])
    assert.throws(
      () => parseHttpResponse("/transactions?page=1", "GET", value),
      /incompatible/,
    );
  assert.throws(() => parseHttpResponse("/budgets", "GET", {}), /incompatible/);
  assert.equal(
    publicUserSchema.safeParse({ id: "u", name: "N", email: 42 }).success,
    false,
  );
  assert.throws(
    () => parseHttpResponse("/auth/login", "POST", { user: { id: "u" } }),
    /incompatible/,
  );
});
