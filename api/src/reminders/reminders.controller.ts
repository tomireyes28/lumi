import { Controller, Get, Post, Body, Patch, Param, Delete, Req, UseGuards } from '@nestjs/common';
import { RemindersService } from './reminders.service';
import { CreateReminderDto } from './dto/create-reminder.dto';
import { AuthGuard } from '@nestjs/passport';

// Interfaz para tipar el request que viene de tu AuthGuard
interface RequestWithUser extends Request {
  user: { userId: string };
}

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

  @Patch(':id/pay') // Endpoint custom para tachar un recordatorio
  markAsPaid(@Req() req: RequestWithUser, @Param('id') id: string) {
    return this.remindersService.markAsPaid(id, req.user.userId);
  }

  @Delete(':id')
  remove(@Req() req: RequestWithUser, @Param('id') id: string) {
    return this.remindersService.remove(id, req.user.userId);
  }
}