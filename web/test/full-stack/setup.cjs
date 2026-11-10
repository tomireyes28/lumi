/* eslint-disable @typescript-eslint/no-require-imports */
const path = require("node:path"),
  crypto = require("node:crypto"),
  net = require("node:net");
const { spawn, execFile } = require("node:child_process"),
  { promisify } = require("node:util");
const api = path.resolve(__dirname, "../../../api"),
  web = path.resolve(__dirname, "../..");
const { Client } = require(path.join(api, "node_modules/pg"));
const { PrismaClient } = require(path.join(api, "node_modules/@prisma/client"));
const { PrismaPg } = require(path.join(api, "node_modules/@prisma/adapter-pg"));
const bcrypt = require(path.join(api, "node_modules/bcrypt"));
const { localDatabase } = require(path.join(api, "scripts/local-database.cjs"));
const secret = "synthetic-browser-proxy-secret-at-least-32-characters";
async function free(port) {
  await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => server.close(resolve));
  });
}
async function ready(url, child) {
  for (let i = 0; i < 80; i++) {
    if (child.exitCode !== null)
      throw Error("Isolated server exited before readiness");
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(1000) });
      if (r.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw Error("Isolated server readiness timeout");
}
module.exports = async () => {
  const adminUrl = localDatabase(process.env.TEST_DATABASE_URL);
  await free(3102);
  await free(3103);
  const admin = new Client({ connectionString: adminUrl.href });
  await admin.connect();
  const name = "lumi_test_browser_" + crypto.randomBytes(8).toString("hex");
  const url = new URL(adminUrl.href);
  url.pathname = "/" + name;
  let created = false,
    apiChild,
    webChild;
  async function stop(child) {
    if (!child || child.exitCode !== null) return;
    await new Promise((resolve) => {
      child.once("exit", resolve);
      child.kill();
      setTimeout(resolve, 5000).unref();
    });
  }
  async function cleanup() {
    await stop(webChild);
    await stop(apiChild);
    if (created) {
      localDatabase(url.href, /^\/lumi_test_browser_[a-f0-9]+$/);
      await admin.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
      created = false;
    }
    await admin.end();
  }
  try {
    await admin.query(`CREATE DATABASE "${name}"`);
    created = true;
    await promisify(execFile)(
      process.execPath,
      [
        path.join(api, "node_modules/prisma/build/index.js"),
        "migrate",
        "deploy",
      ],
      {
        cwd: api,
        env: { ...process.env, DATABASE_URL: url.href, DIRECT_URL: url.href },
        timeout: 90000,
      },
    );
    const prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: url.href }),
    });
    try {
      const today = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Argentina/Buenos_Aires",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());
      const password = await bcrypt.hash("Lumi-e2e-synthetic-2026!", 10);
      for (const surface of ["desktop", "mobile"]) {
        const user = await prisma.user.create({
          data: {
            name: "E2E " + surface,
            email: `e2e-${surface}@example.invalid`,
            password,
          },
        });
        const category = await prisma.category.create({
          data: {
            userId: user.id,
            name: "Fixture cotidiano",
            type: "expense",
            colorHex: "#64748b",
            icon: "ShoppingCart",
          },
        });
        await prisma.transaction.createMany({
          data: Array.from({ length: 201 }, (_, i) => ({
            userId: user.id,
            categoryId: category.id,
            amount: "1.00",
            paymentMethod: "cash",
            date: new Date(today + "T15:00:00Z"),
            note: `Fixture cotidiano ${i}`,
          })),
        });
      }
    } finally {
      await prisma.$disconnect();
    }
    const environment = {
      ...process.env,
      DATABASE_URL: url.href,
      DIRECT_URL: url.href,
      NODE_ENV: "test",
      JWT_SECRET: "synthetic-browser-jwt-secret-at-least-32-characters",
      LUMI_PROXY_SECRET: secret,
      RESEND_API_KEY: "",
      RESEND_FROM_EMAIL: "",
      FRONTEND_URL: "http://localhost:3102",
    };
    apiChild = spawn(
      process.execPath,
      [path.join(api, "scripts/browser-test-api.cjs")],
      { cwd: api, env: environment, stdio: "ignore", windowsHide: true },
    );
    await ready("http://127.0.0.1:3103/health", apiChild);
    webChild = spawn(
      process.execPath,
      [
        path.join(web, "node_modules/next/dist/bin/next"),
        "start",
        "-p",
        "3102",
        "--hostname",
        "localhost",
      ],
      {
        cwd: web,
        env: {
          ...process.env,
          NODE_ENV: "production",
          API_URL: "http://127.0.0.1:3103",
          NEXT_PUBLIC_API_URL: "http://127.0.0.1:3103",
          NEXT_PUBLIC_SITE_URL: "http://localhost:3102",
          LUMI_PROXY_SECRET: secret,
        },
        stdio: "ignore",
        windowsHide: true,
      },
    );
    await ready("http://localhost:3102", webChild);
    console.log(
      "Full-stack fixture ready: isolated PostgreSQL + Nest + Next BFF; email disabled",
    );
    return cleanup;
  } catch (error) {
    await cleanup();
    throw error;
  }
};
