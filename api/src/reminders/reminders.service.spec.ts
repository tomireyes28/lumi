import { Test, TestingModule } from '@nestjs/testing';
import { RemindersService } from './reminders.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('RemindersService', () => {
  let service: RemindersService;
  let prisma: {
    reminder: {
      findUnique: jest.Mock;
      create: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      reminder: {
        findUnique: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RemindersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<RemindersService>(RemindersService);
  });

  it('debe crear un recordatorio preservando isRecurring y fecha local a mediodía', async () => {
    prisma.reminder.create.mockImplementation(({ data }: { data: unknown }) =>
      Promise.resolve({ id: 'rem-1', ...(data as object) }),
    );

    const res = await service.create('user-1', {
      title: 'Alquiler',
      amount: 250000,
      dueDate: '2026-10-10',
      isRecurring: true,
    });

    expect(res).toEqual(
      expect.objectContaining({
        title: 'Alquiler',
        amount: 250000,
        isRecurring: true,
        userId: 'user-1',
      }),
    );
  });

  it('debe filtrar por mes y año cuando se especifican en findAllByUser', async () => {
    prisma.reminder.findMany.mockResolvedValue([]);

    await service.findAllByUser('user-1', 10, 2026);

    expect(prisma.reminder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user-1',
          OR: [
            {
              dueOn: {
                gte: new Date('2026-10-01T00:00:00Z'),
                lt: new Date('2026-11-01T00:00:00Z'),
              },
            },
            {
              dueOn: null,
              dueDate: {
                gte: new Date('2026-10-01T03:00:00Z'),
                lt: new Date('2026-11-01T03:00:00Z'),
              },
            },
          ],
        }) as unknown,
      }),
    );
  });

  it('debe impedir marcar como pagado o eliminar un recordatorio de otro usuario (Anti-IDOR)', async () => {
    prisma.reminder.findUnique.mockResolvedValue({
      id: 'rem-foreign',
      userId: 'other-user',
    });

    await expect(service.markAsPaid('rem-foreign', 'user-1')).rejects.toThrow(
      NotFoundException,
    );
    await expect(service.remove('rem-foreign', 'user-1')).rejects.toThrow(
      NotFoundException,
    );
  });
});
