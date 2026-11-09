import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import type { ThrottlerStorage } from '@nestjs/throttler';
import { PrismaService } from '../prisma/prisma.service';
type ThrottlerStorageRecord = Awaited<
  ReturnType<ThrottlerStorage['increment']>
>;

@Injectable()
export class PostgresThrottlerStorage implements ThrottlerStorage {
  constructor(private readonly prisma: PrismaService) {}
  @Interval(60000)
  async cleanup(): Promise<void> {
    const now = new Date();
    await this.prisma.rateLimitBucket.deleteMany({
      where: {
        resetsAt: { lt: now },
        OR: [{ blockedUntil: null }, { blockedUntil: { lt: now } }],
      },
    });
  }
  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
  ): Promise<ThrottlerStorageRecord> {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          await tx.$executeRaw`SET LOCAL statement_timeout = '2500ms'`;
          const rows = await tx.$queryRaw<ThrottlerStorageRecord[]>`
          INSERT INTO "RateLimitBucket" AS b (id,hits,"resetsAt","blockedUntil")
          VALUES (${key},1,clock_timestamp()+${ttl}*interval '1 millisecond',NULL)
          ON CONFLICT(id) DO UPDATE SET
            hits=CASE WHEN b."blockedUntil">clock_timestamp() THEN b.hits
              WHEN b."resetsAt"<=clock_timestamp() OR b."blockedUntil" IS NOT NULL THEN 1
              ELSE LEAST(b.hits+1,${limit}+1) END,
            "resetsAt"=CASE WHEN b."blockedUntil">clock_timestamp() THEN b."resetsAt"
              WHEN b."resetsAt"<=clock_timestamp() OR b."blockedUntil" IS NOT NULL THEN clock_timestamp()+${ttl}*interval '1 millisecond'
              ELSE b."resetsAt" END,
            "blockedUntil"=CASE WHEN b."blockedUntil">clock_timestamp() THEN b."blockedUntil"
              WHEN b."resetsAt"<=clock_timestamp() OR b."blockedUntil" IS NOT NULL THEN NULL
              WHEN b.hits+1>${limit} THEN clock_timestamp()+${blockDuration}*interval '1 millisecond'
              ELSE NULL END
          RETURNING hits AS "totalHits",
            GREATEST(0,CEIL(EXTRACT(EPOCH FROM ("resetsAt"-clock_timestamp()))))::integer AS "timeToExpire",
            COALESCE("blockedUntil">clock_timestamp(),false) AS "isBlocked",
            COALESCE(GREATEST(0,CEIL(EXTRACT(EPOCH FROM ("blockedUntil"-clock_timestamp())))),0)::integer AS "timeToBlockExpire"`;
          if (!rows[0]) throw new Error('Missing counter');
          return rows[0];
        },
        { maxWait: 2000, timeout: 5000 },
      );
    } catch {
      throw new ServiceUnavailableException(
        'El control de acceso no está disponible. Reintentá.',
      );
    }
  }
}
