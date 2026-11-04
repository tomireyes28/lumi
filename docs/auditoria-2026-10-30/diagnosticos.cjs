/* Diagnósticos locales: no lee .env, no abre conexiones de red y usa repositorios simulados.
 * Ejecutar después de compilar api/: node docs/auditoria-2026-10-30/diagnosticos.cjs
 */
const path = require('node:path');
const fs = require('node:fs');
const { createRequire } = require('node:module');
const apiRoot = path.resolve(__dirname, '../../api');
const apiRequire = createRequire(path.join(apiRoot, 'package.json'));
apiRequire('reflect-metadata');
const load = (file) => apiRequire(path.join(apiRoot, 'dist/src', file));
const { ValidationPipe } = apiRequire('@nestjs/common');
const { ConfigService } = apiRequire('@nestjs/config');
const bcrypt = apiRequire('bcrypt');
const { InstallmentCalculator } = load('transactions/utils/installment-calculator.util.js');
const { CreateTransactionDto } = load('transactions/dto/create-transaction.dto.js');
const { UpdateTransactionDto } = load('transactions/dto/update-transaction.dto.js');
const { GetTransactionsFilterDto } = load('transactions/dto/get-transactions-filter.dto.js');
const { CreateCreditCardDto } = load('credit-cards/dto/create-credit-card.dto.js');
const { UpsertCardCycleDto } = load('credit-cards/dto/upsert-card-cycle.dto.js');
const { RegisterDto } = load('auth/dto/auth.dto.js');
const { CreditCardsService } = load('credit-cards/credit-cards.service.js');
const { TransactionsService } = load('transactions/transactions.service.js');
const { AnalyticsService } = load('analytics/analytics.service.js');
const { BudgetsService } = load('budgets/budgets.service.js');
const { GoogleStrategy } = load('auth/strategies/google.strategy.js');
const { AuthService } = load('auth/auth.service.js');
const { parseLocalDate } = load('utils/date.util.js');
const results = {};
const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
async function accepts(dto, value, type = 'body') {
  try {
    await pipe.transform(value, { type, metatype: dto });
    return true;
  } catch (error) {
    return { accepted: false, status: error.getStatus?.() };
  }
}

(async () => {
  const smallPlan = InstallmentCalculator.calculate({
    amount: 0.07, installments: 12, startDate: new Date(2026, 0, 26, 12),
    userId: 'synthetic-user', categoryId: 'synthetic-category',
  });
  results.installments = {
    inputAccepted: await accepts(CreateTransactionDto, { amount: 0.07, installments: 12, categoryId: 'synthetic-category' }),
    amounts: smallPlan.transactionsData.map((item) => item.amount),
  };
  results.validation = {
    invalidTransactionDateAccepted: await accepts(CreateTransactionDto, { amount: 100, categoryId: 'test', date: 'not-a-date' }),
    excessiveScaleAndAmountAccepted: await accepts(CreateTransactionDto, { amount: 100000000.001, categoryId: 'test' }),
    nullUpdateDateAccepted: await accepts(UpdateTransactionDto, { date: null }),
    ignoredInstallmentsUpdateAccepted: await accepts(UpdateTransactionDto, { installments: 12 }),
    decimalCardDaysAndLettersAccepted: await accepts(CreateCreditCardDto, { alias: 'Test', lastFour: 'ABCD', limit: 100, closingDay: 2.5, dueDay: 4.5 }),
    inconsistentCycleAccepted: await accepts(UpsertCardCycleDto, { month: 10, year: 2026, closingDate: '2027-01-25', dueDate: '2025-01-01' }),
    outOfRangeMonthAccepted: await accepts(GetTransactionsFilterDto, { month: '13', year: '2026' }, 'query'),
    blankNameAccepted: await accepts(RegisterDto, { name: '   ', email: 'synthetic@example.invalid', password: 'synthetic-password' }),
    normalizedInvalidDay: parseLocalDate('2026-02-31').toISOString().split('T')[0],
  };
  try { parseLocalDate(null); } catch (error) { results.validation.nullDateError = error.message; }

  const originalTimezone = process.env.TZ;
  process.env.TZ = 'America/Argentina/Buenos_Aires';
  const cycleService = new CreditCardsService({});
  const cycle = cycleService.getCycleDatesForCard({ closingDay: 25, dueDay: 5 }, new Date(2026, 9, 10, 12));
  results.cardDate = {
    intendedClosingDay: 25,
    iso: cycle.closingDate.toISOString(),
    uiUsingUTC: cycle.closingDate.toLocaleDateString('es-AR', { timeZone: 'UTC' }),
    uiUsingBusinessTimezone: cycle.closingDate.toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }),
  };
  if (originalTimezone === undefined) delete process.env.TZ; else process.env.TZ = originalTimezone;

  const google = new GoogleStrategy(new ConfigService({ NODE_ENV: 'development' }));
  results.oauth = { configuredStateStore: google._stateStore.constructor.name };
  const jwtStub = { sign: () => 'synthetic-jwt' };
  let existingAccount = { id: 'synthetic-user', email: 'synthetic@example.invalid', name: 'Local account', password: 'synthetic-existing-hash' };
  const mockUsers = { upsert: async ({ update }) => { existingAccount = { ...existingAccount, ...update }; return existingAccount; } };
  await new AuthService({ user: mockUsers }, jwtStub).googleLogin({ email: existingAccount.email, name: 'Google account' });
  results.oauth.localPasswordPreservedAfterGoogleLink = existingAccount.password === 'synthetic-existing-hash';

  const passwordA = 'é'.repeat(36) + 'A';
  const passwordB = 'é'.repeat(36) + 'B';
  const syntheticHash = await bcrypt.hash(passwordA, 4);
  results.bcrypt = {
    bothAccepted: (await accepts(RegisterDto, { name: 'Test', email: 'synthetic@example.invalid', password: passwordA })) === true
      && (await accepts(RegisterDto, { name: 'Test', email: 'synthetic@example.invalid', password: passwordB })) === true,
    bytes: Buffer.byteLength(passwordA, 'utf8'),
    differentSuffixMatches: await bcrypt.compare(passwordB, syntheticHash),
  };

  let capturedPlan = [];
  const transactionService = new TransactionsService({
    category: { findUnique: async () => ({ userId: 'synthetic-user', type: 'expense' }) },
    creditCard: { findUnique: async () => ({ userId: 'synthetic-user', closingDay: 25, dueDay: 5 }) },
    transaction: {
      createMany: async ({ data }) => { capturedPlan = data; return { count: data.length }; },
      findFirst: async () => capturedPlan[0],
    },
  });
  await transactionService.create({ amount: 300, categoryId: 'test', creditCardId: 'card', installments: 3, date: '2026-01-26' }, 'synthetic-user');
  results.installmentDates = { cardClosesOn: 25, purchaseDay: '2026-01-26', generatedDates: capturedPlan.map((item) => item.date.toISOString().split('T')[0]) };

  const now = new Date();
  const currentDueDate = new Date(now.getFullYear(), now.getMonth(), 15, 12);
  let paid = false;
  const forecastService = new AnalyticsService({
    transaction: { findMany: async () => [] },
    reminder: { findMany: async () => paid ? [] : [{ dueDate: currentDueDate, amount: 100, isPaid: false }] },
  });
  const unpaidForecast = await forecastService.getForecast('synthetic-user', 3);
  paid = true;
  const paidForecast = await forecastService.getForecast('synthetic-user', 3);
  results.forecast = {
    oneOffReminderProjectedEveryMonth: unpaidForecast.forecastTimeline.map((item) => item.fixedExpenses),
    recurringProjectionAfterPaying: paidForecast.forecastTimeline.map((item) => item.fixedExpenses),
    noIncomeWithDebtRatio: unpaidForecast.averageCommitmentRatio,
  };

  const budgetsService = new BudgetsService({
    budget: { findMany: async () => [{ id: 'budget', categoryId: 'category', amount: 100, category: { id: 'category' } }] },
    transaction: { findMany: async () => [{ categoryId: 'category', amount: 100.01 }] },
  });
  const budgets = await budgetsService.findAll('synthetic-user', 10, 2026);
  results.budgetThreshold = { budget: 100, spent: 100.01, status: budgets.items[0].status, percentage: budgets.items[0].percentageSpent };

  // Motor PostgreSQL WASM ya instalado transitivamente: base efímera en memoria.
  // Verifica SQL y relaciones; no reemplaza una prueba de Prisma contra PostgreSQL 16.
  const { PGlite } = apiRequire('@electric-sql/pglite');
  const db = new PGlite();
  try {
    const migrationsRoot = path.join(apiRoot, 'prisma/migrations');
    const migrations = fs.readdirSync(migrationsRoot).filter((name) => fs.statSync(path.join(migrationsRoot, name)).isDirectory()).sort();
    for (const migration of migrations) {
      await db.exec(fs.readFileSync(path.join(migrationsRoot, migration, 'migration.sql'), 'utf8'));
    }
    await db.exec(`
      INSERT INTO "User" (id, email, name) VALUES ('u', 'synthetic@example.invalid', 'Synthetic');
      INSERT INTO "Category" (id, "userId", name, type) VALUES ('c', 'u', 'Test', 'expense');
      INSERT INTO "CreditCard" (id, "userId", alias, "lastFour", "limit", "closingDay", "dueDay", "updatedAt")
        VALUES ('card', 'u', 'Test', '1234', 1000, 25, 5, now());
      INSERT INTO "Transaction" (id, "userId", "categoryId", "creditCardId", amount) VALUES ('tx', 'u', 'c', 'card', 100);
    `);
    const summaryQuery = `SELECT COALESCE(SUM(amount) FILTER (WHERE "creditCardId" IS NULL), 0)::text AS cash,
      COALESCE(SUM(amount) FILTER (WHERE "creditCardId" IS NOT NULL), 0)::text AS card FROM "Transaction"`;
    const beforeDeletion = (await db.query(summaryQuery)).rows[0];
    await db.exec(`DELETE FROM "CreditCard" WHERE id = 'card'`);
    const afterDeletion = (await db.query(summaryQuery)).rows[0];
    await db.exec(`INSERT INTO "Transaction" (id, "userId", "categoryId", amount) VALUES ('subcent', 'u', 'c', 0.001), ('negative', 'u', 'c', -0.04)`);
    const storedAmounts = (await db.query(`SELECT id, amount::text FROM "Transaction" WHERE id IN ('subcent', 'negative') ORDER BY id`)).rows;
    results.database = {
      engine: (await db.query('SELECT version()')).rows[0].version,
      migrationsApplied: migrations.length,
      deleteCard: { beforeDeletion, afterDeletion },
      storedAmounts,
    };
  } finally {
    await db.close();
  }
  console.log(JSON.stringify(results, null, 2));
})().catch((error) => { console.error(error); process.exitCode = 1; });
