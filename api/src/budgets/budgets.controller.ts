import { Controller, Get, Post, Body, Param, Delete, UseGuards, Req, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { BudgetsService } from './budgets.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { GetBudgetsQueryDto } from './dto/get-budgets-query.dto';
import type { AuthenticatedRequest } from '../auth/interfaces/auth.interfaces';

@ApiTags('Budgets')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('budgets')
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @ApiOperation({ summary: 'Crear o actualizar presupuesto mensual para una categoría' })
  @Post()
  upsert(@Body() dto: CreateBudgetDto, @Req() req: AuthenticatedRequest) {
    return this.budgetsService.upsert(req.user.userId, dto);
  }

  @ApiOperation({ summary: 'Obtener presupuestos y ejecución mensual con estados de alerta' })
  @Get()
  findAll(@Req() req: AuthenticatedRequest, @Query() query: GetBudgetsQueryDto) {
    return this.budgetsService.findAll(req.user.userId, query.month, query.year);
  }

  @ApiOperation({ summary: 'Eliminar presupuesto de una categoría' })
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.budgetsService.remove(id, req.user.userId);
  }
}
