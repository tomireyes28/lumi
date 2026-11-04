import { Test, TestingModule } from '@nestjs/testing';
import {
  NotificationsService,
  maskEmailAddress,
} from './notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: {
    reminder: {
      findMany: jest.Mock;
    };
  };
  const originalEnv = process.env;

  beforeEach(async () => {
    process.env = { ...originalEnv };
    prisma = {
      reminder: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it('debe enmascarar direcciones de email para no exponer PII en logs', () => {
    expect(maskEmailAddress('usuario@ejemplo.com')).toBe('u***@ejemplo.com');
  });

  it('debe omitir el envío si RESEND_API_KEY no está configurada', async () => {
    delete process.env.RESEND_API_KEY;
    prisma.reminder.findMany.mockResolvedValue([
      {
        id: 'rem-1',
        title: 'Luz',
        amount: new Prisma.Decimal(15000),
        dueDate: new Date(),
        isPaid: false,
        isRecurring: false,
        userId: 'u-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: 'u-1',
          email: 'user@example.com',
          name: 'User',
        },
      },
    ]);

    const fetchSpy = jest.spyOn(global, 'fetch');
    const res = await service.checkDueReminders(new Date(2026, 9, 15, 12));

    expect(res).toEqual({ processed: 1, sent: 0 });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('debe enviar el correo vía Resend con Idempotency-Key y evitar duplicados en el mismo día', async () => {
    process.env.RESEND_API_KEY = 're_live_valid_key';
    const mockReminder = {
      id: 'rem-1',
      title: 'Internet',
      amount: new Prisma.Decimal(20000),
      dueDate: new Date(2026, 9, 15, 12),
      isPaid: false,
      isRecurring: true,
      userId: 'u-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      user: {
        id: 'u-1',
        email: 'user@example.com',
        name: 'User',
      },
    };
    prisma.reminder.findMany.mockResolvedValue([mockReminder]);

    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
    } as Response);

    const firstRun = await service.checkDueReminders(new Date(2026, 9, 15, 12));
    const secondRun = await service.checkDueReminders(new Date(2026, 9, 15, 12));

    expect(firstRun).toEqual({ processed: 1, sent: 1 });
    expect(secondRun).toEqual({ processed: 1, sent: 0 });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer re_live_valid_key',
          'Idempotency-Key': 'rem-1:2026-10-15',
        }) as unknown,
      }),
    );
  });
});
