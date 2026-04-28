import { Controller, Get, Post, Body, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';

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
  findAll(@Req() req: RequestWithUser) {
    return this.transactionsService.findAllByUser(req.user.userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.transactionsService.remove(id, req.user.userId);
  }
}