import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma/prisma.service';

describe('NotificationsService configuration', () => {
  it('does not send without an explicit sender and key', async () => {
    const env = process.env;
    process.env = { ...env, RESEND_API_KEY: '', RESEND_FROM_EMAIL: '' };
    const fetchSpy = jest.spyOn(global, 'fetch');
    try {
      expect(await new NotificationsService({} as PrismaService).drain()).toBe(
        0,
      );
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      process.env = env;
      fetchSpy.mockRestore();
    }
  });
});
