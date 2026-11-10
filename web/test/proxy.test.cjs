/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  Module = require("node:module"),
  ts = require("typescript");
const { NextRequest } = require("next/server");
const file = path.resolve(__dirname, "../src/proxy.ts"),
  loaded = new Module(file, module);
loaded.filename = file;
loaded.paths = module.paths;
loaded._compile(
  ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText,
  file,
);
const { proxy } = loaded.exports;
function request(route, token) {
  return new NextRequest("https://lumi.example" + route, {
    headers: token ? { Cookie: "lumi_session=" + token } : {},
  });
}
function token(exp) {
  return (
    "e30." +
    Buffer.from(JSON.stringify({ sub: "synthetic", exp })).toString(
      "base64url",
    ) +
    ".navigation-only"
  );
}
test("proxy redirects missing/expired sessions and clears expired cookie", () => {
  assert.equal(
    proxy(request("/dashboard")).headers.get("location"),
    "https://lumi.example/",
  );
  const expired = proxy(request("/dashboard", token(1)));
  assert.equal(expired.status, 307);
  assert.match(expired.headers.get("set-cookie"), /lumi_session=;/);
});
test("proxy is only a navigation gate; API owns signature and revocation checks", () => {
  const live = token(Math.floor(Date.now() / 1000) + 60);
  assert.equal(
    proxy(request("/", live)).headers.get("location"),
    "https://lumi.example/dashboard",
  );
  assert.equal(
    proxy(request("/dashboard", live)).headers.get("x-middleware-next"),
    "1",
  );
});
