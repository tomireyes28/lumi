import { Test, TestingModule } from '@nestjs/testing';
import { BudgetsService } from './budgets.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('BudgetsService', () => {
  let service: BudgetsService;
  let prisma: {
    category: { findUnique: jest.Mock };
    budget: {
      upsert: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      delete: jest.Mock;
    };
    transaction: { findMany: jest.Mock };
  };

  const mockUserId = 'user-123';

  beforeEach(async () => {
    prisma = {
      category: { findUnique: jest.fn() },
      budget: {
        upsert: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
      transaction: { findMany: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BudgetsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<BudgetsService>(BudgetsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('upsert', () => {
    it('should throw BadRequestException if category does not belong to user (Anti-IDOR)', async () => {
      prisma.category.findUnique.mockResolvedValue({
        id: 'cat-foreign',
        userId: 'other-user',
        type: 'expense',
      });

      await expect(
        service.upsert(mockUserId, {
          categoryId: 'cat-foreign',
          amount: 50000,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if category is of type income', async () => {
      prisma.category.findUnique.mockResolvedValue({
        id: 'cat-income',
        userId: mockUserId,
        type: 'income',
      });

      await expect(
        service.upsert(mockUserId, {
          categoryId: 'cat-income',
          amount: 50000,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should upsert budget for a valid expense category', async () => {
      prisma.category.findUnique.mockResolvedValue({
        id: 'cat-expense',
        userId: mockUserId,
        type: 'expense',
      });

      const mockBudget = {
        id: 'b-1',
        userId: mockUserId,
        categoryId: 'cat-expense',
        amount: 50000,
      };
      prisma.budget.upsert.mockResolvedValue(mockBudget);

      const result = await service.upsert(mockUserId, {
        categoryId: 'cat-expense',
        amount: 50000,
      });

      expect(result).toEqual(mockBudget);
      expect(prisma.budget.upsert).toHaveBeenCalledTimes(1);
    });
  });

  describe('findAll and progress calculation', () => {
    it('should calculate budget execution status (ok, warning, exceeded)', async () => {
      prisma.budget.findMany.mockResolvedValue([
        {
          id: 'b-1',
          categoryId: 'cat-1',
          amount: 10000,
          category: { id: 'cat-1', name: 'Super', colorHex: '#fff', icon: 'cart' },
        },
        {
          id: 'b-2',
          categoryId: 'cat-2',
          amount: 5000,
          category: { id: 'cat-2', name: 'Ocio', colorHex: '#fff', icon: 'film' },
        },
        {
          id: 'b-3',
          categoryId: 'cat-3',
          amount: 2000,
          category: { id: 'cat-3', name: 'Cafe', colorHex: '#fff', icon: 'coffee' },
        },
      ]);

      prisma.transaction.findMany.mockResolvedValue([
        { categoryId: 'cat-1', amount: 5000 }, // 50% -> ok
        { categoryId: 'cat-2', amount: 4000 }, // 80% -> warning
        { categoryId: 'cat-3', amount: 2500 }, // 125% -> exceeded
      ]);

      const result = await service.findAll(mockUserId, 3, 2026);

      expect(result.totalBudgeted).toBe(17000);
      expect(result.totalSpent).toBe(11500);
      expect(result.items).toHaveLength(3);

      const item1 = result.items.find((i) => i.categoryId === 'cat-1');
      expect(item1?.status).toBe('ok');
      expect(item1?.percentageSpent).toBe(50);
      expect(item1?.remainingAmount).toBe(5000);

      const item2 = result.items.find((i) => i.categoryId === 'cat-2');
      expect(item2?.status).toBe('warning');
      expect(item2?.percentageSpent).toBe(80);

      const item3 = result.items.find((i) => i.categoryId === 'cat-3');
      expect(item3?.status).toBe('exceeded');
      expect(item3?.percentageSpent).toBe(125);
      expect(item3?.remainingAmount).toBe(0);
    });
  });

  describe('remove', () => {
    it('should throw NotFoundException if budget does not exist or belongs to another user', async () => {
      prisma.budget.findUnique.mockResolvedValue({
        id: 'b-foreign',
        userId: 'other-user',
      });

      await expect(service.remove('b-foreign', mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should delete budget if belongs to user', async () => {
      prisma.budget.findUnique.mockResolvedValue({
        id: 'b-own',
        userId: mockUserId,
      });
      prisma.budget.delete.mockResolvedValue({ id: 'b-own' });

      const result = await service.remove('b-own', mockUserId);
      expect(result).toEqual({ id: 'b-own' });
      expect(prisma.budget.delete).toHaveBeenCalledWith({ where: { id: 'b-own' } });
    });
  });
});
