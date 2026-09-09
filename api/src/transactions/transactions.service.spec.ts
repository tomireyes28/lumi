import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsService } from './transactions.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';

describe('TransactionsService', () => {
  let service: TransactionsService;
  let prisma: {
    category: { findUnique: jest.Mock };
    creditCard: { findUnique: jest.Mock };
    transaction: {
      create: jest.Mock;
      createMany: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      aggregate: jest.Mock;
    };
  };

  const mockUserId = 'user-uuid-1';

  beforeEach(async () => {
    prisma = {
      category: {
        findUnique: jest.fn(),
      },
      creditCard: {
        findUnique: jest.fn(),
      },
      transaction: {
        create: jest.fn(),
        createMany: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        aggregate: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create - Anti-IDOR Security Validations', () => {
    it('should throw BadRequestException if category does not belong to the user', async () => {
      prisma.category.findUnique.mockResolvedValue({
        id: 'cat-foreign',
        userId: 'other-user',
        name: 'Supermercado',
      });

      await expect(
        service.create(
          {
            amount: 500,
            categoryId: 'cat-foreign',
          },
          mockUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if credit card does not belong to the user', async () => {
      prisma.category.findUnique.mockResolvedValue({
        id: 'cat-own',
        userId: mockUserId,
        name: 'Supermercado',
      });

      prisma.creditCard.findUnique.mockResolvedValue({
        id: 'card-foreign',
        userId: 'other-user',
        name: 'Visa',
      });

      await expect(
        service.create(
          {
            amount: 500,
            categoryId: 'cat-own',
            creditCardId: 'card-foreign',
          },
          mockUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create a single transaction when installments is 1 or undefined', async () => {
      prisma.category.findUnique.mockResolvedValue({
        id: 'cat-own',
        userId: mockUserId,
      });

      const mockCreatedTx = {
        id: 'tx-1',
        amount: 250,
        userId: mockUserId,
        categoryId: 'cat-own',
      };
      prisma.transaction.create.mockResolvedValue(mockCreatedTx);

      const result = await service.create(
        {
          amount: 250,
          categoryId: 'cat-own',
          note: 'Café',
        },
        mockUserId,
      );

      expect(result).toEqual(mockCreatedTx);
      expect(prisma.transaction.create).toHaveBeenCalledTimes(1);
      expect(prisma.transaction.createMany).not.toHaveBeenCalled();
    });

    it('should create installment transactions via createMany when installments > 1', async () => {
      prisma.category.findUnique.mockResolvedValue({
        id: 'cat-own',
        userId: mockUserId,
      });
      prisma.creditCard.findUnique.mockResolvedValue({
        id: 'card-own',
        userId: mockUserId,
      });

      prisma.transaction.createMany.mockResolvedValue({ count: 3 });
      prisma.transaction.findFirst.mockResolvedValue({
        id: 'tx-installment-1',
        amount: 100,
        installmentGroupId: 'uuid-group',
      });

      const result = await service.create(
        {
          amount: 300,
          categoryId: 'cat-own',
          creditCardId: 'card-own',
          installments: 3,
          note: 'Zapatillas',
        },
        mockUserId,
      );

      expect(prisma.transaction.createMany).toHaveBeenCalledTimes(1);
      expect(prisma.transaction.findFirst).toHaveBeenCalledTimes(1);
      expect(result).toHaveProperty('installmentGroupId');
    });
  });

  describe('findAllByUser - Pagination & Filters', () => {
    it('should return plain array if no pagination params are passed (retrocompatible)', async () => {
      const mockList = [{ id: 'tx-1', amount: 100 }];
      prisma.transaction.findMany.mockResolvedValue(mockList);

      const result = await service.findAllByUser(mockUserId, {});

      expect(result).toEqual(mockList);
      expect(prisma.transaction.count).not.toHaveBeenCalled();
    });

    it('should return paginated data with meta when page and limit are specified', async () => {
      const mockList = [{ id: 'tx-1', amount: 100 }];
      prisma.transaction.count.mockResolvedValue(25);
      prisma.transaction.findMany.mockResolvedValue(mockList);

      const result = await service.findAllByUser(mockUserId, {
        page: 2,
        limit: 10,
      });

      expect(result).toEqual({
        data: mockList,
        meta: {
          total: 25,
          page: 2,
          limit: 10,
          totalPages: 3,
        },
      });

      expect(prisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
    });
  });
});
