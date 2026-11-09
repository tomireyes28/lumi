import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';

export class OAuthGrantStore {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    kind: string,
    payload: Record<string, string>,
    ttl: number,
  ): Promise<string> {
    const code = randomBytes(32).toString('base64url');
    await this.prisma.oAuthGrant.create({
      data: {
        id: this.hash(code),
        kind,
        payload,
        expiresAt: new Date(Date.now() + ttl),
      },
    });
    return code;
  }

  async consume(
    code: string,
    kind: string,
  ): Promise<Record<string, string> | null> {
    const rows = await this.prisma.$queryRaw<
      { payload: Record<string, string> }[]
    >`
      DELETE FROM "OAuthGrant" WHERE id=${this.hash(code)} AND kind=${kind}
        AND "expiresAt">CURRENT_TIMESTAMP RETURNING payload`;
    return rows[0]?.payload ?? null;
  }

  private hash(code: string): string {
    return createHash('sha256').update(code).digest('hex');
  }
}
