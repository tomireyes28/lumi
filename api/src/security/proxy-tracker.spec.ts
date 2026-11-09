import { createHash, createHmac } from 'node:crypto';
import type { Request } from 'express';
import { proxyTracker } from './proxy-tracker';
import { PostgresThrottlerStorage } from './postgres-throttler.storage';
import { PrismaService } from '../prisma/prisma.service';

describe('trusted proxy identity', () => {
  const originalSecret = process.env.LUMI_PROXY_SECRET;
  const originalRailway = process.env.RAILWAY_ENVIRONMENT_ID;
  const secret = 'synthetic-proxy-secret-at-least-32-characters';
  beforeEach(() => {
    process.env.LUMI_PROXY_SECRET = secret;
    delete process.env.RAILWAY_ENVIRONMENT_ID;
  });
  afterEach(() => {
    if (originalSecret === undefined) delete process.env.LUMI_PROXY_SECRET;
    else process.env.LUMI_PROXY_SECRET = originalSecret;
    if (originalRailway === undefined)
      delete process.env.RAILWAY_ENVIRONMENT_ID;
    else process.env.RAILWAY_ENVIRONMENT_ID = originalRailway;
  });
  function request(
    headers: Record<string, string>,
    rawBody = Buffer.from('{}'),
  ): Request & { rawBody: Buffer } {
    return {
      header: (name: string) => headers[name],
      method: 'POST',
      originalUrl: '/auth/login',
      rawBody,
      socket: { remoteAddress: '127.0.0.1' },
    } as unknown as Request & { rawBody: Buffer };
  }
  function signed(time = String(Date.now())) {
    const ip = '203.0.113.10';
    const digest = createHash('sha256').update('{}').digest('hex');
    return {
      'x-lumi-client-ip': ip,
      'x-lumi-proxy-time': time,
      'x-lumi-proxy-signature': createHmac('sha256', secret)
        .update([time, ip, 'POST', '/auth/login', digest].join('\n'))
        .digest('hex'),
    };
  }
  it('uses a signed identity and rejects body tampering, expiry and invented signatures', async () => {
    expect(await proxyTracker(request(signed()))).toBe('203.0.113.10');
    expect(() =>
      proxyTracker(request(signed(), Buffer.from('{"changed":true}'))),
    ).toThrow('Proxy inválido');
    expect(() =>
      proxyTracker(request(signed(String(Date.now() - 120000)))),
    ).toThrow('Proxy inválido');
    expect(() =>
      proxyTracker(
        request({ ...signed(), 'x-lumi-proxy-signature': '0'.repeat(64) }),
      ),
    ).toThrow('Proxy inválido');
  });
  it('ignores caller forwarding headers on an untrusted listener', async () => {
    expect(
      await proxyTracker(
        request({
          'x-forwarded-for': '203.0.113.25',
          'x-real-ip': '203.0.113.26',
        }),
      ),
    ).toBe('127.0.0.1');
  });
  it('fails closed when counter storage is unavailable', async () => {
    const prisma = {
      $transaction: jest.fn().mockRejectedValue(new Error('unavailable')),
    } as unknown as PrismaService;
    await expect(
      new PostgresThrottlerStorage(prisma).increment('key', 60000, 10, 60000),
    ).rejects.toMatchObject({ status: 503 });
  });
});
