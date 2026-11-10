// Deterministic, local-only sample data. No .env fallback, network identity or email.
const assert = require('node:assert/strict'),
  path = require('node:path');
const { promisify } = require('node:util'),
  { execFile } = require('node:child_process');
const { localDatabase } = require('./local-database.cjs');
const { PrismaClient } = require('@prisma/client'),
  { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcrypt');
const {
  businessDate,
  calendarColumn,
  getCalendarDayParts,
} = require('../dist/src/utils/date.util.js');
const {
  InstallmentCalculator,
} = require('../dist/src/transactions/utils/installment-calculator.util.js');
const { ensureOccurrences } = require('../dist/src/reminders/occurrences.js');
const USER = 'lumi-demo-user',
  EMAIL = 'portfolio@lumi.example.invalid';
function demoUrl() {
  assert.equal(process.env.LUMI_DEMO, 'true', 'Set LUMI_DEMO=true explicitly');
  assert.notEqual(process.env.NODE_ENV, 'production');
  assert.ok(
    !process.env.RAILWAY_ENVIRONMENT_ID && !process.env.VERCEL,
    'Demo is never a hosted deployment command',
  );
  return localDatabase(process.env.LUMI_DEMO_DATABASE_URL, /^\/lumi_demo$/)
    .href;
}
async function seedDemo(url, period) {
  localDatabase(url, /^\/lumi_demo$/);
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(period);
  assert.ok(match, 'Demo month must be YYYY-MM');
  const year = Number(match[1]),
    month = Number(match[2]) - 1;
  assert.ok(year >= 2020 && year <= 2098);
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url }),
  });
  try {
    assert.equal(
      await prisma.user.count({ where: { id: { not: USER } } }),
      0,
      'Dedicated demo database must not contain other accounts',
    );
    const password = await bcrypt.hash('Lumi-Demo-Local-2026!', 10);
    await prisma.$transaction(
      async (tx) => {
        await tx.user.upsert({
          where: { id: USER },
          create: { id: USER, email: EMAIL, name: 'Ana Demo', password },
          update: { email: EMAIL, name: 'Ana Demo', password },
        });
        for (const [id, name, type, colorHex, icon] of [
          ['demo-income', 'Trabajo', 'income', '#0284c7', 'Briefcase'],
          [
            'demo-groceries',
            'Compras cotidianas',
            'expense',
            '#fb923c',
            'ShoppingCart',
          ],
          ['demo-shopping', 'Tecnología', 'expense', '#8b5cf6', 'Monitor'],
        ])
          await tx.category.upsert({
            where: { id },
            create: { id, userId: USER, name, type, colorHex, icon },
            update: { name, type, colorHex, icon },
          });
        const card = {
          alias: 'Visa · principal',
          lastFour: '4242',
          limit: 2250000,
          closingDay: 25,
          dueDay: 5,
          colorHex: '#173b61',
        };
        await tx.creditCard.upsert({
          where: { id: 'demo-visa' },
          create: { id: 'demo-visa', userId: USER, ...card },
          update: card,
        });
        const closingDate = businessDate(year, month + 1, 10),
          dueDate = businessDate(year, month + 2, 7),
          parts = getCalendarDayParts(closingDate);
        await tx.cardCycle.upsert({
          where: { id: 'demo-special-cycle' },
          create: {
            id: 'demo-special-cycle',
            creditCardId: 'demo-visa',
            year: parts.year,
            month: parts.monthIndex + 1,
            closingDate,
            dueDate,
          },
          update: {
            year: parts.year,
            month: parts.monthIndex + 1,
            closingDate,
            dueDate,
          },
        });
        const upsertTx = async (id, data) =>
          tx.transaction.upsert({
            where: { id },
            create: { id, ...data },
            update: data,
          });
        for (const [id, amount, note] of [
          ['demo-salary', 1600000, 'Sueldo'],
          ['demo-freelance', 250000, 'Proyecto freelance'],
        ])
          await upsertTx(id, {
            userId: USER,
            categoryId: 'demo-income',
            amount,
            note,
            date: businessDate(year, month, 2),
            purchaseDate: businessDate(year, month, 2),
            referenceDate: businessDate(year, month, 2),
            paymentMethod: 'cash',
          });
        for (let i = 0; i < 201; i++) {
          const date = businessDate(year, month, 1 + (i % 9));
          await upsertTx('demo-daily-' + String(i).padStart(3, '0'), {
            userId: USER,
            categoryId: 'demo-groceries',
            amount: 2400 + (i % 5) * 100,
            note: [
              'Almacén',
              'Café y desayuno',
              'Compra del día',
              'Viandas',
              'Compras del hogar',
            ][i % 5],
            date,
            purchaseDate: date,
            referenceDate: date,
            paymentMethod: 'cash',
          });
        }
        const calculated = InstallmentCalculator.calculate({
          amount: 360000,
          installments: 3,
          startDate: businessDate(year, month, 20),
          userId: USER,
          categoryId: 'demo-shopping',
          creditCardId: 'demo-visa',
          closingDay: 25,
          dueDay: 5,
          customCycles: [
            {
              year: parts.year,
              month: parts.monthIndex + 1,
              closingDate,
              dueDate,
            },
          ],
          note: 'Notebook para trabajar',
        });
        for (const [i, row] of calculated.transactionsData.entries())
          await upsertTx('demo-installment-' + (i + 1), {
            ...row,
            installmentGroupId: 'demo-notebook-plan',
          });
        for (const [categoryId, amount] of [
          ['demo-groceries', 650000],
          ['demo-shopping', 120000],
        ])
          await tx.budget.upsert({
            where: { userId_categoryId: { userId: USER, categoryId } },
            create: {
              id: 'budget-' + categoryId,
              userId: USER,
              categoryId,
              amount,
            },
            update: { amount },
          });
        for (const [suffix, title, amount, day, isPaid] of [
          ['rent', 'Alquiler', 450000, 5, true],
          ['internet', 'Internet', 30000, 18, false],
          ['gym', 'Gimnasio', 25000, 25, false],
        ]) {
          const ruleId = 'demo-rule-' + suffix,
            anchor = businessDate(year, month, day);
          await tx.reminderRule.upsert({
            where: { id: ruleId },
            create: {
              id: ruleId,
              userId: USER,
              title,
              amount,
              anchorOn: calendarColumn(anchor),
            },
            update: {
              title,
              amount,
              anchorOn: calendarColumn(anchor),
              active: true,
            },
          });
          await tx.reminder.upsert({
            where: {
              ruleId_occurrencePeriod: { ruleId, occurrencePeriod: period },
            },
            create: {
              id: 'demo-' + suffix + '-' + period,
              userId: USER,
              title,
              amount,
              dueDate: anchor,
              dueOn: calendarColumn(anchor),
              isPaid,
              isRecurring: true,
              ruleId,
              occurrencePeriod: period,
            },
            update: {
              title,
              amount,
              dueDate: anchor,
              dueOn: calendarColumn(anchor),
              isPaid,
              isRecurring: true,
              isCancelled: false,
            },
          });
        }
      },
      { timeout: 30000 },
    );
    await ensureOccurrences(prisma, USER, businessDate(year, month + 12, 1));
    console.log(
      JSON.stringify({
        demoSeed: 'ready',
        period,
        transactions: await prisma.transaction.count({
          where: { userId: USER },
        }),
        email: EMAIL,
      }),
    );
  } finally {
    await prisma.$disconnect();
  }
}
module.exports = { demoUrl, seedDemo };
if (require.main === module)
  (async () => {
    const url = demoUrl();
    await promisify(execFile)(
      process.execPath,
      [
        path.resolve(__dirname, '../node_modules/prisma/build/index.js'),
        'migrate',
        'deploy',
      ],
      {
        cwd: path.resolve(__dirname, '..'),
        env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url },
        timeout: 90000,
      },
    );
    const now = getCalendarDayParts(new Date());
    const period =
      process.env.LUMI_DEMO_MONTH ||
      `${now.year}-${String(now.monthIndex + 1).padStart(2, '0')}`;
    await seedDemo(url, period);
  })().catch((error) => {
    console.error(
      JSON.stringify({
        demoSeed: 'failed',
        code: error.code || error.name,
        message:
          error instanceof assert.AssertionError
            ? error.message
            : 'Local demo setup failed',
      }),
    );
    process.exitCode = 1;
  });
