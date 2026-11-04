import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsPositive,
  IsBoolean,
  Min,
  Max,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { IsValidCalendarDate } from '../../utils/validation.util';

export class CreateReminderDto {
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'El título debe ser un texto válido' })
  @IsNotEmpty({ message: 'El título es obligatorio' })
  @MaxLength(120, { message: 'El título no puede superar los 120 caracteres' })
  title!: string;

  @IsOptional()
  @ValidateIf((_object: unknown, value: unknown) => value !== null && value !== undefined)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El monto debe ser un número válido con hasta 2 decimales' },
  )
  @IsPositive({ message: 'El monto debe ser mayor a 0' })
  @Min(0.01, { message: 'El monto mínimo es 0.01' })
  @Max(99999999.99, { message: 'El monto supera el máximo permitido' })
  amount?: number | null;

  @IsNotEmpty({ message: 'La fecha de vencimiento es obligatoria' })
  @IsValidCalendarDate({
    message: 'La fecha de vencimiento debe ser una fecha calendario válida (YYYY-MM-DD)',
  })
  dueDate!: string;

  @IsOptional()
  @IsBoolean({ message: 'isRecurring debe ser un valor booleano' })
  isRecurring?: boolean;
}
