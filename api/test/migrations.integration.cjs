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
require('reflect-metadata');
const { JwtService } = require('@nestjs/jwt');
const { AuthService } = require('../dist/src/auth/auth.service.js');
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
  assert.ok(['postgres:', 'postgresql:'].includes(url.protocol));
  assert.equal(
    url.search,
    '',
    'Query options could override the validated connection host',
  );
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
  if (sandbox) {
    const resolved = await fs.realpath(sandbox);
    assert.equal(path.dirname(resolved), await fs.realpath(os.tmpdir()));
    assert.match(path.basename(resolved), /^lumi-migrations-[a-z0-9]+$/i);
    await fs.rm(resolved, { recursive: true, force: true });
  }
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
    assert.ok(txs.every(t=>t.purchaseDate===null&&t.statementMonth===null&&t.statementYear===null&&t.paymentDueDate===null&&t.statementClosingDate===null));
    const reminder = await prisma.reminder.findUniqueOrThrow({
      where: { id: 'reminder' },
    });
    assert.equal(reminder.amount.toFixed(2), '120.99');
    assert.equal(reminder.isRecurring, false);
    assert.equal(reminder.dueDate.toISOString(),'2026-12-01T00:00:00.000Z');
    assert.equal(reminder.dueOn.toISOString(),'2026-12-01T00:00:00.000Z');
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

test('Supabase API roles lose direct access while Prisma retains CRUD and future tables stay private', async () => {
  // This cluster is disposable. The migration itself never creates or alters roles.
  await admin.query(`DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN NOBYPASSRLS; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN NOBYPASSRLS; END IF;
  END $$;`);
  const url = await database();
  await deploy(url, true);
  await withSql(url, async (client) => {
    await seedLegacy(client);
    // Reproduce the observed grants, including global + per-schema defaults.
    await client.query(`GRANT ALL ON ALL TABLES IN SCHEMA public TO PUBLIC, anon, authenticated;
      ALTER DEFAULT PRIVILEGES GRANT ALL ON TABLES TO PUBLIC, anon, authenticated;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO PUBLIC, anon, authenticated;`);
    const before = await inspectDatabase(client);
    assert.ok(
      before.permissions.every(
        (p) => p.can_select && p.can_insert && !p.rls_enabled,
      ),
    );
    assert.ok(
      releaseIssues(before).includes('Public roles still have database access'),
    );
  });
  await deploy(url);
  await deploy(url); // Migration bookkeeping still works with RLS on its own table.
  await withSql(url, async (client) => {
    const report = await inspectDatabase(client);
    assert.equal(report.permissions.length, 22);
    assert.deepEqual(releaseIssues(report), []);
    assert.ok(
      report.permissions.every(
        (p) =>
          p.rls_enabled &&
          !p.force_rls &&
          !p.can_select &&
          !p.can_insert &&
          !p.can_update &&
          !p.can_delete,
      ),
    );
    assert.deepEqual(report.defaultPublicGrants, []);
    for (const role of ['anon', 'authenticated']) {
      await client.query(`SET ROLE "${role}"`);
      try {
        for (const table of new Set(
          report.permissions.map((p) => p.table_name),
        )) {
          await assert.rejects(
            client.query(`SELECT * FROM public."${table}" LIMIT 1`),
            { code: '42501' },
          );
        }
        await assert.rejects(
          client.query(
            `INSERT INTO "User" (id,name,email) VALUES ('intruder','Synthetic','intruder@example.invalid')`,
          ),
          { code: '42501' },
        );
        await assert.rejects(
          client.query(
            `UPDATE "User" SET name='Changed' WHERE id='legacy-user'`,
          ),
          { code: '42501' },
        );
        await assert.rejects(
          client.query(`DELETE FROM "User" WHERE id='legacy-user'`),
          { code: '42501' },
        );
        await assert.rejects(client.query(`TRUNCATE "Transaction"`), {
          code: '42501',
        });
      } finally {
        await client.query('RESET ROLE');
      }
    }
    // RLS is a second barrier if someone accidentally re-grants table access.
    await client.query('GRANT SELECT,INSERT ON "User" TO anon');
    await client.query('SET ROLE anon');
    try {
      assert.deepEqual((await client.query('SELECT * FROM "User"')).rows, []);
      await assert.rejects(
        client.query(
          `INSERT INTO "User" (id,name,email) VALUES ('intruder','Synthetic','intruder@example.invalid')`,
        ),
        { code: '42501' },
      );
    } finally {
      await client.query('RESET ROLE');
    }
    await client.query('REVOKE ALL ON "User" FROM anon');
    await client.query(
      'CREATE TABLE "FuturePrivateTable" (id text PRIMARY KEY)',
    );
    for (const role of ['anon', 'authenticated']) {
      assert.equal(
        (
          await client.query(
            "SELECT has_table_privilege($1, 'public.\"FuturePrivateTable\"', 'SELECT') AS allowed",
            [role],
          )
        ).rows[0].allowed,
        false,
      );
    }
  });
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url }),
  });
  try {
    assert.equal((await prisma.transaction.findMany()).length, 2);
    const user = await prisma.user.create({
      data: { name: 'Owner access', email: 'owner@example.invalid' },
    });
    assert.equal(
      (
        await prisma.user.update({
          where: { id: user.id },
          data: { name: 'Updated owner access' },
        })
      ).name,
      'Updated owner access',
    );
    await prisma.user.delete({ where: { id: user.id } });
    assert.equal(
      await prisma.user.findUnique({ where: { id: user.id } }),
      null,
    );
  } finally {
    await prisma.$disconnect();
  }
});

test('sessions survive service reconstruction and logout revokes access across instances', async () => {
  const url = await database();
  await deploy(url);
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url }),
  });
  const jwt = new JwtService();
  process.env.JWT_SECRET =
    'synthetic-integration-secret-at-least-32-characters';
  try {
    const password = await require('bcrypt').hash('Synthetic-password-123', 10);
    await prisma.user.create({
      data: {
        name: 'Session test',
        email: 'session@example.invalid',
        password,
      },
    });
    const a = new AuthService(prisma, jwt);
    const signed = await a.login({
      email: 'session@example.invalid',
      password: 'Synthetic-password-123',
    });
    const payload = jwt.verify(signed.token, {
      secret: process.env.JWT_SECRET,
    });
    const b = new AuthService(prisma, jwt);
    await b.validateSession(payload);
    await a.revokeToken(payload.jti);
    await assert.rejects(
      new AuthService(prisma, jwt).validateSession(payload),
      { status: 401 },
    );
    await assert.rejects(b.validateSession(payload), { status: 401 });
    await assert.rejects(
      b.validateSession({ sub: payload.sub, email: payload.email }),
      { status: 401 },
    );
    const old = await a.login({
      email: 'session@example.invalid',
      password: 'Synthetic-password-123',
    });
    const linked = await b.googleLogin({
      googleId: 'synthetic-google-owner',
      email: 'session@example.invalid',
      name: 'Owner',
      emailVerified: true,
    });
    await assert.rejects(
      a.validateSession(
        jwt.verify(old.token, { secret: process.env.JWT_SECRET }),
      ),
      { status: 401 },
    );
    await a.validateSession(
      jwt.verify(linked, { secret: process.env.JWT_SECRET }),
    );
    await prisma.authSession.create({
      data: {
        id: 'late-old-login',
        userId: payload.sub,
        expiresAt: new Date(Date.now() + 60000),
        authVersion: 0,
      },
    });
    await assert.rejects(
      a.validateSession({ ...payload, jti: 'late-old-login' }),
      { status: 401 },
    );
    await assert.rejects(
      a.googleLogin({
        googleId: 'synthetic-google-owner',
        email: 'session@example.invalid',
        name: 'Owner',
      }),
      { status: 401 },
    );
    await assert.rejects(
      a.googleLogin({
        email: 'session@example.invalid',
        name: 'Owner',
        emailVerified: true,
      }),
      { status: 401 },
    );
    await assert.rejects(
      a.googleLogin({
        googleId: 'different-subject',
        email: 'session@example.invalid',
        name: 'Owner',
        emailVerified: true,
      }),
      { status: 401 },
    );
  } finally {
    await prisma.$disconnect();
  }
});

test('OAuth grants can be exchanged on another instance only once under concurrency', async () => {
  const url = await database();
  await deploy(url);
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url }),
  });
  const { OAuthGrantStore } = require('../dist/src/auth/oauth-grant.store.js');
  const {
    OAuthStateStore,
  } = require('../dist/src/auth/strategies/oauth-state.store.js');
  process.env.JWT_SECRET =
    'synthetic-integration-secret-at-least-32-characters';
  try {
    const a = new AuthService(prisma, new JwtService());
    const b = new AuthService(prisma, new JwtService());
    const token = await a.googleLogin({
      googleId: 'oauth-test-subject',
      email: 'oauth@example.invalid',
      emailVerified: true,
      name: 'Synthetic',
    });
    const code = await a.createOAuthExchangeCode(token, 'browser-binding');
    assert.equal(
      await prisma.oAuthGrant.findUnique({ where: { id: code } }),
      null,
    );
    const attempts = await Promise.allSettled([
      a.exchangeOAuthCode(code, 'browser-binding'),
      b.exchangeOAuthCode(code, 'browser-binding'),
    ]);
    assert.equal(attempts.filter((r) => r.status === 'fulfilled').length, 1);
    const wrong = await a.createOAuthExchangeCode(token, 'browser-binding');
    await assert.rejects(b.exchangeOAuthCode(wrong, 'wrong-browser'), {
      status: 401,
    });
    await assert.rejects(a.exchangeOAuthCode(wrong, 'browser-binding'), {
      status: 401,
    });
    const expired = await a.createOAuthExchangeCode(token, 'browser-binding');
    await prisma.oAuthGrant.updateMany({ data: { expiresAt: new Date(0) } });
    await assert.rejects(b.exchangeOAuthCode(expired, 'browser-binding'), {
      status: 401,
    });
    const first = new OAuthStateStore(new OAuthGrantStore(prisma));
    const second = new OAuthStateStore(new OAuthGrantStore(prisma));
    let cookie = '';
    let state = '';
    await first.store(
      {
        query: { client_state: 'browser' },
        res: {
          appendHeader: (_n, v) => {
            cookie = v.split(';')[0];
          },
        },
      },
      'private-pkce-verifier',
      undefined,
      undefined,
      (err, s) => {
        assert.equal(err, null);
        state = s;
      },
    );
    assert.ok(state.length > 30);
    assert.ok(!state.includes('private-pkce-verifier'));
    const verify = (store, headers) =>
      new Promise((resolve) =>
        store.verify(
          { headers, res: { appendHeader: () => {} } },
          state,
          undefined,
          (err, ok) => resolve({ err, ok }),
        ),
      );
    assert.equal((await verify(second, {})).ok, false);
    assert.equal(
      (await verify(second, { cookie: 'lumi_oauth_state=wrong' })).ok,
      false,
    );
    const consumed = await Promise.all([
      verify(first, { cookie }),
      verify(second, { cookie }),
    ]);
    assert.equal(
      consumed.filter((r) => r.ok === 'private-pkce-verifier').length,
      1,
    );
    assert.equal((await verify(second, { cookie })).ok, false);
    await a.cleanupExpiredSecurityState();
  } finally {
    await prisma.$disconnect();
  }
});

test('shared rate limits are atomic across instances, expire and fail closed', async () => {
  const url = await database();
  await deploy(url);
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url }),
  });
  const {
    PostgresThrottlerStorage,
  } = require('../dist/src/security/postgres-throttler.storage.js');
  try {
    const a = new PostgresThrottlerStorage(prisma),
      b = new PostgresThrottlerStorage(prisma);
    const attempts = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        (i % 2 ? a : b).increment(
          'synthetic-shared-key',
          60000,
          10,
          60000,
          'default',
        ),
      ),
    );
    assert.equal(attempts.filter((r) => !r.isBlocked).length, 10);
    assert.equal(
      (
        await new PostgresThrottlerStorage(prisma).increment(
          'synthetic-shared-key',
          60000,
          10,
          60000,
          'default',
        )
      ).isBlocked,
      true,
    );
    await prisma.rateLimitBucket.update({
      where: { id: 'synthetic-shared-key' },
      data: { blockedUntil: new Date(0), resetsAt: new Date(0) },
    });
    const fresh = await b.increment(
      'synthetic-shared-key',
      60000,
      10,
      60000,
      'default',
    );
    assert.equal(fresh.isBlocked, false);
    assert.equal(fresh.totalHits, 1);
    await prisma.rateLimitBucket.create({
      data: { id: 'expired-only', hits: 1, resetsAt: new Date(0) },
    });
    await a.cleanup();
    assert.equal(
      await prisma.rateLimitBucket.findUnique({
        where: { id: 'expired-only' },
      }),
      null,
    );
    assert.ok(
      await prisma.rateLimitBucket.findUnique({
        where: { id: 'synthetic-shared-key' },
      }),
    );
    await prisma.$executeRawUnsafe('DROP TABLE "RateLimitBucket"');
    await assert.rejects(
      b.increment('fail-closed', 60000, 10, 60000, 'default'),
      { status: 503 },
    );
  } finally {
    await prisma.$disconnect();
  }
});

test('real HTTP API verifies proxy signatures and shares the credentials limit', async () => {
  const url = await database();
  await deploy(url);
  const env = {
    DATABASE_URL: url,
    DIRECT_URL: url,
    NODE_ENV: 'test',
    JWT_SECRET: 'synthetic-http-secret-at-least-32-characters',
    LUMI_PROXY_SECRET: 'synthetic-http-proxy-secret-at-least-32-characters',
    GOOGLE_CLIENT_ID: 'synthetic',
    GOOGLE_CLIENT_SECRET: 'synthetic',
    GOOGLE_CALLBACK_URL: 'http://localhost/auth/google/callback',
    RESEND_API_KEY: '',
  };
  const saved = Object.fromEntries(
    Object.keys(env).map((k) => [k, process.env[k]]),
  );
  Object.assign(process.env, env);
  const { NestFactory } = require('@nestjs/core');
  const { ValidationPipe } = require('@nestjs/common');
  const { AppModule } = require('../dist/src/app.module.js');
  let app;
  try {
    app = await NestFactory.create(AppModule, { logger: false, rawBody: true });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.listen(0, '127.0.0.1');
    const origin = await app.getUrl();
    async function call(endpoint, body, token, extra = {}) {
      const method = body === undefined ? 'GET' : 'POST';
      const raw = body === undefined ? '' : JSON.stringify(body);
      const time = String(Date.now()),
        ip = '203.0.113.40';
      const digest = crypto.createHash('sha256').update(raw).digest('hex');
      const signature = crypto
        .createHmac('sha256', env.LUMI_PROXY_SECRET)
        .update([time, ip, method, endpoint, digest].join('\n'))
        .digest('hex');
      return fetch(origin + endpoint, {
        method,
        body: body === undefined ? undefined : raw,
        headers: {
          'Content-Type': 'application/json',
          'x-lumi-client-ip': ip,
          'x-lumi-proxy-time': time,
          'x-lumi-proxy-signature': signature,
          ...(token ? { Authorization: 'Bearer ' + token } : {}),
          ...extra,
        },
        signal: AbortSignal.timeout(10000),
      });
    }
    const registration = await call('/auth/register', {
      name: 'HTTP synthetic',
      email: 'http@example.invalid',
      password: 'Synthetic-password-123',
    });
    assert.equal(registration.status, 201);
    const { token } = await registration.json();
    assert.ok(token);
    assert.equal((await call('/auth/me', undefined, token)).status, 200);
    assert.equal(
      (
        await call('/auth/me', undefined, undefined, {
          Cookie: 'lumi_session=' + token,
        })
      ).status,
      401,
    );
    assert.equal(
      (
        await call('/auth/me', undefined, token, {
          'x-lumi-client-ip': '203.0.113.99',
        })
      ).status,
      401,
    );
    for (let i = 0; i < 10; i++) {
      const response = await call(
        '/auth/login',
        { email: 'absent@example.invalid', password: 'Wrong-password-123' },
        undefined,
        { 'x-forwarded-for': '203.0.113.' + (100 + i) },
      );
      assert.equal(response.status, i === 9 ? 429 : 401);
    }
    assert.equal((await call('/auth/logout', {}, token)).status, 200);
    assert.equal((await call('/auth/me', undefined, token)).status, 401);
  } finally {
    if (app) await app.close();
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test('explicit statement and payment dates agree across cards, installments and forecast',async()=>{
 const url=await database();await deploy(url);const prisma=new PrismaClient({adapter:new PrismaPg({connectionString:url})});
 const {TransactionsService}=require('../dist/src/transactions/transactions.service.js');const {CreditCardsService}=require('../dist/src/credit-cards/credit-cards.service.js');const {AnalyticsService}=require('../dist/src/analytics/analytics.service.js');
 const {parseLocalDate}=require('../dist/src/utils/date.util.js');
 try{
 const user=await prisma.user.create({data:{name:'Financial fixture',email:'finance@example.invalid'}});
 const category=await prisma.category.create({data:{userId:user.id,name:'Expense',type:'expense'}});
 const card=await prisma.creditCard.create({data:{userId:user.id,alias:'Synthetic card',lastFour:'1234',limit:10000,closingDay:25,dueDay:5}});
 await prisma.cardCycle.create({data:{creditCardId:card.id,year:2026,month:2,closingDate:parseLocalDate('2026-02-10'),dueDate:parseLocalDate('2026-03-07')}});
 const service=new TransactionsService(prisma);const cards=new CreditCardsService(prisma);
 const first=await service.create({amount:100,installments:3,date:'2026-01-20',categoryId:category.id,creditCardId:card.id},user.id);
 const rows=await prisma.transaction.findMany({where:{installmentGroupId:first.installmentGroupId},orderBy:{installmentNumber:'asc'}});
 assert.deepEqual(rows.map(t=>[t.statementYear,t.statementMonth,t.paymentDueDate.toISOString().slice(0,10)]),[[2026,1,'2026-02-05'],[2026,2,'2026-03-07'],[2026,3,'2026-04-05']]);
 assert.ok(rows.every(t=>t.purchaseDate.toISOString()==='2026-01-20T15:00:00.000Z'));
 const wallet=await cards.findAllByUser(user.id,parseLocalDate('2026-02-03'));assert.equal(wallet[0].consumed,33.33);assert.equal(wallet[0].currentCycle.month,2);
 const forecast=await new AnalyticsService(prisma).getForecast(user.id,4,parseLocalDate('2026-01-01'));
 assert.deepEqual(forecast.forecastTimeline.map(t=>t.installmentExpenses),[0,33.34,33.33,33.33]);
 const snapshot=JSON.stringify(rows.map(t=>[t.id,t.amount.toFixed(2),t.purchaseDate,t.statementClosingDate,t.paymentDueDate]));
 await cards.update(card.id,{closingDay:15,dueDay:10},user.id);
 await cards.upsertCycle(card.id,{year:2026,month:2,closingDate:'2026-02-08',dueDate:'2026-02-22'},user.id);
 const unchanged=await prisma.transaction.findMany({where:{installmentGroupId:first.installmentGroupId},orderBy:{installmentNumber:'asc'}});
 assert.equal(JSON.stringify(unchanged.map(t=>[t.id,t.amount.toFixed(2),t.purchaseDate,t.statementClosingDate,t.paymentDueDate])),snapshot);
 const next=await service.create({amount:1,date:'2026-02-03',categoryId:category.id,creditCardId:card.id},user.id);
 assert.equal(next.statementClosingDate.toISOString().slice(0,10),'2026-02-08');assert.equal(next.paymentDueDate.toISOString().slice(0,10),'2026-02-22');
 }finally{await prisma.$disconnect();}
});

test('transaction PATCH validates the final state and moves only the selected installment',async()=>{
 const url=await database();await deploy(url);const prisma=new PrismaClient({adapter:new PrismaPg({connectionString:url})});const {TransactionsService}=require('../dist/src/transactions/transactions.service.js');
 try{
 const user=await prisma.user.create({data:{name:'Edit fixture',email:'edit@example.invalid'}});
 const expense=await prisma.category.create({data:{userId:user.id,name:'Expense',type:'expense'}});const income=await prisma.category.create({data:{userId:user.id,name:'Income',type:'income'}});
 const card=await prisma.creditCard.create({data:{userId:user.id,alias:'Card',lastFour:'1234',limit:10000,closingDay:25,dueDay:5}});
 const secondCard=await prisma.creditCard.create({data:{userId:user.id,alias:'Other card',lastFour:'5678',limit:10000,closingDay:10,dueDay:20}});
 const service=new TransactionsService(prisma);
 const cash=await service.create({amount:50,categoryId:income.id,date:'2026-01-20'},user.id);
 await assert.rejects(service.update(cash.id,{creditCardId:card.id},user.id),{status:400});
 const first=await service.create({amount:100,categoryId:expense.id,creditCardId:card.id,installments:3,date:'2026-01-20'},user.id);
 await assert.rejects(service.update(first.id,{categoryId:income.id},user.id),{status:400});
 const plan=await prisma.transaction.findMany({where:{installmentGroupId:first.installmentGroupId},orderBy:{installmentNumber:'asc'}});
 const moved=await service.update(plan[1].id,{date:'2026-04-03'},user.id);
 assert.equal(moved.statementMonth,4);assert.equal(moved.paymentDueDate.toISOString().slice(0,10),'2026-05-05');assert.equal(moved.purchaseDate.toISOString(),plan[1].purchaseDate.toISOString());assert.equal(moved.installmentNumber,2);
 const otherRows=await prisma.transaction.findMany({where:{id:{in:[plan[0].id,plan[2].id]}},orderBy:{installmentNumber:'asc'}});
 assert.deepEqual(otherRows.map(t=>t.date),[plan[0].date,plan[2].date]);
 const reassigned=await service.update(moved.id,{creditCardId:secondCard.id},user.id);assert.equal(reassigned.statementMonth,4);assert.equal(reassigned.statementClosingDate.toISOString().slice(0,10),'2026-04-10');
 await prisma.creditCard.update({where:{id:secondCard.id},data:{closingDay:5}});
 const noteOnly=await service.update(moved.id,{note:'Only note'},user.id);assert.equal(noteOnly.statementClosingDate.toISOString(),reassigned.statementClosingDate.toISOString());
 const detached=await service.update(moved.id,{creditCardId:null,categoryId:income.id},user.id);assert.equal(detached.paymentMethod,'cash');assert.equal(detached.statementMonth,null);assert.equal(detached.paymentDueDate,null);
 await assert.rejects(service.update(first.id,{date:'2026-02-31'},user.id),{status:400});
 const otherUser=await prisma.user.create({data:{name:'Other',email:'other-edit@example.invalid'}});
 await assert.rejects(service.update(first.id,{note:'Forbidden'},otherUser.id),{status:404});
 }finally{await prisma.$disconnect();}
});
