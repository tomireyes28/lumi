import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AnalyticsService - Forecast', () => {
  let service: AnalyticsService;
  let prisma: {
    reminderRule: { findMany: jest.Mock; create: jest.Mock };
    $transaction: jest.Mock;
    $queryRaw: jest.Mock;
    transaction: {
      findMany: jest.Mock;
      aggregate: jest.Mock;
    };
    reminder: {
      findMany: jest.Mock;
    };
  };

  const mockUserId = 'user-test-uuid';

  beforeEach(async () => {
    prisma = {
      reminderRule: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({ id: 'rule-test' }),
      },
      $transaction: jest.fn((fn: (tx: unknown) => unknown) => fn(prisma)),
      $queryRaw: jest.fn().mockResolvedValue([]),
      transaction: {
        findMany: jest.fn(),
        aggregate: jest.fn(),
      },
      reminder: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getForecast', () => {
    it('should project cashflow and consolidate active installment plans', async () => {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();

      // Mock past incomes (e.g. 300,000 across 3 months -> 100,000 average)
      const mockPastIncomes = [
        { amount: 100000, date: new Date(currentYear, currentMonth - 2, 1) },
        { amount: 100000, date: new Date(currentYear, currentMonth - 1, 1) },
        { amount: 100000, date: new Date(currentYear, currentMonth - 3, 1) },
      ];

      // Future transactions (Installments)
      const mockFutureTransactions = [
        {
          id: 'tx-inst-1',
          amount: 20000,
          date: new Date(currentYear, currentMonth, 10),
          note: 'Heladera (Cuota 1/3)',
          installmentGroupId: 'group-heladera',
          creditCardId: 'card-1',
          creditCard: {
            alias: 'Visa Macro',
            lastFour: '1234',
            colorHex: '#fff',
          },
          category: { type: 'expense' },
        },
        {
          id: 'tx-inst-2',
          amount: 20000,
          date: new Date(currentYear, currentMonth + 1, 10),
          note: 'Heladera (Cuota 2/3)',
          installmentGroupId: 'group-heladera',
          creditCardId: 'card-1',
          creditCard: {
            alias: 'Visa Macro',
            lastFour: '1234',
            colorHex: '#fff',
          },
          category: { type: 'expense' },
        },
        {
          id: 'tx-inst-3',
          amount: 20000,
          date: new Date(currentYear, currentMonth + 2, 10),
          note: 'Heladera (Cuota 3/3)',
          installmentGroupId: 'group-heladera',
          creditCardId: 'card-1',
          creditCard: {
            alias: 'Visa Macro',
            lastFour: '1234',
            colorHex: '#fff',
          },
          category: { type: 'expense' },
        },
      ];

      const mockReminders = [
        {
          id: 'rem-1',
          title: 'Internet',
          amount: 15000,
          dueDate: new Date(currentYear, currentMonth, 20),
          isPaid: false,
        },
        {
          id: 'rem-paid',
          title: 'Expensas viejas pagadas',
          amount: 50000,
          dueDate: new Date(currentYear, currentMonth - 2, 10),
          isPaid: true,
        },
      ];

      prisma.transaction.findMany
        .mockResolvedValueOnce(mockPastIncomes)
        .mockResolvedValueOnce(mockFutureTransactions)
        .mockResolvedValueOnce(mockFutureTransactions); // allInstallmentTransactions

      prisma.reminder.findMany.mockResolvedValue(mockReminders);

      const forecast = await service.getForecast(mockUserId, 6);

      expect(forecast.monthsCount).toBe(6);
      expect(forecast.estimatedMonthlyIncome).toBe(100000);
      expect(forecast.forecastTimeline).toHaveLength(6);

      // Mes 1: 20,000 cuota + 15,000 reminder impago = 35,000 total comprometido (ignora el pagado de 50,000)
      const m1 = forecast.forecastTimeline[0];
      expect(m1.installmentExpenses).toBe(20000);
      expect(m1.fixedExpenses).toBe(15000);
      expect(m1.totalCommitted).toBe(35000);
      expect(m1.projectedNetCashflow).toBe(65000); // 100,000 - 35,000
      expect(m1.commitmentRatio).toBe(35);

      // Verificamos active plans
      expect(forecast.activePlans).toHaveLength(1);
      const plan = forecast.activePlans[0];
      expect(plan.concept).toBe('Heladera');
      expect(plan.totalInstallments).toBe(3);
      expect(plan.remainingInstallments).toBe(3);
      expect(plan.elapsedInstallments).toBe(0);
      expect(plan.remainingAmount).toBe(60000);
      expect(plan.creditCard?.alias).toBe('Visa Macro');
      expect(forecast.totalFutureDebt).toBe(60000);
      expect(forecast.debtFreePeriod).toBeDefined();
    });

    it('should divide past income by actual active months (1 month instead of 3 for new users)', async () => {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();

      // Usuario con solo 1 mes de historial de ingresos ($180,000)
      const mockPastIncomes = [
        { amount: 180000, date: new Date(currentYear, currentMonth - 1, 5) },
      ];

      prisma.transaction.findMany
        .mockResolvedValueOnce(mockPastIncomes)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      prisma.reminder.findMany.mockResolvedValue([]);

      const forecast = await service.getForecast(mockUserId, 3);

      expect(forecast.estimatedMonthlyIncome).toBe(180000);
    });

    it('should not project one-off reminders into future months, and should project recurring reminders even after paying current month', async () => {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();

      prisma.transaction.findMany
        .mockResolvedValueOnce([
          { amount: 100000, date: new Date(currentYear, currentMonth - 1, 5) },
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      prisma.reminder.findMany.mockResolvedValue([
        {
          id: 'rem-oneoff',
          title: 'Patente anual',
          amount: 10000,
          dueDate: new Date(currentYear, currentMonth, 15),
          isPaid: false,
          isRecurring: false,
        },
        {
          id: 'rem-recurring-paid',
          title: 'Alquiler',
          amount: 40000,
          dueDate: new Date(currentYear, currentMonth, 5),
          isPaid: true,
          isRecurring: true,
        },
        ...[1, 2].map((offset) => ({
          id: 'occurrence-' + offset,
          title: 'Alquiler',
          amount: 40000,
          dueDate: new Date(currentYear, currentMonth + offset, 5, 12),
          isPaid: false,
          isRecurring: true,
        })),
      ]);

      const forecast = await service.getForecast(mockUserId, 3);

      // Mes 0: solo el puntual impago (10,000); el recurrente ya fue pagado este mes
      expect(forecast.forecastTimeline[0].fixedExpenses).toBe(10000);
      // Meses 1 y 2: el puntual no se repite (0) y el recurrente sí se proyecta (40,000)
      expect(forecast.forecastTimeline[1].fixedExpenses).toBe(40000);
      expect(forecast.forecastTimeline[2].fixedExpenses).toBe(40000);
    });

    it('should return unavailable ratio when income is zero with obligations', async () => {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();

      prisma.transaction.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      prisma.reminder.findMany.mockResolvedValue([
        {
          id: 'rem-1',
          title: 'Luz',
          amount: 25000,
          dueDate: new Date(currentYear, currentMonth, 15),
          isPaid: false,
          isRecurring: false,
        },
      ]);

      const forecast = await service.getForecast(mockUserId, 3);
      expect(forecast.estimatedMonthlyIncome).toBe(0);
      expect(forecast.averageCommitmentRatio).toBeNull();
      expect(forecast.ratioStatus).toBe('no_income');
    });

    it.each([3, 6, 12])(
      'keeps current income independent of a %s month horizon',
      async (horizon) => {
        prisma.transaction.findMany
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([
            {
              amount: 100,
              date: new Date('2026-11-05T15:00:00Z'),
              category: { type: 'income' },
            },
            {
              amount: 900,
              date: new Date('2026-12-05T15:00:00Z'),
              category: { type: 'income' },
            },
          ])
          .mockResolvedValueOnce([]);
        prisma.reminder.findMany.mockResolvedValue([
          {
            amount: 150,
            dueDate: new Date('2026-11-20T15:00:00Z'),
            isPaid: false,
          },
        ]);
        const result = await service.getForecast(
          mockUserId,
          horizon,
          new Date('2026-11-09T15:00:00Z'),
        );
        expect(result.estimatedMonthlyIncome).toBe(100);
        expect(result.forecastTimeline[0].commitmentRatio).toBe(150);
        expect(result.forecastTimeline[0].ratioStatus).toBe('available');
      },
    );
    it('does not treat future-only income as the current income base', async () => {
      prisma.transaction.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            amount: 900,
            date: new Date('2026-12-05T15:00:00Z'),
            category: { type: 'income' },
          },
        ])
        .mockResolvedValueOnce([]);
      prisma.reminder.findMany.mockResolvedValue([]);
      const result = await service.getForecast(
        mockUserId,
        12,
        new Date('2026-11-09T15:00:00Z'),
      );
      expect(result.estimatedMonthlyIncome).toBe(0);
      expect(result.forecastTimeline[0].commitmentRatio).toBeNull();
      expect(result.averageCommitmentRatio).toBeNull();
    });
  });
});
