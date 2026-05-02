import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  // Un "Logger" es la forma profesional de hacer console.log en NestJS
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private prisma: PrismaService) {}

 // @Cron(CronExpression.EVERY_10_SECONDS) <-- Comentamos esto para apagar el motor
  async checkDueReminders() {
      // ...
    this.logger.log('Buscando vencimientos para el día de hoy...');

    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const date = today.getDate();

    const startOfDay = new Date(Date.UTC(year, month, date, 0, 0, 0, 0));
    const endOfDay = new Date(Date.UTC(year, month, date, 23, 59, 59, 999));

    try {
      // Buscamos recordatorios que venzan HOY y no estén pagados
      const dueToday = await this.prisma.reminder.findMany({
        where: {
          dueDate: {
            gte: startOfDay,
            lte: endOfDay,
          },
          isPaid: false,
        },
        include: {
          user: true, // Traemos los datos del usuario para sacarle el mail después
        }
      });

      if (dueToday.length === 0) {
        this.logger.debug('No hay vencimientos pendientes para hoy.');
        return;
      }

      this.logger.log(`¡Encontré ${dueToday.length} recordatorios para hoy!`);
      
      for (const reminder of dueToday) {
        this.logger.debug(`-> Hay que avisarle a ${reminder.user.email} que pague: ${reminder.title}`);
        // ACÁ ES DONDE VAMOS A METER A RESEND PARA MANDAR EL MAIL
      }

    } catch (error) {
      this.logger.error('Error buscando recordatorios', error);
    }
  }
}