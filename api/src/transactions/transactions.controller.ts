import { Controller, Get, Post, Body, Param, Delete, UseGuards, Req, Query, Patch } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { AuthGuard } from '@nestjs/passport';
import { GetTransactionsFilterDto } from './dto/get-transactions-filter.dto';
import type { AuthenticatedRequest } from '../auth/interfaces/auth.interfaces';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { GetBudgetsQueryDto } from '../budgets/dto/get-budgets-query.dto';

@ApiTags('Transactions')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  create(@Body() createTransactionDto: CreateTransactionDto, @Req() req: AuthenticatedRequest) {
    return this.transactionsService.create(createTransactionDto, req.user.userId);
  }

  @Get()
  findAll(@Req() req: AuthenticatedRequest, @Query() filters: GetTransactionsFilterDto) {
    return this.transactionsService.findAllByUser(req.user.userId, filters);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateTransactionDto: UpdateTransactionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.transactionsService.update(id, updateTransactionDto, req.user.userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.transactionsService.remove(id, req.user.userId);
  }

  @Get('summary')
  getSummary(@Req() req: AuthenticatedRequest, @Query() query: GetBudgetsQueryDto) {
    return this.transactionsService.getMonthlySummary(req.user.userId, query.month, query.year);
  }
}
