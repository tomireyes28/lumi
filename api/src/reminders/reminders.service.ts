import { serializable } from '../utils/serializable.util';
import { ensureOccurrences } from './occurrences';
import { getCalendarDayParts, businessDate } from '../utils/date.util';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReminderDto } from './dto/create-reminder.dto';
import { UpdateReminderDto } from './dto/update-reminder.dto';
import { Prisma } from '@prisma/client';
import {
  getMonthDateRange,
  parseLocalDate,
  calendarColumn,
} from '../utils/date.util';

@Injectable()
export class RemindersService {
  constructor(private prisma: PrismaService) {}

  private async getReminderOrThrow(id: string, userId: string) {
    const reminder = await this.prisma.reminder.findUnique({ where: { id } });
    if (!reminder || reminder.userId !== userId || reminder.isCancelled) {
      throw new NotFoundException('Recordatorio no encontrado o no autorizado');
    }
    return reminder;
  }

  async create(userId: string, createReminderDto: CreateReminderDto) {
    return serializable(this.prisma, async (tx) => {
      const rule = createReminderDto.isRecurring
        ? await tx.reminderRule.create({
            data: {
              userId,
              title: createReminderDto.title,
              amount: createReminderDto.amount,
              anchorOn: calendarColumn(
                parseLocalDate(createReminderDto.dueDate),
              ),
            },
          })
        : null;
      return tx.reminder.create({
        data: {
          title: createReminderDto.title,
          amount: createReminderDto.amount,
          dueDate: parseLocalDate(createReminderDto.dueDate),
          dueOn: calendarColumn(parseLocalDate(createReminderDto.dueDate)),
          isRecurring: createReminderDto.isRecurring ?? false,
          ruleId: rule?.id,
          occurrencePeriod: rule
            ? calendarColumn(parseLocalDate(createReminderDto.dueDate))
                .toISOString()
                .slice(0, 7)
            : null,
          userId,
        },
      });
    });
  }

  async findAllByUser(userId: string, month?: number, year?: number) {
    await ensureOccurrences(
      this.prisma,
      userId,
      month && year ? businessDate(year, month - 1, 1) : undefined,
    );
    const where: Prisma.ReminderWhereInput = { userId, isCancelled: false };
    if (month && year) {
      const { startDate, endDate } = getMonthDateRange(year, month);
      where.OR = [
        {
          dueOn: {
            gte: new Date(Date.UTC(year, month - 1, 1)),
            lt: new Date(Date.UTC(year, month, 1)),
          },
        },
        { dueOn: null, dueDate: { gte: startDate, lt: endDate } },
      ];
    }
    return this.prisma.reminder.findMany({
      where,
      orderBy: { dueDate: 'asc' },
      include: { rule: { select: { active: true } } },
    });
  }

  // ==========================================
  // NUEVO MÉTODO: UPDATE
  // ==========================================
  async update(
    id: string,
    updateReminderDto: UpdateReminderDto,
    userId: string,
  ) {
    const existing = await this.getReminderOrThrow(id, userId);

    // Tipamos el objeto correctamente usando Prisma
    const dataToUpdate: Prisma.ReminderUpdateInput = {};

    if (updateReminderDto.title !== undefined)
      dataToUpdate.title = updateReminderDto.title;
    if (updateReminderDto.amount !== undefined)
      dataToUpdate.amount = updateReminderDto.amount;
    if (updateReminderDto.isRecurring !== undefined)
      dataToUpdate.isRecurring = updateReminderDto.isRecurring;

    // Si viene la fecha, la convertimos al objeto Date preservando fecha local
    if (updateReminderDto.dueDate !== undefined) {
      dataToUpdate.dueDate = parseLocalDate(updateReminderDto.dueDate);
      dataToUpdate.dueOn = calendarColumn(
        parseLocalDate(updateReminderDto.dueDate),
      );
    }

    return serializable(this.prisma, async (tx) => {
      if (existing.ruleId)
        await tx.$queryRaw`SELECT id FROM "ReminderRule" WHERE id=${existing.ruleId} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM "Reminder" WHERE id=${id} AND "userId"=${userId} FOR UPDATE`;
      const fresh = await tx.reminder.findUnique({ where: { id } });
      if (!fresh || fresh.userId !== userId || fresh.isCancelled)
        throw new NotFoundException('Recordatorio no encontrado');
      if (!fresh.ruleId && updateReminderDto.isRecurring) {
        const rule = await tx.reminderRule.create({
          data: {
            userId,
            title: updateReminderDto.title ?? fresh.title,
            amount:
              updateReminderDto.amount === undefined
                ? fresh.amount
                : updateReminderDto.amount,
            anchorOn: updateReminderDto.dueDate
              ? calendarColumn(parseLocalDate(updateReminderDto.dueDate))
              : (fresh.dueOn ?? calendarColumn(fresh.dueDate)),
          },
        });
        dataToUpdate.rule = { connect: { id: rule.id } };
        dataToUpdate.occurrencePeriod = rule.anchorOn.toISOString().slice(0, 7);
      }
      if (existing.ruleId) {
        const rule = await tx.reminderRule.findUnique({
          where: { id: existing.ruleId },
        });
        if (!rule?.active && updateReminderDto.isRecurring === true)
          throw new BadRequestException(
            'Esta serie está detenida. Creá un recordatorio nuevo para repetir.',
          );
        await tx.$queryRaw`SELECT id FROM "ReminderRule" WHERE id=${existing.ruleId} FOR UPDATE`;
        const now = getCalendarDayParts(new Date());
        const future = new Date(
          Date.UTC(now.year, now.monthIndex, now.day + 1),
        );
        if (updateReminderDto.isRecurring === false) {
          await tx.reminderRule.update({
            where: { id: existing.ruleId },
            data: { active: false },
          });
          await tx.reminder.updateMany({
            where: {
              ruleId: existing.ruleId,
              isPaid: false,
              dueOn: { gte: future },
            },
            data: { isCancelled: true },
          });
        } else {
          await tx.reminderRule.update({
            where: { id: existing.ruleId },
            data: {
              title: updateReminderDto.title,
              amount: updateReminderDto.amount,
            },
          });
          await tx.reminder.updateMany({
            where: {
              ruleId: existing.ruleId,
              isPaid: false,
              isCancelled: false,
              dueOn: { gte: future },
            },
            data: {
              title: updateReminderDto.title,
              amount: updateReminderDto.amount,
            },
          });
        }
      }
      const today = calendarColumn(new Date());
      if ((fresh.dueOn ?? calendarColumn(fresh.dueDate)) < today) {
        delete dataToUpdate.title;
        delete dataToUpdate.amount;
      }
      if (fresh.isPaid) {
        if (!fresh.ruleId && dataToUpdate.rule)
          return tx.reminder.update({
            where: { id },
            data: {
              rule: dataToUpdate.rule,
              occurrencePeriod: dataToUpdate.occurrencePeriod,
              isRecurring: true,
            },
          });
        return fresh;
      }
      return tx.reminder.update({ where: { id }, data: dataToUpdate });
    });
  }

  async markAsPaid(id: string, userId: string) {
    await this.getReminderOrThrow(id, userId);
    return serializable(this.prisma, async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Reminder" WHERE id=${id} AND "userId"=${userId} FOR UPDATE`;
      const row = await tx.reminder.findUnique({ where: { id } });
      if (!row || row.userId !== userId || row.isCancelled)
        throw new NotFoundException('Recordatorio no encontrado');
      return tx.reminder.update({ where: { id }, data: { isPaid: true } });
    });
  }
  async remove(id: string, userId: string) {
    const existing = await this.getReminderOrThrow(id, userId);
    if (existing.isPaid)
      throw new BadRequestException(
        'Se conserva el pago registrado. Podés detener la serie desde su edición.',
      );
    return serializable(this.prisma, async (tx) => {
      if (existing.ruleId)
        await tx.$queryRaw`SELECT id FROM "ReminderRule" WHERE id=${existing.ruleId} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM "Reminder" WHERE id=${id} AND "userId"=${userId} FOR UPDATE`;
      const fresh = await tx.reminder.findUnique({ where: { id } });
      if (!fresh || fresh.userId !== userId || fresh.isCancelled)
        throw new NotFoundException('Recordatorio no encontrado');
      if (fresh.isPaid)
        throw new BadRequestException('Se conserva el pago registrado.');
      if (existing.ruleId) {
        await tx.reminderRule.update({
          where: { id: existing.ruleId },
          data: { active: false },
        });
        const p = getCalendarDayParts(new Date());
        await tx.reminder.updateMany({
          where: {
            ruleId: existing.ruleId,
            isPaid: false,
            dueOn: { gte: new Date(Date.UTC(p.year, p.monthIndex, p.day + 1)) },
          },
          data: { isCancelled: true },
        });
      }
      return tx.reminder.update({ where: { id }, data: { isCancelled: true } });
    });
  }
}
