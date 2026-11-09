/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require("node:test"),
  assert = require("node:assert/strict");
const { budgetStatus } = require("./load-helper.cjs").load("budget-status");
test("overall budget status uses cents instead of rounded percentages", () => {
  for (const [spent, status] of [
    [100.01, "exceeded"],
    [100, "warning"],
    [75, "warning"],
    [74.99, "ok"],
    [74.5, "ok"],
    [0, "ok"],
  ])
    assert.equal(budgetStatus(spent, 100), status);
  assert.equal(budgetStatus(0, 0), "ok");
});
