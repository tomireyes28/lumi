// These tests intentionally refuse remote databases and never load api/.env.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { execFile, spawn } = require('node:child_process');
const { promisify } = require('node:util');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const {
  inspectDatabase,
  checksums,
  releaseIssues,
} = require('../scripts/db-preflight.cjs');

const root = path.resolve(__dirname, '..');
const migrations = path.join(root, 'prisma/migrations');
const execute = promisify(execFile);
const created = new Set();
let admin;
let sandbox;
let adminUrl;

function isolatedUrl(value) {
  assert.ok(
    value,
    'Set TEST_DATABASE_URL explicitly; production URLs are never a fallback',
  );
  const url = new URL(value);
  assert.ok(
    ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname),
    'Tests require loopback PostgreSQL',
  );
  assert.match(url.pathname, /^\/lumi_test_[a-z0-9_]+$/);
  return url;
}

before(async () => {
  adminUrl = isolatedUrl(process.env.TEST_DATABASE_URL);
  admin = new Client({ connectionString: adminUrl.href });
  await admin.connect();
  sandbox = await fs.mkdtemp(path.join(os.tmpdir(), 'lumi-migrations-'));
});

after(async () => {
  if (admin) {
    for (const name of created) {
      // Names are generated here, never accepted from a caller or environment.
      assert.match(name, /^lumi_test_[a-f0-9]+$/);
      await admin.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
    }
    await admin.end();
  }
  if (sandbox) await fs.rm(sandbox, { recursive: true, force: true });
});

async function database() {
  const name = `lumi_test_${crypto.randomBytes(8).toString('hex')}`;
  await admin.query(`CREATE DATABASE "${name}"`);
  created.add(name);
  const url = new URL(adminUrl.href);
  url.pathname = `/${name}`;
  return url.href;
}

async function deploy(url, baseline = false) {
  const dir = await fs.mkdtemp(path.join(sandbox, 'config-'));
  let migrationPath = migrations;
  if (baseline) {
    migrationPath = path.join(dir, 'migrations');
    await fs.mkdir(migrationPath);
    await fs.copyFile(
      path.join(migrations, 'migration_lock.toml'),
      path.join(migrationPath, 'migration_lock.toml'),
    );
    for (const name of (await fs.readdir(migrations))
      .filter((n) => /^2026(04|05|10)/.test(n))
      .sort()) {
      await fs.cp(path.join(migrations, name), path.join(migrationPath, name), {
        recursive: true,
      });
    }
  }
  const config = path.join(dir, 'prisma.config.cjs');
  await fs.writeFile(
    config,
    `const { defineConfig } = require(${JSON.stringify(require.resolve('prisma/config'))});
module.exports = defineConfig({ schema: ${JSON.stringify(path.join(root, 'prisma/schema.prisma'))},
migrations: { path: ${JSON.stringify(migrationPath)} }, datasource: { url: process.env.TEST_DATABASE_URL } });`,
  );
  await execute(
    process.execPath,
    [
      path.join(root, 'node_modules/prisma/build/index.js'),
      'migrate',
      'deploy',
      '--config',
      config,
    ],
    {
      cwd: root,
      env: {
        ...process.env,
        TEST_DATABASE_URL: url,
        DATABASE_URL: url,
        DIRECT_URL: url,
      },
      timeout: 90000,
    },
  );
}

async function withSql(url, fn) {
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

async function seedLegacy(client) {
  await client.query(`
    INSERT INTO "User" (id,name,email) VALUES ('legacy-user','Synthetic example','migration@example.invalid');
    INSERT INTO "Category" (id,"userId",name,type) VALUES ('expense','legacy-user','Example expense','expense');
    INSERT INTO "CreditCard" (id,alias,"lastFour","limit","closingDay","dueDay","userId","updatedAt")
      VALUES ('card','Example card','1234',10000,25,5,'legacy-user',now());
    INSERT INTO "Transaction" (id,"userId","categoryId",amount,"creditCardId","installmentGroupId") VALUES
      ('card-tx','legacy-user','expense',123.45,'card','plan'), ('cash-tx','legacy-user','expense',10.01,NULL,NULL);
    INSERT INTO "Reminder" (id,title,amount,"dueDate","userId","updatedAt") VALUES
      ('reminder','Example reminder',120.99,'2026-12-01','legacy-user',now()),
      ('optional','No amount',NULL,'2026-12-02','legacy-user',now());
    INSERT INTO "Budget" (id,"userId","categoryId",amount,"updatedAt") VALUES ('budget','legacy-user','expense',500.50,now());
    INSERT INTO "CardCycle" (id,"creditCardId",month,year,"closingDate","dueDate","updatedAt")
      VALUES ('cycle','card',12,2026,'2026-12-25','2027-01-05',now());
  `);
}

test('fresh installation and repeat migrate deploy leave matching, complete history', async () => {
  const originalMaySql = await fs.readFile(
    path.join(
      migrations,
      '20260503052146_add_email_password_to_user/migration.sql',
    ),
    'utf8',
  );
  assert.ok(
    checksums(originalMaySql).has(
      '9c1e7fa14e4908c0790b9999b9548f38235af4161321f9e9600b44260585e60d',
    ),
    'Keep the migration that production actually applied',
  );
  const url = await database();
  await deploy(url);
  await deploy(url);
  const report = await withSql(url, inspectDatabase);
  assert.equal(report.session.read_only, 'on');
  assert.deepEqual(report.migrations.pending, []);
  assert.ok(report.migrations.history.length >= 7);
  assert.ok(
    report.migrations.history.every(
      (m) => m.finished && m.local_checksum_matches,
    ),
  );
  await withSql(url, async (client) => {
    await client.query(
      `INSERT INTO _prisma_migrations (id,checksum,migration_name,rolled_back_at)
      VALUES ('synthetic-rolled-back-attempt',$1,'20261028230000_add_budgets_card_cycles_and_indexes',now())`,
      ['f'.repeat(64)],
    );
    const withRevertedAttempt = await inspectDatabase(client);
    assert.deepEqual(releaseIssues(withRevertedAttempt), []);
    assert.ok(
      withRevertedAttempt.migrations.history.some(
        (m) => m.rolled_back && !m.local_checksum_matches,
      ),
    );
  });
});

test('upgrade preserves legacy values and enforces real Prisma/PostgreSQL behavior', async () => {
  const url = await database();
  await deploy(url, true);
  await withSql(url, seedLegacy);
  await deploy(url);
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url }),
  });
  try {
    const txs = await prisma.transaction.findMany({ orderBy: { id: 'asc' } });
    assert.deepEqual(
      txs.map((t) => [t.id, t.amount.toFixed(2), t.paymentMethod]),
      [
        ['card-tx', '123.45', 'credit_card'],
        ['cash-tx', '10.01', 'cash'],
      ],
    );
    assert.equal(txs[0].installmentGroupId, 'plan');
    const reminder = await prisma.reminder.findUniqueOrThrow({
      where: { id: 'reminder' },
    });
    assert.equal(reminder.amount.toFixed(2), '120.99');
    assert.equal(reminder.isRecurring, false);
    assert.equal(
      (await prisma.reminder.findUniqueOrThrow({ where: { id: 'optional' } }))
        .amount,
      null,
    );
    assert.equal(
      (
        await prisma.budget.findUniqueOrThrow({ where: { id: 'budget' } })
      ).amount.toFixed(2),
      '500.50',
    );
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: 'legacy-user' },
    });
    assert.equal(user.googleId, null);
    assert.equal(user.emailVerified, false);
    await prisma.user.update({
      where: { id: user.id },
      data: { googleId: 'synthetic-google-subject', emailVerified: true },
    });
    await assert.rejects(
      prisma.user.create({
        data: {
          name: 'Duplicate',
          email: 'duplicate@example.invalid',
          googleId: 'synthetic-google-subject',
        },
      }),
      { code: 'P2002' },
    );
    await assert.rejects(prisma.category.delete({ where: { id: 'expense' } }), {
      code: 'P2003',
    });
    await assert.rejects(
      prisma.cardCycle.create({
        data: {
          creditCardId: 'card',
          month: 12,
          year: 2026,
          closingDate: new Date('2026-12-20'),
        },
      }),
      { code: 'P2002' },
    );
    await assert.rejects(
      prisma.budget.create({
        data: { userId: user.id, categoryId: 'expense', amount: 1 },
      }),
      { code: 'P2002' },
    );
    const inserted = await prisma.transaction.create({
      data: {
        userId: user.id,
        categoryId: 'expense',
        creditCardId: 'card',
        amount: 1.23,
      },
    });
    assert.equal(inserted.paymentMethod, 'credit_card');
    await prisma.creditCard.delete({ where: { id: 'card' } });
    const retained = await prisma.transaction.findUniqueOrThrow({
      where: { id: 'card-tx' },
    });
    assert.equal(retained.creditCardId, null);
    assert.equal(retained.paymentMethod, 'credit_card');
    assert.equal(retained.amount.toFixed(2), '123.45');
  } finally {
    await prisma.$disconnect();
  }
  const report = await withSql(url, inspectDatabase);
  const column = report.columns.find(
    (c) => c.table_name === 'Reminder' && c.column_name === 'amount',
  );
  assert.equal(column.numeric_precision, 10);
  assert.equal(column.numeric_scale, 2);
  assert.deepEqual(report.migrations.pending, []);
});

test('read-only preflight detects legacy precision problems without changing amounts', async () => {
  const url = await database();
  await deploy(url, true);
  await withSql(url, async (client) => {
    await seedLegacy(client);
    await client.query(
      `UPDATE "Reminder" SET amount=1.234 WHERE id='reminder'`,
    );
    await client.query(
      `UPDATE "Reminder" SET amount=100000000 WHERE id='optional'`,
    );
    const before = (
      await client.query('SELECT id,amount::text FROM "Reminder" ORDER BY id')
    ).rows;
    const report = await inspectDatabase(client);
    assert.equal(report.dataChecks.Reminder_amount_requires_rounding, 1);
    assert.equal(report.dataChecks.Reminder_amount_overflows_decimal_10_2, 1);
    assert.deepEqual(
      (await client.query('SELECT id,amount::text FROM "Reminder" ORDER BY id'))
        .rows,
      before,
    );
    await client.query('BEGIN READ ONLY');
    await assert.rejects(client.query('DELETE FROM "Reminder"'), {
      code: '25006',
    });
    await client.query('ROLLBACK');
  });
});

test('a synthetic backup restores data, schema, trigger and migration history', async () => {
  const container = process.env.TEST_POSTGRES_CONTAINER;
  assert.match(
    container || '',
    /^(lumi-stage1-postgres(?:16|17)|[a-f0-9]{12,64})$/,
    'Set TEST_POSTGRES_CONTAINER to the disposable test container',
  );
  const source = await database();
  const target = await database();
  await deploy(source, true);
  await withSql(source, seedLegacy);
  await deploy(source);
  const sourceName = new URL(source).pathname.slice(1);
  const targetName = new URL(target).pathname.slice(1);
  const username = decodeURIComponent(adminUrl.username);
  // Uses the matching server's pg_dump, not the host's potentially older binary.
  const { stdout: dump } = await execute(
    'docker',
    [
      'exec',
      container,
      'pg_dump',
      '-U',
      username,
      '-d',
      sourceName,
      '--format=custom',
      '--no-owner',
      '--no-acl',
    ],
    { encoding: 'buffer', maxBuffer: 10 * 1024 * 1024 },
  );
  await new Promise((resolve, reject) => {
    const child = spawn(
      'docker',
      [
        'exec',
        '-i',
        container,
        'pg_restore',
        '-U',
        username,
        '-d',
        targetName,
        '--exit-on-error',
        '--no-owner',
        '--no-acl',
      ],
      { stdio: ['pipe', 'ignore', 'pipe'] },
    );
    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.once('error', reject);
    child.once('close', (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`Synthetic restore failed: ${stderr}`)),
    );
    child.stdin.on('error', reject);
    child.stdin.end(dump);
  });
  await withSql(target, async (client) => {
    assert.equal(
      (
        await client.query(
          'SELECT sum(amount)::text AS total FROM "Transaction"',
        )
      ).rows[0].total,
      '133.46',
    );
    assert.equal(
      (
        await client.query(
          'SELECT amount::text FROM "Reminder" WHERE id=\'reminder\'',
        )
      ).rows[0].amount,
      '120.99',
    );
    assert.equal(
      (await client.query('SELECT count(*)::int AS count FROM "CardCycle"'))
        .rows[0].count,
      1,
    );
    assert.equal(
      (
        await client.query(
          "SELECT count(*)::int AS count FROM pg_trigger WHERE tgname='trg_sync_transaction_payment_method'",
        )
      ).rows[0].count,
      1,
    );
    const report = await inspectDatabase(client);
    assert.deepEqual(report.migrations.pending, []);
    assert.ok(
      report.migrations.history.every(
        (m) => m.finished && m.local_checksum_matches,
      ),
    );
  });
  await deploy(target);
});
