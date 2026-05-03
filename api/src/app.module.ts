import { Module } from '@nestjs/common';
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
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60000, // Tiempo de vida en milisegundos (1 minuto)
      limit: 100, // Límite de peticiones por IP en ese tiempo
    }]),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env', 
    }),
    ScheduleModule.forRoot(),
    PrismaModule, 
    AuthModule, CategoriesModule, TransactionsModule, CreditCardsModule, RemindersModule, NotificationsModule, AnalyticsModule
  ],
  controllers: [AppController],
  providers: [{
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    }, AppService],
})
export class AppModule {}