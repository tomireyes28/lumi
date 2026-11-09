import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getHello(): string {
    return 'Lumi API is running';
  }

  getVersion(): { service: string; revision: string } {
    const candidate =
      process.env.RAILWAY_GIT_COMMIT_SHA || process.env.SOURCE_REVISION;
    return {
      service: 'lumi-api',
      revision:
        candidate && /^[a-f0-9]{40}$/i.test(candidate)
          ? candidate.toLowerCase()
          : 'unknown',
    };
  }

  async checkHealth() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        database: 'connected',
        timestamp: new Date().toISOString(),
        ...this.getVersion(),
      };
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        database: 'disconnected',
        timestamp: new Date().toISOString(),
      });
    }
  }
}
