import { Test, TestingModule } from '@nestjs/testing';
import { CreditCardsService } from './credit-cards.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('CreditCardsService', () => {
  let service: CreditCardsService;
  let prisma: {
    creditCard: {
      findUnique: jest.Mock;
      create: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    cardCycle: {
      upsert: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      delete: jest.Mock;
    };
    transaction: {
      aggregate: jest.Mock;
    };
  };

  const mockCard = {
    id: 'card-1',
    alias: 'Visa Galicia',
    lastFour: '4567',
    limit: 500000 as any,
    closingDay: 24,
    dueDay: 5,
    colorHex: '#0f172a',
    userId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    cycles: [],
  };

  beforeEach(async () => {
    prisma = {
      creditCard: {
        findUnique: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      cardCycle: {
        upsert: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
      transaction: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 15000 as any } }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreditCardsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<CreditCardsService>(CreditCardsService);
  });

  describe('getCycleDatesForCard', () => {
    it('debe usar closingDay por defecto si no hay ciclo personalizado cargado', () => {
      // 15 de Septiembre 2026: está antes del 24 de Septiembre
      const refDate = new Date(2026, 8, 15); // Month 8 is Sept
      const res = service.getCycleDatesForCard(mockCard, refDate);

      expect(res.month).toBe(9);
      expect(res.year).toBe(2026);
      expect(res.isCustom).toBe(false);
      expect(res.closingDate.getDate()).toBe(24);
      expect(res.closingDate.getMonth()).toBe(8);
      expect(res.daysToClose).toBe(9);
    });

    it('debe usar la fecha exacta personalizada de CardCycle si existe', () => {
      const cardWithCustomCycle = {
        ...mockCard,
        cycles: [
          {
            id: 'cycle-1',
            creditCardId: 'card-1',
            month: 9,
            year: 2026,
            closingDate: new Date(2026, 8, 25, 12, 0, 0), // Cierra el 25 en vez del 24
            dueDate: new Date(2026, 9, 7, 12, 0, 0),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };

      // 15 de Septiembre 2026
      const refDate = new Date(2026, 8, 15);
      const res = service.getCycleDatesForCard(cardWithCustomCycle, refDate);

      expect(res.month).toBe(9);
      expect(res.year).toBe(2026);
      expect(res.isCustom).toBe(true);
      expect(res.closingDate.getDate()).toBe(25);
      expect(res.dueDate?.getDate()).toBe(7);
      expect(res.daysToClose).toBe(10);
    });

    it('debe avanzar al ciclo del mes siguiente si la fecha de cierre ya pasó', () => {
      // 26 de Septiembre 2026 (ya cerró Septiembre)
      const refDate = new Date(2026, 8, 26);
      const res = service.getCycleDatesForCard(mockCard, refDate);

      expect(res.month).toBe(10);
      expect(res.year).toBe(2026);
      expect(res.closingDate.getMonth()).toBe(9); // Octubre
      expect(res.closingDate.getDate()).toBe(24);
    });
  });

  describe('upsertCycle', () => {
    it('debe guardar el ciclo mensual si la tarjeta pertenece al usuario', async () => {
      prisma.creditCard.findUnique.mockResolvedValue(mockCard);
      prisma.cardCycle.upsert.mockResolvedValue({
        id: 'cycle-1',
        creditCardId: 'card-1',
        month: 10,
        year: 2026,
        closingDate: new Date('2026-10-25'),
        dueDate: new Date('2026-11-06'),
      });

      const res = await service.upsertCycle(
        'card-1',
        { month: 10, year: 2026, closingDate: '2026-10-25', dueDate: '2026-11-06' },
        'user-1',
      );

      expect(prisma.creditCard.findUnique).toHaveBeenCalledWith({ where: { id: 'card-1' } });
      expect(prisma.cardCycle.upsert).toHaveBeenCalled();
      expect(res.month).toBe(10);
    });

    it('debe arrojar NotFoundException si la tarjeta no pertenece al usuario (Anti-IDOR)', async () => {
      prisma.creditCard.findUnique.mockResolvedValue({ ...mockCard, userId: 'other-user' });

      await expect(
        service.upsertCycle(
          'card-1',
          { month: 10, year: 2026, closingDate: '2026-10-25' },
          'user-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getBestCardToUse', () => {
    it('debe recomendar la tarjeta con más días restantes hasta su cierre', async () => {
      const cardA = { ...mockCard, id: 'card-a', alias: 'Visa', closingDay: 20 };
      const cardB = { ...mockCard, id: 'card-b', alias: 'Mastercard', closingDay: 28 };

      prisma.creditCard.findMany.mockResolvedValue([cardA, cardB]);

      // Supongamos hoy es 15 de Septiembre
      const refDate = new Date(2026, 8, 15);
      const recommendation = await service.getBestCardToUse('user-1', refDate);
      expect(recommendation).not.toBeNull();
      // cardB cierra el 28 (13 días), cardA cierra el 20 (5 días)
      expect(recommendation?.card.id).toBe('card-b');
      expect(recommendation?.daysToClose).toBeGreaterThan(5);
    });
  });
});
