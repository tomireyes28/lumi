#!/usr/bin/env node
// Read-only production preflight. Never prints connection strings or user records.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { Client } = require('pg');
const dotenv = require('dotenv');

const apiRoot = path.resolve(__dirname, '..');
const tables = [
  'User',
  'AuthSession',
  'OAuthGrant',
  'RateLimitBucket',
  'Category',
  'CreditCard',
  'Transaction',
  'Reminder',
  'Budget',
  'CardCycle',
  '_prisma_migrations',
];

function checksums(sql) {
  const lf = sql.replace(/\r\n/g, '\n');
  return new Set(
    [sql, lf, lf.replace(/\n/g, '\r\n')].map((text) =>
      crypto.createHash('sha256').update(text).digest('hex'),
    ),
  );
}

async function inspectDatabase(client) {
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  try {
    await client.query("SET LOCAL statement_timeout = '15s'");
    await client.query("SET LOCAL lock_timeout = '3s'");
    const session = (
      await client.query(`SELECT current_setting('transaction_read_only') AS read_only,
      current_setting('server_version') AS postgres_version,
      current_setting('TimeZone') AS timezone, current_user AS database_role,
      (SELECT rolbypassrls FROM pg_roles WHERE rolname=current_user) AS role_bypasses_rls`)
    ).rows[0];
    const columns = (
      await client.query(
        `SELECT table_name, column_name, data_type, numeric_precision, numeric_scale
      FROM information_schema.columns WHERE table_schema='public' AND table_name=ANY($1::text[])
      ORDER BY table_name, ordinal_position`,
        [tables],
      )
    ).rows;
    const has = (table, column) =>
      columns.some((c) => c.table_name === table && c.column_name === column);
    const migrationTable = (
      await client.query(
        "SELECT to_regclass('public._prisma_migrations') IS NOT NULL AS present",
      )
    ).rows[0].present;
    const applied = migrationTable
      ? (
          await client.query(`SELECT migration_name, checksum,
      finished_at IS NOT NULL AS finished, rolled_back_at IS NOT NULL AS rolled_back
      FROM public._prisma_migrations ORDER BY started_at`)
        ).rows
      : [];
    const migrationRoot = path.join(apiRoot, 'prisma/migrations');
    const local = fs
      .readdirSync(migrationRoot)
      .filter((name) =>
        fs.statSync(path.join(migrationRoot, name)).isDirectory(),
      );
    const history = applied.map((row) => {
      const file = path.join(
        migrationRoot,
        row.migration_name,
        'migration.sql',
      );
      return {
        ...row,
        local_file_exists: fs.existsSync(file),
        local_checksum_matches:
          fs.existsSync(file) &&
          checksums(fs.readFileSync(file, 'utf8')).has(row.checksum),
      };
    });
    const pending = local.filter(
      (name) =>
        !applied.some(
          (row) =>
            row.migration_name === name && row.finished && !row.rolled_back,
        ),
    );

    const dataChecks = {};
    const count = async (name, sql) => {
      dataChecks[name] = Number((await client.query(sql)).rows[0].count);
    };
    if (has('User', 'name'))
      await count(
        'users_without_name',
        `SELECT count(*) FROM public."User" WHERE name IS NULL OR btrim(name)=''`,
      );
    for (const table of ['Transaction', 'Reminder', 'Budget']) {
      if (!has(table, 'amount')) continue;
      await count(
        `${table}_non_positive_amount`,
        `SELECT count(*) FROM public."${table}" WHERE amount <= 0`,
      );
      await count(
        `${table}_amount_overflows_decimal_10_2`,
        `SELECT count(*) FROM public."${table}" WHERE abs(round(amount,2)) >= 100000000`,
      );
      await count(
        `${table}_amount_requires_rounding`,
        `SELECT count(*) FROM public."${table}" WHERE amount <> round(amount,2)`,
      );
    }
    if (has('Transaction', 'categoryId') && has('Category', 'userId')) {
      await count(
        'transactions_with_missing_or_foreign_category',
        `SELECT count(*) FROM public."Transaction" t LEFT JOIN public."Category" c ON c.id=t."categoryId" WHERE c.id IS NULL OR c."userId"<>t."userId"`,
      );
    }
    if (has('Transaction', 'creditCardId') && has('CreditCard', 'userId')) {
      await count(
        'transactions_with_missing_or_foreign_card',
        `SELECT count(*) FROM public."Transaction" t LEFT JOIN public."CreditCard" c ON c.id=t."creditCardId" WHERE t."creditCardId" IS NOT NULL AND (c.id IS NULL OR c."userId"<>t."userId")`,
      );
    }
    if (has('Transaction', 'paymentMethod')) {
      await count(
        'card_transactions_lost_reference',
        `SELECT count(*) FROM public."Transaction" WHERE "creditCardId" IS NULL AND "paymentMethod"='credit_card'`,
      );
      await count(
        'card_transactions_misclassified',
        `SELECT count(*) FROM public."Transaction" WHERE "creditCardId" IS NOT NULL AND "paymentMethod"<>'credit_card'`,
      );
    }
    const roles = (
      await client.query(
        "SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated')",
      )
    ).rows.map((r) => r.rolname);
    const permissions = [];
    for (const role of roles) {
      permissions.push(
        ...(
          await client.query(
            `SELECT c.relname AS table_name, $1::text AS role,
        c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS force_rls,
        has_table_privilege($1, c.oid, 'SELECT') AS can_select,
        has_table_privilege($1, c.oid, 'INSERT') AS can_insert,
        has_table_privilege($1, c.oid, 'UPDATE') AS can_update,
        has_table_privilege($1, c.oid, 'DELETE') AS can_delete,
        (SELECT count(*)::int FROM pg_policy p WHERE p.polrelid=c.oid) AS policy_count
        FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname='public' AND c.relname=ANY($2::text[]) ORDER BY c.relname`,
            [role, tables],
          )
        ).rows,
      );
    }
    const constraints = (
      await client.query(
        `SELECT r.relname AS table_name, c.conname AS name,
      pg_get_constraintdef(c.oid) AS definition FROM pg_constraint c
      JOIN pg_class r ON r.oid=c.conrelid JOIN pg_namespace n ON n.oid=r.relnamespace
      WHERE n.nspname='public' AND r.relname=ANY($1::text[]) ORDER BY r.relname,c.conname`,
        [tables],
      )
    ).rows;
    const defaultPublicGrants = (
      await client.query(`SELECT n.nspname AS schema_name,
      CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END AS grantee,
      a.privilege_type
      FROM pg_default_acl d LEFT JOIN pg_namespace n ON n.oid=d.defaclnamespace
      CROSS JOIN LATERAL aclexplode(d.defaclacl) a
      WHERE d.defaclrole=(SELECT oid FROM pg_roles WHERE rolname=current_user)
        AND d.defaclobjtype='r' AND (d.defaclnamespace=0 OR n.nspname='public')
        AND (a.grantee=0 OR a.grantee IN (SELECT oid FROM pg_roles WHERE rolname IN ('anon','authenticated')))
      ORDER BY schema_name,grantee,privilege_type`)
    ).rows;
    const temporalData = has('Transaction', 'purchaseDate')
      ? (
          await client.query(`SELECT
      count(*) FILTER (WHERE "purchaseDate" IS NULL)::int AS legacy_transactions,
      count(*) FILTER (WHERE "purchaseDate" IS NULL AND "paymentMethod"='credit_card')::int AS legacy_card_transactions,
      count(*) FILTER (WHERE "purchaseDate" IS NOT NULL)::int AS explicit_transactions
      FROM "Transaction"`)
        ).rows[0]
      : null;
    await client.query('COMMIT');
    return {
      session,
      migrations: { managed: migrationTable, history, pending },
      columns,
      dataChecks,
      temporalData,
      permissions,
      defaultPublicGrants,
      constraints,
    };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  }
}

function releaseIssues(report) {
  const issues = [];
  if (!report.migrations.managed)
    issues.push('Missing Prisma migration history');
  if (report.migrations.pending.length) issues.push('Pending migrations');
  if (
    report.migrations.history.some(
      (m) => !m.rolled_back && (!m.finished || !m.local_checksum_matches),
    )
  )
    issues.push('Unfinished or modified migration');
  if (
    Object.entries(report.dataChecks).some(
      ([name, count]) =>
        count > 0 && name !== 'card_transactions_lost_reference',
    )
  )
    issues.push('Legacy data requires review');
  if (
    report.permissions.some(
      (p) =>
        !p.rls_enabled ||
        p.can_select ||
        p.can_insert ||
        p.can_update ||
        p.can_delete,
    )
  )
    issues.push('Public roles still have database access');
  if (report.defaultPublicGrants.length)
    issues.push('Future tables have public default grants');
  return issues;
}

async function main() {
  const envFile = path.join(apiRoot, '.env');
  const localEnv = fs.existsSync(envFile)
    ? dotenv.parse(fs.readFileSync(envFile))
    : {};
  const connectionString =
    process.env.DIRECT_URL ||
    process.env.DATABASE_URL ||
    localEnv.DIRECT_URL ||
    localEnv.DATABASE_URL;
  if (!connectionString)
    throw Object.assign(new Error('DATABASE_URL or DIRECT_URL is required'), {
      code: 'MISSING_DATABASE_URL',
    });
  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 10000,
    application_name: 'lumi-read-only-preflight',
  });
  try {
    await client.connect();
    const result = await inspectDatabase(client);
    console.log(JSON.stringify(result, null, 2));
    if (process.argv.includes('--verify')) {
      const issues = releaseIssues(result);
      if (issues.length) {
        console.error(JSON.stringify({ releaseIssues: issues }));
        process.exitCode = 1;
      }
    }
  } finally {
    await client.end().catch(() => undefined);
  }
}

module.exports = { checksums, inspectDatabase, releaseIssues };
if (require.main === module)
  main().catch((error) => {
    // Do not print an exception/stack: a driver error may include sensitive configuration.
    console.error(
      JSON.stringify({
        error: 'Read-only database preflight failed',
        code: error.code || error.name,
      }),
    );
    process.exitCode = 1;
  });
