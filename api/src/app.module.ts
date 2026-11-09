import { Module } from '@nestjs/common';
import type { Request } from 'express';
import { ConfigModule } from '@nestjs/config'; // <-- Importación nueva
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { TransactionsModule } from './transactions/transactions.module';
import { CreditCardsModule } from './credit-cards/credit-cards.module';
import { RemindersModule } from './reminders/reminders.module';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsModule } from './notifications/notifications.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { BudgetsModule } from './budgets/budgets.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { SecurityModule } from './security/security.module';
import { PostgresThrottlerStorage } from './security/postgres-throttler.storage';
import { proxyTracker, rateLimitKey } from './security/proxy-tracker';

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [SecurityModule],
      inject: [PostgresThrottlerStorage],
      useFactory: (storage: PostgresThrottlerStorage) => ({
        storage,
        throttlers: [{ ttl: 60000, limit: 100 }],
        getTracker: (req: Record<string, unknown>) =>
          proxyTracker(req as unknown as Request),
        generateKey: rateLimitKey,
      }),
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      ignoreEnvFile: process.env.NODE_ENV === 'test',
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    CategoriesModule,
    TransactionsModule,
    CreditCardsModule,
    RemindersModule,
    NotificationsModule,
    AnalyticsModule,
    BudgetsModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    AppService,
  ],
})
export class AppModule {}
