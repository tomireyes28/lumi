import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express'; // <-- Agregamos esto para que la interfaz no tire error

interface RequestWithUser extends Request {
  user: { userId: string };
}

@UseGuards(AuthGuard('jwt'))
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('monthly')
  getMonthlyAnalytics(@Req() req: RequestWithUser) {
    return this.analyticsService.getMonthlyAnalytics(req.user.userId);
  }
}