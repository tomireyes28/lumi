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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env', 
    }),
    ScheduleModule.forRoot(),
    PrismaModule, 
    AuthModule, CategoriesModule, TransactionsModule, CreditCardsModule, RemindersModule, NotificationsModule, AnalyticsModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}