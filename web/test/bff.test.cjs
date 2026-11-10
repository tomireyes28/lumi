/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS Node test harness compiles the route without starting Next. */
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const { NextRequest } = require("next/server");
const file = path.resolve(
  __dirname,
  "../src/app/api/backend/[...path]/route.ts",
);
const loaded = new Module(file, module);
loaded.filename = file;
loaded.paths = module.paths;
const nativeRequire = loaded.require.bind(loaded);
loaded.require = (name) =>
  name === "@/lib/contracts"
    ? require("./load-helper.cjs").load("contracts")
    : nativeRequire(name);
loaded._compile(
  ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText,
  file,
);
const route = loaded.exports;
let server;
let requests = [];
let invalidAuth = false;
const original = { api: process.env.API_URL, node: process.env.NODE_ENV };
const user = {
  id: "synthetic-user",
  email: "example@example.invalid",
  name: "Example",
  picture: null,
};
before(async () => {
  process.env.LUMI_PROXY_SECRET =
    "synthetic-proxy-test-key-at-least-32-characters";
  delete process.env.VERCEL;
  server = http.createServer(async (req, res) => {
    let body = "";
    for await (const chunk of req) body += chunk;
    const time = req.headers["x-lumi-proxy-time"];
    const ip = req.headers["x-lumi-client-ip"];
    const digest = crypto.createHash("sha256").update(body).digest("hex");
    const signature = crypto
      .createHmac("sha256", process.env.LUMI_PROXY_SECRET)
      .update([time, ip, req.method, req.url, digest].join("\n"))
      .digest("hex");
    assert.equal(req.headers["x-lumi-proxy-signature"], signature);
    requests.push({
      url: req.url,
      authorization: req.headers.authorization,
      body,
    });
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Set-Cookie", "upstream_secret=never-forward-this");
    if (
      req.url === "/auth/login" ||
      req.url === "/auth/register" ||
      req.url === "/auth/exchange"
    ) {
      res.end(
        JSON.stringify({
          token: "synthetic-jwt-private-to-server",
          user: invalidAuth ? { ...user, email: 42 } : user,
        }),
      );
    } else if (
      req.headers.authorization !== "Bearer synthetic-jwt-private-to-server"
    ) {
      res.statusCode = 401;
      res.end(JSON.stringify({ message: "expired" }));
    } else if (req.url === "/auth/me")
      res.end(
        JSON.stringify({
          ...user,
          authVersion: 7,
          googleId: "private-provider-subject",
        }),
      );
    else if (req.url === "/auth/logout")
      res.end(JSON.stringify({ message: "Closed" }));
    else
      res.end(JSON.stringify([{ id: "example-transaction", amount: "12.34" }]));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  process.env.API_URL = `http://127.0.0.1:${server.address().port}`;
  process.env.NODE_ENV = "production";
});
after(async () => {
  await new Promise((resolve) => server.close(resolve));
  for (const [key, value] of Object.entries({
    API_URL: original.api,
    NODE_ENV: original.node,
  })) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});
function request(
  endpoint,
  method = "GET",
  cookie = "",
  origin = "https://lumi.example",
) {
  const headers = { origin };
  if (cookie) headers.cookie = cookie;
  return new NextRequest(`https://lumi.example/api/backend/${endpoint}`, {
    method,
    headers,
    ...(method === "POST" ? { body: "{}" } : {}),
  });
}
function call(endpoint, method = "GET", cookie = "", origin) {
  return route[method](request(endpoint, method, cookie, origin), {
    params: Promise.resolve({ path: endpoint.split("?")[0].split("/") }),
  });
}
test("auth responses expose only a profile and set a secure HttpOnly same-origin cookie", async () => {
  for (const endpoint of ["auth/login", "auth/register", "auth/exchange"]) {
    const response = await call(endpoint, "POST");
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { user });
    const cookie = response.headers.get("set-cookie");
    assert.match(cookie, /lumi_session=synthetic-jwt-private-to-server/);
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /Secure/i);
    assert.match(cookie, /SameSite=lax/i);
    assert.ok(!cookie.includes("upstream_secret"));
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
});
test("cookie survives a new request, authenticates business reads and is cleared on logout/expiry", async () => {
  const cookie = "lumi_session=synthetic-jwt-private-to-server";
  const profile = await call("auth/me", "GET", cookie);
  assert.deepEqual(await profile.json(), user);
  const data = await call("transactions?month=1&year=2026", "GET", cookie);
  assert.equal(data.status, 200);
  assert.equal((await data.json())[0].amount, "12.34");
  assert.equal(
    requests.at(-1).authorization,
    "Bearer synthetic-jwt-private-to-server",
  );
  const logout = await call("auth/logout", "POST", cookie);
  assert.match(logout.headers.get("set-cookie"), /lumi_session=;.*Max-Age=0/i);
  const expired = await call("auth/me", "GET", "lumi_session=expired");
  assert.equal(expired.status, 401);
  assert.match(expired.headers.get("set-cookie"), /Max-Age=0/i);
  assert.equal((await call("transactions")).status, 401);
});
test("CSRF, missing Origin and unexpected proxy routes are rejected without reaching the API", async () => {
  const before = requests.length;
  assert.equal(
    (await call("auth/login", "POST", "", "https://attacker.example")).status,
    403,
  );
  const missing = request(
    "auth/logout",
    "POST",
    "lumi_session=synthetic-jwt-private-to-server",
  );
  missing.headers.delete("origin");
  assert.equal(
    (
      await route.POST(missing, {
        params: Promise.resolve({ path: ["auth", "logout"] }),
      })
    ).status,
    403,
  );
  assert.equal((await call("auth/google")).status, 404);
  assert.equal((await call("transactions/%2fexample")).status, 404);
  assert.equal(requests.length, before);
});

test("invalid authentication profile never sets a session cookie", async () => {
  invalidAuth = true;
  try {
    const response = await call("auth/login", "POST");
    assert.equal(response.status, 502);
    assert.equal(response.headers.get("set-cookie"), null);
  } finally {
    invalidAuth = false;
  }
});
