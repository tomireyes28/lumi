import { Prisma } from '@prisma/client';
import { moneySchema, parseHttpResponse, publicUserSchema } from './http';
describe('canonical wire contracts', () => {
  it('validates Prisma.Decimal and Date after actual JSON serialization', () => {
    const payload: unknown = JSON.parse(
      JSON.stringify([
        {
          id: 'r',
          title: 'Example',
          amount: new Prisma.Decimal('12.34'),
          dueDate: new Date('2026-11-09T15:00:00Z'),
          dueOn: null,
          isPaid: false,
          isRecurring: false,
        },
      ]),
    );
    expect(() =>
      parseHttpResponse('/reminders', 'GET', payload, 'api'),
    ).not.toThrow();
    expect(moneySchema.safeParse(null).success).toBe(false);
  });
  it('rejects incomplete finance and auth JSON without returning it to the UI', () => {
    expect(() =>
      parseHttpResponse('/transactions?page=1', 'GET', { data: [] }, 'api'),
    ).toThrow('incompatible');
    expect(
      publicUserSchema.safeParse({ id: 'u', name: 'Example', email: 42 })
        .success,
    ).toBe(false);
  });
});
