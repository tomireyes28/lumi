import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { ThrottlerStorage, ThrottlerStorageService } from '@nestjs/throttler';

interface MockUserRecord {
  id: string;
  email: string;
  name: string;
  password: string | null;
  picture: string | null;
  googleId: string | null;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface MockCategoryRecord {
  id: string;
  name: string;
  type: 'income' | 'expense';
  colorHex: string | null;
  icon: string | null;
  userId: string;
}

interface MockCardRecord {
  id: string;
  alias: string;
  lastFour: string;
  limit: Prisma.Decimal;
  closingDay: number;
  dueDay: number;
  colorHex: string | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface MockTransactionRecord {
  id: string;
  amount: Prisma.Decimal;
  date: Date;
  note: string | null;
  paymentMethod: string;
  installmentGroupId: string | null;
  userId: string;
  categoryId: string;
  creditCardId: string | null;
}

describe('Lumi API (e2e)', () => {
  let app: INestApplication<App>;

  const users = new Map<string, MockUserRecord>();
  const categories = new Map<string, MockCategoryRecord>();
  const cards = new Map<string, MockCardRecord>();
  const transactions = new Map<string, MockTransactionRecord>();

  beforeAll(async () => {
    process.env.JWT_SECRET =
      process.env.JWT_SECRET || 'test-e2e-jwt-secret-key-minimum-32-chars';

    const sessions = new Map<
      string,
      { id: string; userId: string; expiresAt: Date; revokedAt: Date | null }
    >();
    const mockPrisma = {
      reminderRule: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn((fn: (tx: unknown) => unknown): unknown =>
        fn(mockPrisma),
      ),
      authSession: {
        create: jest.fn(
          ({
            data,
          }: {
            data: { id: string; userId: string; expiresAt: Date };
          }) => {
            sessions.set(data.id, { ...data, revokedAt: null });
            return Promise.resolve(data);
          },
        ),
        findUnique: jest.fn(({ where }: { where: { id: string } }) =>
          Promise.resolve(
            sessions.has(where.id)
              ? { ...sessions.get(where.id), user: { authVersion: 0 } }
              : null,
          ),
        ),
        updateMany: jest.fn(
          ({
            where,
            data,
          }: {
            where: { id: string };
            data: { revokedAt: Date };
          }) => {
            const session = sessions.get(where.id);
            if (session) Object.assign(session, data);
            return Promise.resolve({ count: session ? 1 : 0 });
          },
        ),
      },
      $connect: jest.fn(),
      $disconnect: jest.fn(),
      $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]),
      onModuleInit: jest.fn(),
      onModuleDestroy: jest.fn(),
      user: {
        findUnique: jest.fn(
          ({
            where,
          }: {
            where: { id?: string; email?: string; googleId?: string };
          }) => {
            if (where.id) return Promise.resolve(users.get(where.id) || null);
            if (where.email) {
              return Promise.resolve(
                Array.from(users.values()).find(
                  (u) => u.email === where.email,
                ) || null,
              );
            }
            if (where.googleId) {
              return Promise.resolve(
                Array.from(users.values()).find(
                  (u) => u.googleId === where.googleId,
                ) || null,
              );
            }
            return Promise.resolve(null);
          },
        ),
        create: jest.fn(
          ({
            data,
          }: {
            data: Partial<MockUserRecord> & { email: string; name: string };
          }) => {
            const id = `user-${users.size + 1}`;
            const record: MockUserRecord = {
              id,
              email: data.email,
              name: data.name,
              password: data.password ?? null,
              picture: data.picture ?? null,
              googleId: data.googleId ?? null,
              emailVerified: data.emailVerified ?? false,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            users.set(id, record);
            return Promise.resolve(record);
          },
        ),
      },
      category: {
        findUnique: jest.fn(({ where }: { where: { id: string } }) =>
          Promise.resolve(categories.get(where.id) || null),
        ),
        create: jest.fn(
          ({
            data,
          }: {
            data: {
              name: string;
              type: 'income' | 'expense';
              colorHex?: string;
              icon?: string;
              user: { connect: { id: string } };
            };
          }) => {
            const id = `cat-${categories.size + 1}`;
            const record: MockCategoryRecord = {
              id,
              name: data.name,
              type: data.type,
              colorHex: data.colorHex ?? '#fb923c',
              icon: data.icon ?? 'Tag',
              userId: data.user.connect.id,
            };
            categories.set(id, record);
            return Promise.resolve(record);
          },
        ),
        findMany: jest.fn(({ where }: { where: { userId: string } }) =>
          Promise.resolve(
            Array.from(categories.values()).filter(
              (c) => c.userId === where.userId,
            ),
          ),
        ),
        update: jest.fn(
          ({
            where,
            data,
          }: {
            where: { id: string };
            data: Partial<MockCategoryRecord>;
          }) => {
            const existing = categories.get(where.id)!;
            const updated = { ...existing, ...data };
            categories.set(where.id, updated);
            return Promise.resolve(updated);
          },
        ),
        delete: jest.fn(({ where }: { where: { id: string } }) => {
          const existing = categories.get(where.id)!;
          categories.delete(where.id);
          return Promise.resolve(existing);
        }),
      },
      creditCard: {
        findUnique: jest.fn(({ where }: { where: { id: string } }) =>
          Promise.resolve(cards.get(where.id) || null),
        ),
        create: jest.fn(
          ({
            data,
          }: {
            data: {
              alias: string;
              lastFour: string;
              limit: number;
              closingDay: number;
              dueDay: number;
              colorHex?: string;
              user: { connect: { id: string } };
            };
          }) => {
            const id = `card-${cards.size + 1}`;
            const record: MockCardRecord = {
              id,
              alias: data.alias,
              lastFour: data.lastFour,
              limit: new Prisma.Decimal(data.limit),
              closingDay: data.closingDay,
              dueDay: data.dueDay,
              colorHex: data.colorHex ?? '#0f172a',
              userId: data.user.connect.id,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            cards.set(id, record);
            return Promise.resolve(record);
          },
        ),
        findMany: jest.fn(({ where }: { where: { userId: string } }) =>
          Promise.resolve(
            Array.from(cards.values())
              .filter((c) => c.userId === where.userId)
              .map((c) => ({ ...c, cycles: [] })),
          ),
        ),
        delete: jest.fn(({ where }: { where: { id: string } }) => {
          const existing = cards.get(where.id)!;
          cards.delete(where.id);
          return Promise.resolve(existing);
        }),
      },
      transaction: {
        count: jest.fn(
          ({
            where,
          }: {
            where?: {
              categoryId?: string;
              creditCardId?: string;
              userId?: string;
            };
          }) => {
            const list = Array.from(transactions.values()).filter((tx) => {
              if (where?.categoryId && tx.categoryId !== where.categoryId)
                return false;
              if (where?.creditCardId && tx.creditCardId !== where.creditCardId)
                return false;
              if (where?.userId && tx.userId !== where.userId) return false;
              return true;
            });
            return Promise.resolve(list.length);
          },
        ),
        create: jest.fn(
          ({
            data,
          }: {
            data: {
              amount: number;
              date: Date;
              note?: string;
              paymentMethod?: string;
              user: { connect: { id: string } };
              category: { connect: { id: string } };
              creditCard?: { connect: { id: string } };
            };
          }) => {
            const id = `tx-${transactions.size + 1}`;
            const record: MockTransactionRecord = {
              id,
              amount: new Prisma.Decimal(data.amount),
              date: data.date,
              note: data.note ?? null,
              paymentMethod:
                data.paymentMethod ??
                (data.creditCard ? 'credit_card' : 'cash'),
              installmentGroupId: null,
              userId: data.user.connect.id,
              categoryId: data.category.connect.id,
              creditCardId: data.creditCard?.connect.id ?? null,
            };
            transactions.set(id, record);
            return Promise.resolve({
              ...record,
              category: categories.get(record.categoryId),
              creditCard: record.creditCardId
                ? cards.get(record.creditCardId)
                : null,
            });
          },
        ),
        createMany: jest.fn(
          ({
            data,
          }: {
            data: Array<{
              amount: number;
              date: Date;
              note: string;
              paymentMethod: string;
              installmentGroupId: string;
              userId: string;
              categoryId: string;
              creditCardId: string | null;
            }>;
          }) => {
            for (const item of data) {
              const id = `tx-${transactions.size + 1}`;
              transactions.set(id, {
                id,
                amount: new Prisma.Decimal(item.amount),
                date: item.date,
                note: item.note,
                paymentMethod: item.paymentMethod,
                installmentGroupId: item.installmentGroupId,
                userId: item.userId,
                categoryId: item.categoryId,
                creditCardId: item.creditCardId,
              });
            }
            return Promise.resolve({ count: data.length });
          },
        ),
        findFirst: jest.fn(
          ({ where }: { where: { installmentGroupId: string } }) => {
            const match = Array.from(transactions.values())
              .filter((t) => t.installmentGroupId === where.installmentGroupId)
              .sort((a, b) => a.date.getTime() - b.date.getTime())[0];
            return Promise.resolve(match || null);
          },
        ),
        findMany: jest.fn(({ where }: { where?: { userId?: string } }) => {
          const list = Array.from(transactions.values()).filter((t) =>
            where?.userId ? t.userId === where.userId : true,
          );
          return Promise.resolve(
            list.map((t) => ({
              ...t,
              category: categories.get(t.categoryId),
              creditCard: t.creditCardId ? cards.get(t.creditCardId) : null,
            })),
          );
        }),
        aggregate: jest.fn(
          ({
            where,
          }: {
            where: {
              userId: string;
              date: { gte: Date; lt: Date };
              category: { type: 'income' | 'expense' };
              creditCardId?: null;
              paymentMethod?: string;
              OR?: Array<{
                creditCardId?: { not: null };
                paymentMethod?: string;
              }>;
            };
          }) => {
            const matching = Array.from(transactions.values()).filter((tx) => {
              if (tx.userId !== where.userId) return false;
              if (tx.date < where.date.gte || tx.date >= where.date.lt)
                return false;
              const cat = categories.get(tx.categoryId);
              if (!cat || cat.type !== where.category.type) return false;
              if (where.paymentMethod === 'cash') {
                return tx.creditCardId === null && tx.paymentMethod === 'cash';
              }
              if (where.OR) {
                return (
                  tx.creditCardId !== null || tx.paymentMethod === 'credit_card'
                );
              }
              return true;
            });
            const sum = matching.reduce(
              (acc, tx) => acc + Number(tx.amount),
              0,
            );
            return Promise.resolve({
              _sum: { amount: new Prisma.Decimal(sum) },
            });
          },
        ),
      },
      budget: {
        count: jest.fn().mockResolvedValue(0),
      },
      reminder: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ThrottlerStorage)
      .useValue(new ThrottlerStorageService())
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Lumi API is running');
  });

  it('/health (GET)', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        status: 'ok',
        database: 'connected',
      }),
    );
  });

  it('Flujo completo E2E: registro -> categoría -> tarjeta -> compra en cuotas -> resumen -> aislamiento multi-usuario -> logout', async () => {
    const server = app.getHttpServer();

    // 1. Registro de Usuario A y Usuario B
    const regA = await request(server)
      .post('/auth/register')
      .send({
        name: 'Ana Usuario',
        email: 'ana@lumi.test',
        password: 'PasswordSegura123',
      })
      .expect(201);

    const tokenA = (regA.body as { token: string }).token;
    expect(tokenA).toBeDefined();
    await request(server)
      .get('/auth/me')
      .set('Cookie', 'lumi_session=' + tokenA)
      .expect(401);
    await request(server)
      .get('/auth/me')
      .set('Authorization', 'Bearer ' + tokenA)
      .expect(200);

    const regB = await request(server)
      .post('/auth/register')
      .send({
        name: 'Beto Usuario',
        email: 'beto@lumi.test',
        password: 'PasswordSegura123',
      })
      .expect(201);

    const tokenB = (regB.body as { token: string }).token;

    // 2. Rechazar contraseña > 72 bytes UTF-8 en registro
    await request(server)
      .post('/auth/register')
      .send({
        name: 'Overflow',
        email: 'overflow@lumi.test',
        password: '😀'.repeat(19),
      })
      .expect(400);

    // 3. Usuario A crea categoría de gasto y de ingreso
    const catExpenseRes = await request(server)
      .post('/categories')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        name: 'Electrodomésticos',
        type: 'expense',
        colorHex: '#f97316',
        icon: 'ShoppingCart',
      })
      .expect(201);
    const catExpenseId = (catExpenseRes.body as { id: string }).id;

    const catIncomeRes = await request(server)
      .post('/categories')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        name: 'Sueldo',
        type: 'income',
        colorHex: '#0ea5e9',
        icon: 'Wallet',
      })
      .expect(201);
    const catIncomeId = (catIncomeRes.body as { id: string }).id;

    // 4. Usuario A crea tarjeta con cierre día 25
    const cardRes = await request(server)
      .post('/credit-cards')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        alias: 'Visa Lumi',
        lastFour: '1234',
        limit: 500000,
        closingDay: 25,
        dueDay: 5,
      })
      .expect(201);
    const cardId = (cardRes.body as { id: string }).id;

    // 5. Rechazar fecha inexistente (2026-02-31) y monto insuficiente para 12 cuotas ($0.07)
    await request(server)
      .post('/transactions')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        amount: 1000,
        categoryId: catExpenseId,
        date: '2026-02-31',
      })
      .expect(400);

    await request(server)
      .post('/transactions')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        amount: 0.07,
        categoryId: catExpenseId,
        creditCardId: cardId,
        installments: 12,
      })
      .expect(400);

    // 6. Usuario A registra ingreso y compra en 3 cuotas post-cierre (26 de enero -> primera cuota en febrero)
    await request(server)
      .post('/transactions')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        amount: 200000,
        categoryId: catIncomeId,
        date: '2026-02-05',
      })
      .expect(201);

    const firstInstRes = await request(server)
      .post('/transactions')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        amount: 30000,
        categoryId: catExpenseId,
        creditCardId: cardId,
        installments: 3,
        date: '2026-01-26',
        note: 'Microondas',
      })
      .expect(201);

    expect(
      new Date((firstInstRes.body as { date: string }).date)
        .toISOString()
        .split('T')[0],
    ).toBe('2026-02-25');

    // 7. Resumen de Febrero 2026 refleja $200.000 de ingreso y $10.000 de cuota en tarjeta
    const summaryRes = await request(server)
      .get('/transactions/summary?month=2&year=2026')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    expect(summaryRes.body).toEqual({
      period: '2/2026',
      totalIncome: 200000,
      totalCashExpense: 0,
      totalCardExpense: 10000,
      availableCash: 200000,
    });

    // 8. Aislamiento Anti-IDOR: Usuario B no puede editar la categoría ni borrar la tarjeta de Usuario A
    await request(server)
      .patch(`/categories/${catExpenseId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ name: 'Intruso' })
      .expect(404);

    await request(server)
      .delete(`/credit-cards/${cardId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(404);

    // 9. Usuario A no puede cambiar el tipo de una categoría que ya tiene transacciones ni borrar su tarjeta con consumos
    await request(server)
      .patch(`/categories/${catExpenseId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ type: 'income' })
      .expect(400);

    await request(server)
      .delete(`/credit-cards/${cardId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(400);

    // 10. Logout revoca el JWT inmediatamente (jti blacklist)
    await request(server)
      .post('/auth/logout')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    await request(server)
      .get('/auth/me')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(401);
  });
});
