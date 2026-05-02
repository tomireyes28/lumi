import { Controller, Get, Post, Body, Param, Delete, UseGuards, Req, Query } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { GetTransactionsFilterDto } from './dto/get-transactions-filter.dto';

interface RequestWithUser extends Request {
  user: { userId: string; email: string; };
}

@UseGuards(AuthGuard('jwt')) // <-- Protegemos toda la ruta
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  create(@Body() createTransactionDto: CreateTransactionDto, @Req() req: RequestWithUser) {
    return this.transactionsService.create(createTransactionDto, req.user.userId);
  }

  @Get()
  findAll(
    @Req() req: RequestWithUser,
    @Query() filters: GetTransactionsFilterDto // <-- NestJS valida la URL automáticamente
  ) {
    return this.transactionsService.findAllByUser(req.user.userId, filters);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.transactionsService.remove(id, req.user.userId);
  }

  @Get('summary')
  getSummary(
    @Req() req: RequestWithUser,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    // Si no mandan mes/año, calculamos el actual por defecto
    const targetMonth = month ? parseInt(month) : new Date().getMonth() + 1;
    const targetYear = year ? parseInt(year) : new Date().getFullYear();

    return this.transactionsService.getMonthlySummary(req.user.userId, targetMonth, targetYear);
  }
}