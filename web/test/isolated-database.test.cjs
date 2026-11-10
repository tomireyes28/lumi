/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require("node:test"),
  assert = require("node:assert/strict");
const { localDatabase } = require("../../api/scripts/local-database.cjs");
test("isolated harness refuses remote, implicit and host-overriding connections", () => {
  for (const value of [
    undefined,
    "postgresql://u:p@db.example.invalid/lumi_test_admin",
    "postgresql://u:p@127.0.0.1/lumi_db",
    "postgresql://u:p@127.0.0.1/lumi_test_admin?host=remote",
    "postgresql://u:p@127.0.0.1/lumi_test_admin?options=-csearch_path=other",
  ])
    assert.throws(() => localDatabase(value));
  assert.equal(
    localDatabase("postgresql://u:p@127.0.0.1/lumi_test_admin").hostname,
    "127.0.0.1",
  );
});
