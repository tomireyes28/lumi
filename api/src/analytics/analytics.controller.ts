import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AuthGuard } from '@nestjs/passport';

interface RequestWithUser extends Request {
  user: { userId: string };
}

@UseGuards(AuthGuard('jwt')) // El mismo patovica que usamos antes
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('monthly')
  getMonthlyAnalytics(@Req() req: RequestWithUser) {
    // Le pasamos el ID de Aylu para que no vea datos de otra persona
    return this.analyticsService.getMonthlyAnalytics(req.user.userId);
  }
}