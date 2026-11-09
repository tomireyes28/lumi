/* eslint-disable @typescript-eslint/no-require-imports -- Node test harness transpiles the standalone date helper. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
test("calendar labels stay the same for UTC, Buenos Aires and Auckland browsers", () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, "../src/lib/business-date.ts"),
    "utf8",
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  for (const TZ of [
    "UTC",
    "America/Argentina/Buenos_Aires",
    "Pacific/Auckland",
  ]) {
    const code = `const assert=require('node:assert/strict');const api={};Function('exports',${JSON.stringify(compiled)})(api);
    assert.equal(api.businessDateKey('2026-01-26T01:00:00Z'),'2026-01-25');
    assert.equal(api.businessDateKey('2026-01-26'),'2026-01-26');
    assert.equal(api.storedCalendarKey('2026-01-26T00:00:00.000Z'),'2026-01-26');
    assert.equal(api.businessDateKey('2026-01-01T01:00:00Z'),'2025-12-31');`;
    const result = spawnSync(process.execPath, ["-e", code], {
      env: { ...process.env, TZ },
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr);
  }
});
