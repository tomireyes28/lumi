import { createHmac, createHash, timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';
import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export function proxyTracker(
  req: Request & { rawBody?: Buffer },
): Promise<string> {
  const ip = req.header('x-lumi-client-ip');
  const time = req.header('x-lumi-proxy-time');
  const signature = req.header('x-lumi-proxy-signature');
  if (ip || time || signature) {
    const secret = process.env.LUMI_PROXY_SECRET;
    if (
      !secret ||
      secret.length < 32 ||
      !ip ||
      !isIP(ip) ||
      !time ||
      !/^\d{13}$/.test(time) ||
      Math.abs(Date.now() - Number(time)) > 60000 ||
      !signature ||
      !/^[a-f0-9]{64}$/.test(signature)
    )
      throw new UnauthorizedException('Proxy inválido');
    const bodyHash = createHash('sha256')
      .update(req.rawBody ?? Buffer.alloc(0))
      .digest('hex');
    const expected = createHmac('sha256', secret)
      .update([time, ip, req.method, req.originalUrl, bodyHash].join('\n'))
      .digest('hex');
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected)))
      throw new UnauthorizedException('Proxy inválido');
    return Promise.resolve(ip);
  }
  // Railway public HTTP ingress supplies this header. Do not trust caller XFF
  // or a hop count. Private services in the same project remain trusted peers.
  const edgeIp = process.env.RAILWAY_ENVIRONMENT_ID
    ? req.header('x-real-ip')
    : undefined;
  return Promise.resolve(
    edgeIp && isIP(edgeIp)
      ? edgeIp
      : req.socket.remoteAddress || 'unknown-peer',
  );
}

export function rateLimitKey(
  context: ExecutionContext,
  tracker: string,
  name: string,
): string {
  const controller = context.getClass().name;
  const handler = context.getHandler().name;
  const route =
    controller === 'AuthController' &&
    ['login', 'register', 'exchangeCode'].includes(handler)
      ? 'credentials'
      : handler;
  return createHmac(
    'sha256',
    process.env.LUMI_PROXY_SECRET || 'local-development-rate-key',
  )
    .update([controller, route, name, tracker].join(':'))
    .digest('hex');
}
