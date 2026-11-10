// Single source copied into deploy roots so Vercel/Railway need no sibling package.
const fs = require("node:fs"),
  path = require("node:path");
const root = path.resolve(__dirname, "..");
const body =
  "// Generated from contracts/http.ts. Run node scripts/sync-contracts.cjs.\n" +
  fs
    .readFileSync(path.join(root, "contracts/http.ts"), "utf8")
    .replaceAll("\r\n", "\n");
for (const name of ["api/src/contracts/http.ts", "web/src/lib/contracts.ts"]) {
  const target = path.join(root, name);
  if (process.argv.includes("--check")) {
    if (fs.readFileSync(target, "utf8").replaceAll("\r\n", "\n") !== body) {
      console.error("Contract drift: " + name);
      process.exitCode = 1;
    }
  } else fs.writeFileSync(target, body);
}
