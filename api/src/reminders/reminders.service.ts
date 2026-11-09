import { Injectable, NotFoundException } from '@nestjs/common';
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
    if (!reminder || reminder.userId !== userId) {
      throw new NotFoundException('Recordatorio no encontrado o no autorizado');
    }
    return reminder;
  }

  async create(userId: string, createReminderDto: CreateReminderDto) {
    return this.prisma.reminder.create({
      data: {
        title: createReminderDto.title,
        amount: createReminderDto.amount,
        dueDate: parseLocalDate(createReminderDto.dueDate),
        dueOn: calendarColumn(parseLocalDate(createReminderDto.dueDate)),
        isRecurring: createReminderDto.isRecurring ?? false,
        userId,
      },
    });
  }

  async findAllByUser(userId: string, month?: number, year?: number) {
    const where: Prisma.ReminderWhereInput = { userId };
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
    await this.getReminderOrThrow(id, userId);

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

    return this.prisma.reminder.update({
      where: { id },
      data: dataToUpdate,
    });
  }

  async markAsPaid(id: string, userId: string) {
    await this.getReminderOrThrow(id, userId);
    return this.prisma.reminder.update({
      where: { id },
      data: { isPaid: true },
    });
  }

  async remove(id: string, userId: string) {
    await this.getReminderOrThrow(id, userId);
    return this.prisma.reminder.delete({ where: { id } });
  }
}
