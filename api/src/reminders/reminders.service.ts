import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; 
import { CreateReminderDto } from './dto/create-reminder.dto';
import { UpdateReminderDto } from './dto/update-reminder.dto';
import { Prisma } from '@prisma/client';

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
        dueDate: new Date(createReminderDto.dueDate), 
        userId,
      },
    });
  }

  async findAllByUser(userId: string) {
    return this.prisma.reminder.findMany({
      where: { userId },
      orderBy: { dueDate: 'asc' }, 
    });
  }

  // ==========================================
  // NUEVO MÉTODO: UPDATE
  // ==========================================
  async update(id: string, updateReminderDto: UpdateReminderDto, userId: string) {
    await this.getReminderOrThrow(id, userId);

    // Tipamos el objeto correctamente usando Prisma
    const dataToUpdate: Prisma.ReminderUpdateInput = {};
    
    if (updateReminderDto.title !== undefined) dataToUpdate.title = updateReminderDto.title;
    if (updateReminderDto.amount !== undefined) dataToUpdate.amount = updateReminderDto.amount;
    
    // Si viene la fecha, la convertimos al objeto Date que Prisma necesita
    if (updateReminderDto.dueDate !== undefined) {
      dataToUpdate.dueDate = new Date(updateReminderDto.dueDate);
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