import { Controller, Get, Req, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { AuthGuard } from '@nestjs/passport';
import { GetForecastQueryDto } from './dto/get-forecast-query.dto';
import type { AuthenticatedRequest } from '../auth/interfaces/auth.interfaces';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @ApiOperation({ summary: 'Obtener comparativa mensual de gastos por categoría' })
  @Get('monthly')
  getMonthlyAnalytics(@Req() req: AuthenticatedRequest) {
    return this.analyticsService.getMonthlyAnalytics(req.user.userId);
  }

  @ApiOperation({ summary: 'Obtener proyección de flujo de caja y planes de cuotas activos' })
  @Get('forecast')
  getForecast(@Req() req: AuthenticatedRequest, @Query() query: GetForecastQueryDto) {
    const monthsCount = query.months ?? 6;
    return this.analyticsService.getForecast(req.user.userId, monthsCount);
  }
}
