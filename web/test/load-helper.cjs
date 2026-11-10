/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
exports.load = (name) => {
  const source = fs.readFileSync(
    path.resolve(__dirname, "../src/lib", name + ".ts"),
    "utf8",
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const result = {};
  Function("exports", "require", compiled)(result, require);
  return result;
};
