import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client'; // <-- Importamos Prisma

// ¡La magia de Prisma! Tipamos exactamente lo que devuelve la consulta con el include
type ReminderWithUser = Prisma.ReminderGetPayload<{
  include: { user: true }
}>;

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private prisma: PrismaService) {}

  async checkDueReminders() {
    this.logger.log('Buscando vencimientos para el día de hoy...');

    const today = new Date();
    
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    try {
      const dueToday = await this.prisma.reminder.findMany({
        where: {
          dueDate: {
            gte: startOfDay,
            lte: endOfDay,
          },
          isPaid: false,
        },
        include: {
          user: true, 
        }
      });

      if (dueToday.length === 0) {
        this.logger.debug('No hay vencimientos pendientes para hoy.');
        return;
      }

      this.logger.log(`¡Encontré ${dueToday.length} recordatorios para hoy!`);
      
      await Promise.all(
        dueToday.map(reminder => this.sendEmailNotification(reminder))
      );

    } catch (error) {
      this.logger.error('Error buscando recordatorios', error);
    }
  }

  // 👇 Reemplazamos 'any' por nuestro tipo estricto
  private async sendEmailNotification(reminder: ReminderWithUser) {
    try {
      // Agregamos un await fantasma para que el linter no se queje hasta que integremos Resend
      await Promise.resolve(); 
      
      this.logger.debug(`-> Preparando mail para ${reminder.user.email} | Vence: ${reminder.title}`);
      
      // ACÁ VAMOS A METER A RESEND EN EL PRÓXIMO PASO
      
    } catch (error) {
      this.logger.error(`Falló el envío de correo a ${reminder.user.email}`, error);
    }
  }
}