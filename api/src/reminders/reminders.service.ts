import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // Asegurate de que la ruta sea correcta según tu proyecto
import { CreateReminderDto } from './dto/create-reminder.dto';

@Injectable()
export class RemindersService {
  constructor(private prisma: PrismaService) {}

  create(userId: string, createReminderDto: CreateReminderDto) {
    return this.prisma.reminder.create({
      data: {
        title: createReminderDto.title,
        amount: createReminderDto.amount,
        dueDate: new Date(createReminderDto.dueDate), // Convertimos el string a Date
        userId,
      },
    });
  }

  findAllByUser(userId: string) {
    return this.prisma.reminder.findMany({
      where: { userId },
      orderBy: { dueDate: 'asc' }, // Traemos los más urgentes primero
    });
  }

  // Nuevo método: Marcar como pagado
  markAsPaid(id: string, userId: string) {
    return this.prisma.reminder.update({
      where: { id, userId }, // Requerimos el userId por seguridad
      data: { isPaid: true },
    });
  }

  remove(id: string, userId: string) {
    return this.prisma.reminder.delete({
      where: { id, userId }, // Requerimos el userId por seguridad
    });
  }
}