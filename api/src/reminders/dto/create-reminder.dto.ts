import { IsString, IsNotEmpty, IsOptional, IsNumber, IsDateString } from 'class-validator';

export class CreateReminderDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsDateString()
  @IsNotEmpty()
  dueDate!: string;
}