import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AnalyticsService - Forecast', () => {
  let service: AnalyticsService;
  let prisma: {
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
          creditCard: { alias: 'Visa Macro', lastFour: '1234', colorHex: '#fff' },
          category: { type: 'expense' },
        },
        {
          id: 'tx-inst-2',
          amount: 20000,
          date: new Date(currentYear, currentMonth + 1, 10),
          note: 'Heladera (Cuota 2/3)',
          installmentGroupId: 'group-heladera',
          creditCardId: 'card-1',
          creditCard: { alias: 'Visa Macro', lastFour: '1234', colorHex: '#fff' },
          category: { type: 'expense' },
        },
        {
          id: 'tx-inst-3',
          amount: 20000,
          date: new Date(currentYear, currentMonth + 2, 10),
          note: 'Heladera (Cuota 3/3)',
          installmentGroupId: 'group-heladera',
          creditCardId: 'card-1',
          creditCard: { alias: 'Visa Macro', lastFour: '1234', colorHex: '#fff' },
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
  });
});
