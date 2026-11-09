import { PrismaService } from '../prisma/prisma.service';
import { serializable } from '../utils/serializable.util';
import {
  businessDate,
  calendarColumn,
  clampedBusinessDate,
  getCalendarDayParts,
} from '../utils/date.util';
export async function ensureOccurrences(
  prisma: PrismaService,
  userId?: string,
  through: Date = businessDate(
    getCalendarDayParts(new Date()).year,
    getCalendarDayParts(new Date()).monthIndex + 12,
    1,
  ),
) {
  const rules = await prisma.reminderRule.findMany({
    where: { active: true, ...(userId ? { userId } : {}) },
    select: { id: true },
  });
  for (const candidate of rules)
    await serializable(prisma, async (tx) => {
      await tx.$queryRaw`SELECT id FROM "ReminderRule" WHERE id=${candidate.id} FOR UPDATE`;
      const rule = await tx.reminderRule.findUnique({
        where: { id: candidate.id },
      });
      if (!rule?.active) return;
      const end = getCalendarDayParts(through),
        anchor = rule.anchorOn;
      const startIndex = anchor.getUTCFullYear() * 12 + anchor.getUTCMonth(),
        endIndex = end.year * 12 + end.monthIndex;
      const rows: import('@prisma/client').Prisma.ReminderCreateManyInput[] =
        [];
      for (let index = startIndex; index <= endIndex; index++) {
        const year = Math.floor(index / 12),
          month = index % 12;
        const dueDate = clampedBusinessDate(year, month, anchor.getUTCDate());
        rows.push({
          ruleId: rule.id,
          occurrencePeriod:
            String(year) + '-' + String(month + 1).padStart(2, '0'),
          userId: rule.userId,
          title: rule.title,
          amount: rule.amount,
          dueDate,
          dueOn: calendarColumn(dueDate),
          isRecurring: true,
        });
      }
      if (rows.length)
        await tx.reminder.createMany({ data: rows, skipDuplicates: true });
    });
}
