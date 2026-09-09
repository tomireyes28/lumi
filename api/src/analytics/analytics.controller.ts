import { Controller, Get, Req, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express'; // <-- Agregamos esto para que la interfaz no tire error

interface RequestWithUser extends Request {
  user: { userId: string };
}

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('monthly')
  getMonthlyAnalytics(@Req() req: RequestWithUser) {
    return this.analyticsService.getMonthlyAnalytics(req.user.userId);
  }

  @Get('forecast')
  getForecast(@Req() req: RequestWithUser, @Query('months') months?: string) {
    const monthsCount = months ? Math.min(12, Math.max(3, parseInt(months))) : 6;
    return this.analyticsService.getForecast(req.user.userId, monthsCount);
  }
}