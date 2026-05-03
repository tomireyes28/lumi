import { Controller, Get, Post, Body, Param, Delete, UseGuards, Req, Patch } from '@nestjs/common';
import { CreditCardsService } from './credit-cards.service';
import { CreateCreditCardDto } from './dto/create-credit-card.dto';
import { AuthGuard } from '@nestjs/passport';
import type { AuthenticatedRequest, RequestWithUser } from '../auth/interfaces/auth.interfaces'; 
import { UpdateCreditCardDto } from './dto/update-credit-card.dto';

@UseGuards(AuthGuard('jwt'))
@Controller('credit-cards')
export class CreditCardsController {
  constructor(private readonly creditCardsService: CreditCardsService) {}

  @Post()
  create(@Body() createCreditCardDto: CreateCreditCardDto, @Req() req: RequestWithUser) {
    return this.creditCardsService.create(createCreditCardDto, req.user.userId);
  }

  @Get()
  findAll(@Req() req: RequestWithUser) {
    return this.creditCardsService.findAllByUser(req.user.userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.creditCardsService.remove(id, req.user.userId);
  }

  @Get('recommendation')
  getRecommendation(@Req() req: RequestWithUser) {
    return this.creditCardsService.getBestCardToUse(req.user.userId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string, 
    @Body() updateCreditCardDto: UpdateCreditCardDto, 
    @Req() req: AuthenticatedRequest
  ) {
    return this.creditCardsService.update(id, updateCreditCardDto, req.user.userId);
  }
}