import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { Cron, CronExpression } from '@nestjs/schedule';

type ReminderWithUser = Prisma.ReminderGetPayload<{
  include: { user: true };
}>;

const BUSINESS_TIMEZONE = 'America/Argentina/Buenos_Aires';
const MAX_IDEMPOTENCY_CACHE_SIZE = 5000;

export function maskEmailAddress(email: string): string {
  const [localPart, domain] = email.split('@');
  if (!localPart || !domain) return '***';
  const visiblePrefix = localPart.slice(0, 1);
  return `${visiblePrefix}***@${domain}`;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly sentNotifications = new Map<string, number>();

  constructor(private readonly prisma: PrismaService) {}

  private getBusinessDayRange(referenceDate: Date = new Date()): {
    dateKey: string;
    startOfDay: Date;
    endOfDay: Date;
  } {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: BUSINESS_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const dateKey = formatter.format(referenceDate);
    const [yearStr, monthStr, dayStr] = dateKey.split('-');
    const year = Number(yearStr);
    const monthIndex = Number(monthStr) - 1;
    const day = Number(dayStr);

    const startOfDay = new Date(year, monthIndex, day, 0, 0, 0, 0);
    const endOfDay = new Date(year, monthIndex, day, 23, 59, 59, 999);
    return { dateKey, startOfDay, endOfDay };
  }

  private hasActiveResendConfig(): boolean {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    return Boolean(apiKey && apiKey !== 're_your_api_key');
  }

  @Cron(CronExpression.EVERY_DAY_AT_9AM, { timeZone: BUSINESS_TIMEZONE })
  async checkDueReminders(referenceDate: Date = new Date()) {
    const { dateKey, startOfDay, endOfDay } =
      this.getBusinessDayRange(referenceDate);

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
        },
      });

      if (dueToday.length === 0) {
        this.logger.debug(`Sin vencimientos pendientes para ${dateKey}.`);
        return { processed: 0, sent: 0 };
      }

      if (!this.hasActiveResendConfig()) {
        this.logger.debug(
          `Se detectaron ${dueToday.length} recordatorios para ${dateKey}, pero RESEND_API_KEY no está configurada (modo local sin envío de email).`,
        );
        return { processed: dueToday.length, sent: 0 };
      }

      let sentCount = 0;
      for (const reminder of dueToday) {
        const sent = await this.sendEmailNotification(reminder, dateKey);
        if (sent) sentCount += 1;
      }

      return { processed: dueToday.length, sent: sentCount };
    } catch (error) {
      this.logger.error('Error procesando recordatorios del día', error);
      return { processed: 0, sent: 0 };
    }
  }

  async sendEmailNotification(
    reminder: ReminderWithUser,
    dateKey?: string,
  ): Promise<boolean> {
    const effectiveDateKey =
      dateKey || this.getBusinessDayRange(new Date()).dateKey;
    const idempotencyKey = `${reminder.id}:${effectiveDateKey}`;

    if (this.sentNotifications.has(idempotencyKey)) {
      return false;
    }

    const apiKey = process.env.RESEND_API_KEY?.trim();
    if (!apiKey || apiKey === 're_your_api_key') {
      return false;
    }

    const fromAddress =
      process.env.RESEND_FROM_EMAIL?.trim() || 'Lumi Finanzas <onboarding@resend.dev>';
    const maskedEmail = maskEmailAddress(reminder.user.email);

    try {
      const amountLabel =
        reminder.amount !== null && reminder.amount !== undefined
          ? ` por $${Number(reminder.amount).toLocaleString('es-AR')}`
          : '';

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [reminder.user.email],
          subject: `Recordatorio de vencimiento hoy: ${reminder.title}`,
          text: `Hola ${reminder.user.name}, te recordamos que hoy vence "${reminder.title}"${amountLabel}.`,
        }),
      });

      if (!response.ok) {
        this.logger.warn(
          `Resend devolvió HTTP ${response.status} para reminderId=${reminder.id} (${maskedEmail})`,
        );
        return false;
      }

      if (this.sentNotifications.size >= MAX_IDEMPOTENCY_CACHE_SIZE) {
        const oldestKey = this.sentNotifications.keys().next().value;
        if (oldestKey) this.sentNotifications.delete(oldestKey);
      }
      this.sentNotifications.set(idempotencyKey, Date.now());

      this.logger.log(
        `Notificación enviada para reminderId=${reminder.id} (${maskedEmail})`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Falló el envío de correo para reminderId=${reminder.id} (${maskedEmail})`,
        error,
      );
      return false;
    }
  }
}
