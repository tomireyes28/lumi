import { Controller, Get, Post, Body, Patch, Param, Delete, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RemindersService } from './reminders.service';
import { CreateReminderDto } from './dto/create-reminder.dto';
import { UpdateReminderDto } from './dto/update-reminder.dto';
import { AuthGuard } from '@nestjs/passport';
import type  { RequestWithUser } from '../auth/interfaces/auth.interfaces';

@ApiTags('Reminders')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('reminders')
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  @Post()
  create(@Req() req: RequestWithUser, @Body() createReminderDto: CreateReminderDto) {
    return this.remindersService.create(req.user.userId, createReminderDto);
  }

  @Get()
  findAll(@Req() req: RequestWithUser) {
    return this.remindersService.findAllByUser(req.user.userId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateReminderDto: UpdateReminderDto,
    @Req() req: RequestWithUser,
  ) {
    return this.remindersService.update(id, updateReminderDto, req.user.userId);
  }

  @Patch(':id/pay') 
  markAsPaid(@Req() req: RequestWithUser, @Param('id') id: string) {
    return this.remindersService.markAsPaid(id, req.user.userId);
  }

  @Delete(':id')
  remove(@Req() req: RequestWithUser, @Param('id') id: string) {
    return this.remindersService.remove(id, req.user.userId);
  }
}