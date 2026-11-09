/* Auditoría local. No carga .env, no usa la base real ni envía correos.
 * Requiere api compilada y dependencias ya instaladas. Los fallos reproducidos
 * son datos del informe; no se incorporan cambios a la aplicación.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../..');
const apiRequire = createRequire(path.join(root, 'api/package.json'));
const webRequire = createRequire(path.join(root, 'web/package.json'));
apiRequire('reflect-metadata');
const load = (file) => apiRequire(path.join(root, 'api/dist/src', file));
const { ValidationPipe } = apiRequire('@nestjs/common');
const { ConfigService } = apiRequire('@nestjs/config');
const { JwtService } = apiRequire('@nestjs/jwt');
const { InstallmentCalculator } = load('transactions/utils/installment-calculator.util.js');
const { TransactionsService } = load('transactions/transactions.service.js');
const { CreditCardsService } = load('credit-cards/credit-cards.service.js');
const { AnalyticsService } = load('analytics/analytics.service.js');
const { BudgetsService } = load('budgets/budgets.service.js');
const { NotificationsService } = load('notifications/notifications.service.js');
const { AuthService } = load('auth/auth.service.js');
const { JwtStrategy } = load('auth/strategies/jwt.strategy.js');
const { OAuthStateStore } = load('auth/strategies/oauth-state.store.js');
const { RegisterDto } = load('auth/dto/auth.dto.js');
const { CreateTransactionDto } = load('transactions/dto/create-transaction.dto.js');
const { UpdateTransactionDto } = load('transactions/dto/update-transaction.dto.js');
const { CreateCreditCardDto } = load('credit-cards/dto/create-credit-card.dto.js');
const { UpsertCardCycleDto } = load('credit-cards/dto/upsert-card-cycle.dto.js');
const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
const result = { commit: cp.execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim() };
const accepts = async (dto, value) => {
  try { await pipe.transform(value, { type: 'body', metatype: dto }); return true; }
  catch (error) { return { accepted: false, status: error.getStatus?.() }; }
};
const dateKey = (d) => d.toISOString().slice(0, 10);
async function atDate(iso, callback) {
  const OriginalDate = global.Date;
  global.Date = class extends OriginalDate {
    constructor(...args) { super(...(args.length ? args : [iso])); }
    static now() { return new OriginalDate(iso).getTime(); }
  };
  try { return await callback(); } finally { global.Date = OriginalDate; }
}

(async () => {
  process.env.TZ = 'UTC';
  process.env.JWT_SECRET = 'synthetic-audit-secret-no-production-credentials';
  process.env.RESEND_API_KEY = '';
  const amounts = InstallmentCalculator.calculate({ amount: 0.07, installments: 12, startDate: new Date(2026, 0, 26, 12), userId: 'u', categoryId: 'c' }).transactionsData.map((t) => t.amount);
  result.fixedValidations = {
    smallAmountRejected: await accepts(CreateTransactionDto, { amount: 0.07, installments: 12, categoryId: 'c' }),
    calculatorAmounts: amounts,
    invalidDateRejected: await accepts(CreateTransactionDto, { amount: 10, categoryId: 'c', date: '2026-02-31' }),
    nullDateRejected: await accepts(UpdateTransactionDto, { date: null }),
    fractionalDaysRejected: await accepts(CreateCreditCardDto, { alias: 'Test', lastFour: 'ABCD', limit: 100, closingDay: 2.5, dueDay: 4.5 }),
    inconsistentCycleRejected: await accepts(UpsertCardCycleDto, { month: 10, year: 2026, closingDate: '2027-01-25', dueDate: '2025-01-01' }),
    bcryptByteOverflowRejected: await accepts(RegisterDto, { name: 'Test', email: 'synthetic@example.invalid', password: 'é'.repeat(36) + 'A' }),
  };

  const store = new OAuthStateStore('synthetic-oauth-key', false);
  let cookie = '', state = '';
  store.store({ query: { client_state: 'synthetic-browser-state' }, res: { setHeader: (_k, val) => { cookie = val.split(';')[0]; } } }, 'synthetic-verifier', undefined, undefined, (_err, val) => { state = val; });
  const verifyState = (cookieValue) => {
    let response;
    store.verify({ headers: { cookie: cookieValue }, res: { setHeader() {} } }, state, undefined, (error, ok) => { response = { error: Boolean(error), ok }; });
    return response;
  };
  result.oauthState = { missingCookie: verifyState(''), correctCookie: verifyState(cookie), replay: verifyState(cookie) };

  let user = null;
  const repository = { user: {
    findUnique: async () => user,
    create: async ({ data }) => { user = { id: 'synthetic-user', picture: null, googleId: null, ...data }; return user; },
    upsert: async ({ update }) => { user = { ...user, ...update }; return user; },
  } };
  const jwt = new JwtService({ secret: process.env.JWT_SECRET });
  const auth = new AuthService(repository, jwt);
  const registered = await auth.register({ name: 'Synthetic', email: 'synthetic@example.invalid', password: 'synthetic-password' });
  const previousPayload = jwt.verify(registered.token);
  await auth.googleLogin({ email: user.email, name: 'Google Synthetic', googleId: 'google-subject', emailVerified: true });
  const strategy = new JwtStrategy(repository, auth, new ConfigService({ JWT_SECRET: process.env.JWT_SECRET }));
  let oldTokenAccepted = false;
  try { await strategy.validate(previousPayload); oldTokenAccepted = true; } catch { /* expected after a complete fix */ }
  auth.revokeToken(previousPayload.jti, previousPayload.exp);
  result.accountLink = {
    oldLocalPasswordCleared: user.password === null,
    oldLocalJwtStillAcceptedAfterGoogleLink: oldTokenAccepted,
    revokedBeforeRestart: auth.isTokenRevoked(previousPayload.jti),
    revokedAfterNewServiceInstance: new AuthService(repository, jwt).isTokenRevoked(previousPayload.jti),
  };

  const cardService = new CreditCardsService({});
  const card = { closingDay: 25, dueDay: 5, cycles: [{ year: 2026, month: 2, closingDate: new Date(2026, 1, 10, 12) }] };
  const customPlan = InstallmentCalculator.calculate({ amount: 300, installments: 3, startDate: new Date(2026, 0, 20, 12), userId: 'u', categoryId: 'c', creditCardId: 'card', closingDay: card.closingDay, customCycles: card.cycles });
  result.customCycle = customPlan.transactionsData.map((t, index) => ({ installment: index + 1, assignedDate: dateKey(t.date), actualBillingMonthAccordingToCardService: cardService.getCycleDatesForCard(card, t.date).month }));

  result.timezoneFinancial = [];
  for (const timezone of ['UTC', 'America/Argentina/Buenos_Aires']) {
    process.env.TZ = timezone;
    const sameInstant = new Date('2026-01-26T01:00:00Z');
    const planned = InstallmentCalculator.calculate({ amount: 100, installments: 1, startDate: sameInstant, userId: 'u', categoryId: 'c', creditCardId: 'card', closingDay: 25 });
    result.timezoneFinancial.push({ timezone, inputInstant: sameInstant.toISOString(), assignedLocalMonth: planned.transactionsData[0].date.getMonth() + 1 });
  }
  process.env.TZ = 'UTC';

  const updates = [];
  const transactionService = new TransactionsService({
    transaction: { findUnique: async () => ({ id: 'tx', userId: 'u', categoryId: 'income-category', creditCardId: null }), update: async ({ data }) => { updates.push(data); return data; } },
    creditCard: { findUnique: async () => ({ userId: 'u', closingDay: 25 }) },
  });
  await transactionService.update('tx', { creditCardId: 'own-card' }, 'u');
  result.updateIncome = { acceptedCardOnExistingIncomeWithoutCategoryInPatch: updates.length === 1, generatedUpdate: updates[0] };

  result.forecast = await atDate('2026-11-09T12:00:00Z', async () => {
    const oldPaidRecurring = { id: 'r', isPaid: true, isRecurring: true, amount: 100, dueDate: new Date('2026-10-15T12:00:00Z') };
    const recurring = await new AnalyticsService({ transaction: { findMany: async () => [] }, reminder: { findMany: async () => [oldPaidRecurring] } }).getForecast('u', 3);
    const futureIncome = { amount: 900, date: new Date('2026-12-01T12:00:00Z'), category: { type: 'income' } };
    let calls = 0;
    const estimated = await new AnalyticsService({ transaction: { findMany: async () => (++calls === 2 ? [futureIncome] : []) }, reminder: { findMany: async () => [] } }).getForecast('u', 3);
    return { paidRecurringFromPreviousMonth: recurring.forecastTimeline.map((m) => ({ period: m.period, fixed: m.fixedExpenses })), estimatedCurrentIncomeFromOnlyFutureDecemberIncome: estimated.estimatedMonthlyIncome };
  });

  const budget = await new BudgetsService({ budget: { findMany: async () => [{ id: 'b', categoryId: 'c', amount: 100, category: { id: 'c' } }] }, transaction: { findMany: async () => [{ categoryId: 'c', amount: 100.01 }] } }).findAll('u', 11, 2026);
  result.budget = { itemStatus: budget.items[0].status, totalBudgeted: budget.totalBudgeted, totalSpent: budget.totalSpent, overallPercentage: budget.overallPercentage, frontendGeneralCardShowsExceeded: budget.overallPercentage > 100 };

  let cronQuery;
  await new NotificationsService({ reminder: { findMany: async (query) => { cronQuery = query; return []; } } }).checkDueReminders(new Date('2026-11-09T12:00:00Z'));
  result.notifications = { processTimezone: 'UTC', actualStart: cronQuery.where.dueDate.gte.toISOString(), actualEnd: cronQuery.where.dueDate.lte.toISOString(), expectedBuenosAiresStart: '2026-11-09T03:00:00.000Z' };

  const ts = webRequire('typescript');
  const states = [], effects = [], requested = [];
  const ReactStub = { useState(initial) { const index = states.length; states.push(typeof initial === 'function' ? initial() : initial); return [states[index], (next) => { states[index] = typeof next === 'function' ? next(states[index]) : next; }]; }, useEffect(effect) { effects.push(effect); }, useMemo(fn) { return fn(); } };
  const hookSource = fs.readFileSync(path.join(root, 'web/src/hooks/useCalendar.ts'), 'utf8');
  const hookModule = { exports: {} };
  const resolver = (name) => {
    if (name === 'react') return ReactStub;
    if (name === 'sonner') return { toast: { error() {} } };
    if (name === '@/lib/api') return { apiFetch: async (url) => { requested.push(url); return url.startsWith('/transactions') ? { data: Array.from({ length: 100 }, (_, i) => ({ id: `tx-${i}`, date: '2026-11-01' })), meta: { total: 101, page: 1, totalPages: 2 } } : []; } };
    return webRequire(name);
  };
  const compiledHook = ts.transpileModule(hookSource, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  new Function('require', 'exports', 'module', compiledHook)(resolver, hookModule.exports, hookModule);
  hookModule.exports.useCalendar();
  effects.forEach((effect) => effect());
  await new Promise(setImmediate);
  result.calendar = { serverTotal: 101, loadedTransactions: states[2].length, requestedUrls: requested };

  const { PGlite } = apiRequire('@electric-sql/pglite');
  const db = new PGlite();
  try {
    const folder = path.join(root, 'api/prisma/migrations');
    const migrations = fs.readdirSync(folder).filter((name) => fs.statSync(path.join(folder, name)).isDirectory()).sort();
    for (const migration of migrations) await db.exec(fs.readFileSync(path.join(folder, migration, 'migration.sql'), 'utf8'));
    await db.exec(`INSERT INTO "User" (id, email, name) VALUES ('u','synthetic@example.invalid','Synthetic'); INSERT INTO "Category" (id,"userId",name,type) VALUES ('c','u','Test','expense'); INSERT INTO "CreditCard" (id,"userId",alias,"lastFour","limit","closingDay","dueDay","updatedAt") VALUES ('card','u','Test','1234',1000,25,5,now()); INSERT INTO "Transaction" (id,"userId","categoryId","creditCardId",amount) VALUES ('tx','u','c','card',100); DELETE FROM "CreditCard" WHERE id='card';`);
    result.database = { migrationsApplied: migrations.length, deletionPreservesPaymentMethod: (await db.query(`SELECT "creditCardId", "paymentMethod", amount::text FROM "Transaction" WHERE id='tx'`)).rows[0] };
    let restrictiveDelete = false;
    try { await db.exec(`DELETE FROM "Category" WHERE id='c'`); } catch { restrictiveDelete = true; }
    result.database.categoryDeletionRestricted = restrictiveDelete;
  } finally { await db.close(); }
  const migrationPath = 'api/prisma/migrations/20260503052146_add_email_password_to_user/migration.sql';
  const originalMigration = cp.execFileSync('git', ['show', `68a216a:${migrationPath}`], { cwd: root });
  const currentMigration = fs.readFileSync(path.join(root, migrationPath));
  result.migrationHistory = { oldMigrationWasEdited: !originalMigration.equals(currentMigration), originalSha256: crypto.createHash('sha256').update(originalMigration).digest('hex'), currentSha256: crypto.createHash('sha256').update(currentMigration).digest('hex') };
  const output = path.join(__dirname, 'resultados.json');
  fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
})().catch((error) => { console.error(error); process.exitCode = 1; });
