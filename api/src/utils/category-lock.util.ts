import { Prisma } from '@prisma/client';
/** Call only inside the serializable write transaction. All category writers use this lock. */
export async function ownedCategory(
  tx: Prisma.TransactionClient,
  id: string,
  userId: string,
) {
  await tx.$queryRaw`SELECT id FROM "Category" WHERE id=${id} AND "userId"=${userId} FOR UPDATE`;
  const category = await tx.category.findUnique({ where: { id } });
  return category?.userId === userId ? category : null;
}
