import { Controller, Get, Post, Body, Param, Delete, UseGuards, Req, Patch } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CreditCardsService } from './credit-cards.service';
import { CreateCreditCardDto } from './dto/create-credit-card.dto';
import { UpdateCreditCardDto } from './dto/update-credit-card.dto';
import { UpsertCardCycleDto } from './dto/upsert-card-cycle.dto';
import { AuthGuard } from '@nestjs/passport';
import type { AuthenticatedRequest, RequestWithUser } from '../auth/interfaces/auth.interfaces'; 

@ApiTags('Credit Cards')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('credit-cards')
export class CreditCardsController {
  constructor(private readonly creditCardsService: CreditCardsService) {}

  @ApiOperation({ summary: 'Crear una nueva tarjeta de crédito' })
  @Post()
  create(@Body() createCreditCardDto: CreateCreditCardDto, @Req() req: RequestWithUser) {
    return this.creditCardsService.create(createCreditCardDto, req.user.userId);
  }

  @ApiOperation({ summary: 'Obtener todas las tarjetas del usuario con ciclo actual y consumos' })
  @Get()
  findAll(@Req() req: RequestWithUser) {
    return this.creditCardsService.findAllByUser(req.user.userId);
  }

  @ApiOperation({ summary: 'Eliminar una tarjeta de crédito' })
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.creditCardsService.remove(id, req.user.userId);
  }

  @ApiOperation({ summary: 'Recomendación de mejor tarjeta a usar hoy según días hasta el cierre' })
  @Get('recommendation')
  getRecommendation(@Req() req: RequestWithUser) {
    return this.creditCardsService.getBestCardToUse(req.user.userId);
  }

  @ApiOperation({ summary: 'Actualizar datos de una tarjeta' })
  @Patch(':id')
  update(
    @Param('id') id: string, 
    @Body() updateCreditCardDto: UpdateCreditCardDto, 
    @Req() req: AuthenticatedRequest
  ) {
    return this.creditCardsService.update(id, updateCreditCardDto, req.user.userId);
  }

  // ==========================================
  // CICLOS MENSUALES ESPECÍFICOS
  // ==========================================

  @ApiOperation({ summary: 'Crear o actualizar la fecha de cierre/vencimiento mensual de una tarjeta' })
  @Post(':id/cycles')
  upsertCycle(
    @Param('id') id: string,
    @Body() dto: UpsertCardCycleDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.creditCardsService.upsertCycle(id, dto, req.user.userId);
  }

  @ApiOperation({ summary: 'Obtener historial de ciclos personalizados de una tarjeta' })
  @Get(':id/cycles')
  getCycles(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest
  ) {
    return this.creditCardsService.getCycles(id, req.user.userId);
  }

  @ApiOperation({ summary: 'Eliminar un ciclo personalizado y volver al día habitual' })
  @Delete(':id/cycles/:cycleId')
  removeCycle(
    @Param('id') id: string,
    @Param('cycleId') cycleId: string,
    @Req() req: AuthenticatedRequest
  ) {
    return this.creditCardsService.removeCycle(id, cycleId, req.user.userId);
  }
}