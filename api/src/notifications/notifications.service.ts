import { randomUUID } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { serializable } from '../utils/serializable.util';
import { ensureOccurrences } from '../reminders/occurrences';
import { BUSINESS_TIMEZONE, getBusinessDayRange } from '../utils/date.util';

// Leave an hour of margin before Resend's 24-hour idempotency expiry.
const RETRY_WINDOW_MS = 23 * 60 * 60 * 1000;
const MAX_ATTEMPTS = 8;

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  constructor(private readonly prisma: PrismaService) {}

  private configured() {
    const key = process.env.RESEND_API_KEY?.trim();
    return Boolean(
      key && key !== 're_your_api_key' && process.env.RESEND_FROM_EMAIL?.trim(),
    );
  }

  @Cron('0 */10 * * * *', { timeZone: BUSINESS_TIMEZONE })
  async scheduledTick() {
    const hour = Number(
      new Intl.DateTimeFormat('en-GB', {
        timeZone: BUSINESS_TIMEZONE,
        hour: '2-digit',
        hourCycle: 'h23',
      }).format(new Date()),
    );
    try {
      if (hour >= 9) await this.checkDueReminders();
      else await this.drain();
    } catch {
      this.logger.error('notification_worker_failed');
    }
  }

  async checkDueReminders(referenceDate = new Date()) {
    const { dateKey, startOfDay, endOfDay } =
      getBusinessDayRange(referenceDate);
    try {
      await ensureOccurrences(this.prisma, undefined, referenceDate);
      const due = await this.prisma.reminder.findMany({
        where: {
          isPaid: false,
          isCancelled: false,
          OR: [
            { dueOn: new Date(dateKey + 'T00:00:00Z') },
            { dueOn: null, dueDate: { gte: startOfDay, lt: endOfDay } },
          ],
        },
        include: { user: true },
      });
      if (!this.configured()) {
        this.logger.debug(`notification_config_missing pending=${due.length}`);
        return { processed: due.length, sent: 0 };
      }
      for (const reminder of due) {
        const payload = JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL!.trim(),
          to: [reminder.user.email],
          subject: `Recordatorio de vencimiento: ${reminder.title}`,
          text: `Hola ${reminder.user.name}, el ${dateKey} vence "${reminder.title}"${reminder.amount === null ? '' : ` por $${Number(reminder.amount).toLocaleString('es-AR')}`}.`,
        });
        // Immutable payload: retries must never reuse a key with different content.
        await this.prisma.notificationDelivery.createMany({
          data: [
            {
              id: `due:${reminder.id}`,
              reminderId: reminder.id,
              payload,
              nextAttemptAt: referenceDate,
            },
          ],
          skipDuplicates: true,
        });
      }
      return { processed: due.length, sent: await this.drain(referenceDate) };
    } catch {
      this.logger.error('notification_job_failed');
      return { processed: 0, sent: 0 };
    }
  }

  async drain(now = new Date()) {
    if (!this.configured()) return 0;
    const candidates = await this.prisma.notificationDelivery.findMany({
      where: {
        status: 'pending',
        nextAttemptAt: { lte: now },
        OR: [{ leaseUntil: null }, { leaseUntil: { lte: now } }],
      },
      orderBy: { nextAttemptAt: 'asc' },
      take: 100,
      select: { id: true },
    });
    let accepted = 0;
    for (const candidate of candidates) {
      const claimed = await serializable(this.prisma, async (tx) => {
        await tx.$queryRaw`SELECT id FROM "NotificationDelivery" WHERE id=${candidate.id} FOR UPDATE`;
        const row = await tx.notificationDelivery.findUnique({
          where: { id: candidate.id },
          include: { reminder: true },
        });
        if (
          !row ||
          row.status !== 'pending' ||
          row.nextAttemptAt > now ||
          (row.leaseUntil && row.leaseUntil > now)
        )
          return null;
        if (row.reminder.isPaid || row.reminder.isCancelled) {
          await tx.notificationDelivery.update({
            where: { id: row.id },
            data: { status: 'cancelled', leaseUntil: null, leaseToken: null },
          });
          return null;
        }
        if (
          row.attempts >= MAX_ATTEMPTS ||
          (row.firstAttemptAt &&
            now.getTime() - row.firstAttemptAt.getTime() >= RETRY_WINDOW_MS)
        ) {
          await tx.notificationDelivery.update({
            where: { id: row.id },
            data: {
              status: 'review',
              lastCode: 'retry_window_exhausted',
              leaseUntil: null,
              leaseToken: null,
            },
          });
          return null;
        }
        return tx.notificationDelivery.update({
          where: { id: row.id },
          data: {
            attempts: { increment: 1 },
            firstAttemptAt: row.firstAttemptAt ?? now,
            leaseUntil: new Date(now.getTime() + 60_000),
            leaseToken: randomUUID(),
          },
        });
      });
      if (!claimed) continue;
      let code = 'transport_or_timeout',
        success = false,
        retryable = true,
        providerId: string | null = null,
        retryAfterMs = 0;
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY!.trim()}`,
            'Content-Type': 'application/json',
            'Idempotency-Key': claimed.id,
          },
          body: claimed.payload,
          signal: AbortSignal.timeout(10_000),
        });
        success = response.ok;
        code = `http_${response.status}`;
        retryable =
          response.status === 429 ||
          response.status >= 500 ||
          response.status === 409;
        if (success) {
          const result: unknown = await response.json();
          if (
            result &&
            typeof result === 'object' &&
            'id' in result &&
            typeof result.id === 'string'
          )
            providerId = result.id;
          else {
            success = false;
            retryable = true;
            code = 'invalid_provider_response';
          }
        } else {
          const header = response.headers.get('retry-after');
          const seconds = header === null ? NaN : Number(header);
          const until = Number.isFinite(seconds)
            ? seconds * 1000
            : Date.parse(header ?? '') - now.getTime();
          if (Number.isFinite(until)) retryAfterMs = Math.max(0, until);
        }
      } catch {
        success = false;
        retryable = true;
        code = 'transport_or_timeout';
      }
      const nextAttemptAt = new Date(
        now.getTime() +
          Math.max(retryAfterMs, 60_000 * 2 ** (claimed.attempts - 1)),
      );
      const exhausted =
        claimed.attempts >= MAX_ATTEMPTS ||
        nextAttemptAt.getTime() - claimed.firstAttemptAt!.getTime() >=
          RETRY_WINDOW_MS;
      // Token fencing prevents an expired worker from acknowledging a new lease.
      await this.prisma.notificationDelivery.updateMany({
        where: {
          id: claimed.id,
          status: 'pending',
          leaseToken: claimed.leaseToken,
        },
        data: {
          status: success
            ? 'accepted'
            : !retryable
              ? 'failed'
              : exhausted
                ? 'review'
                : 'pending',
          acceptedAt: success ? now : null,
          providerId,
          lastCode: code,
          nextAttemptAt,
          leaseUntil: null,
          leaseToken: null,
        },
      });
      if (success) accepted++;
      this.logger.log(
        `notification_attempt status=${success ? 'accepted' : code} attempt=${claimed.attempts}`,
      );
    }
    return accepted;
  }
}
