// An isolated admin service is mandatory; never read api/.env.
const { test } = require('node:test'),
  assert = require('node:assert/strict');
const { Client } = require('pg'),
  { execFile } = require('node:child_process'),
  { promisify } = require('node:util'),
  path = require('node:path');
const { localDatabase } = require('../scripts/local-database.cjs');
const { seedDemo, demoUrl } = require('../scripts/seed-demo.cjs');
test('demo guards reject hosted/implicit databases and seeding is repeatable without duplicates', async () => {
  const old = { ...process.env };
  let admin,
    created = false;
  try {
    process.env.LUMI_DEMO = 'true';
    process.env.LUMI_DEMO_DATABASE_URL =
      'postgresql://demo:demo@db.example.invalid/lumi_demo';
    delete process.env.RAILWAY_ENVIRONMENT_ID;
    delete process.env.VERCEL;
    process.env.NODE_ENV = 'test';
    assert.throws(() => demoUrl());
    delete process.env.LUMI_DEMO_DATABASE_URL;
    assert.throws(() => demoUrl());
    const base = localDatabase(process.env.TEST_DATABASE_URL);
    admin = new Client({ connectionString: base.href });
    await admin.connect();
    assert.equal(
      (
        await admin.query(
          "SELECT count(*)::int n FROM pg_database WHERE datname='lumi_demo'",
        )
      ).rows[0].n,
      0,
      'Test must not reuse an existing demo database',
    );
    await admin.query('CREATE DATABASE lumi_demo');
    created = true;
    const url = new URL(base);
    url.pathname = '/lumi_demo';
    await promisify(execFile)(
      process.execPath,
      [
        path.resolve(__dirname, '../node_modules/prisma/build/index.js'),
        'migrate',
        'deploy',
      ],
      {
        cwd: path.resolve(__dirname, '..'),
        env: { ...process.env, DATABASE_URL: url.href, DIRECT_URL: url.href },
        timeout: 90000,
      },
    );
    const c = new Client({ connectionString: url.href });
    await c.connect();
    try {
      async function snapshot() {
        const r = await c.query(
          'SELECT id,"userId","categoryId",amount::text,"date","paymentMethod","paymentDueDate" FROM "Transaction" ORDER BY id',
        );
        const counts = await c.query(
          'SELECT (SELECT count(*)::int FROM "User") users,(SELECT count(*)::int FROM "Reminder") reminders,(SELECT count(*)::int FROM "ReminderRule") rules',
        );
        return { transactions: r.rows, counts: counts.rows[0] };
      }
      await seedDemo(url.href, '2026-11');
      const first = await snapshot();
      assert.equal(first.transactions.length, 206);
      assert.equal(first.counts.users, 1);
      assert.equal(first.counts.rules, 3);
      assert.equal(first.counts.reminders, 39);
      await seedDemo(url.href, '2026-11');
      assert.deepEqual(await snapshot(), first);
    } finally {
      await c.end();
    }
  } finally {
    process.env = old;
    if (admin) {
      if (created) await admin.query('DROP DATABASE lumi_demo WITH (FORCE)');
      await admin.end();
    }
  }
});
