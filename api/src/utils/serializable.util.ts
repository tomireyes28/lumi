import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
export async function serializable<T>(
  prisma: PrismaService,
  work: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.$transaction(work, {
        isolationLevel: 'Serializable',
        maxWait: 5000,
        timeout: 10000,
      });
    } catch (error: unknown) {
      const meta =
        error && typeof error === 'object' && 'meta' in error
          ? error.meta
          : undefined;
      const sqlCode =
        meta && typeof meta === 'object' && 'code' in meta
          ? meta.code
          : undefined;
      const adapter =
        meta && typeof meta === 'object' && 'driverAdapterError' in meta
          ? meta.driverAdapterError
          : undefined;
      const cause =
        adapter && typeof adapter === 'object' && 'cause' in adapter
          ? adapter.cause
          : undefined;
      const originalCode =
        cause && typeof cause === 'object' && 'originalCode' in cause
          ? cause.originalCode
          : undefined;
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error.code === 'P2034' ||
          error.code === '40001' ||
          error.code === '40P01' ||
          sqlCode === '40001' ||
          sqlCode === '40P01' ||
          originalCode === '40001' ||
          originalCode === '40P01')
      ) {
        if (attempt < 2) continue;
        throw new ConflictException(
          'El recurso cambió al mismo tiempo. Reintentá.',
        );
      }
      throw error;
    }
  }
  throw new ConflictException('No se pudo completar la operación.');
}
