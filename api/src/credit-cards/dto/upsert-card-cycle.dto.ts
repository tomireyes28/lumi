import {
  IsNotEmpty,
  IsInt,
  Min,
  Max,
  IsOptional,
  ValidateBy,
  ValidateIf,
  ValidationArguments,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsValidCalendarDate } from '../../utils/validation.util';
import { getCalendarDayParts, isValidCalendarDateString, parseLocalDate } from '../../utils/date.util';

function IsCoherentClosingDate(): PropertyDecorator {
  return ValidateBy({
    name: 'isCoherentClosingDate',
    validator: {
      validate(value: unknown, args?: ValidationArguments): boolean {
        if (!isValidCalendarDateString(value)) return false;
        const dto = args?.object as { month?: number; year?: number } | undefined;
        if (typeof dto?.month !== 'number' || typeof dto?.year !== 'number') return false;
        const parsed = parseLocalDate(value as string);
        const parts = getCalendarDayParts(parsed);
        return parts.year === dto.year && parts.monthIndex + 1 === dto.month;
      },
      defaultMessage(): string {
        return 'La fecha de cierre debe pertenecer al mes y año del ciclo indicado';
      },
    },
  });
}

function IsCoherentDueDate(): PropertyDecorator {
  return ValidateBy({
    name: 'isCoherentDueDate',
    validator: {
      validate(value: unknown, args?: ValidationArguments): boolean {
        if (value === undefined || value === null) return true;
        if (!isValidCalendarDateString(value)) return false;
        const dto = args?.object as { closingDate?: string } | undefined;
        if (!dto?.closingDate || !isValidCalendarDateString(dto.closingDate)) return false;
        const closing = parseLocalDate(dto.closingDate);
        const due = parseLocalDate(value as string);
        const diffDays = (due.getTime() - closing.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays >= 0 && diffDays <= 62;
      },
      defaultMessage(): string {
        return 'La fecha de vencimiento debe ser posterior o igual al cierre y dentro de los 60 días siguientes';
      },
    },
  });
}

export class UpsertCardCycleDto {
  @ApiProperty({ description: 'Mes del ciclo (1 a 12)', example: 9 })
  @IsNotEmpty({ message: 'El mes es obligatorio' })
  @IsInt({ message: 'El mes debe ser un número entero' })
  @Min(1, { message: 'El mes mínimo es 1' })
  @Max(12, { message: 'El mes máximo es 12' })
  month!: number;

  @ApiProperty({ description: 'Año del ciclo', example: 2026 })
  @IsNotEmpty({ message: 'El año es obligatorio' })
  @IsInt({ message: 'El año debe ser un número entero' })
  @Min(2000, { message: 'Año inválido' })
  @Max(2100, { message: 'Año inválido' })
  year!: number;

  @ApiProperty({
    description: 'Fecha exacta de cierre del resumen (YYYY-MM-DD o ISO)',
    example: '2026-09-24',
  })
  @IsNotEmpty({ message: 'La fecha de cierre es obligatoria' })
  @IsValidCalendarDate({ message: 'La fecha de cierre debe ser una fecha válida (YYYY-MM-DD)' })
  @IsCoherentClosingDate()
  closingDate!: string;

  @ApiPropertyOptional({
    description: 'Fecha exacta de vencimiento para el pago (YYYY-MM-DD o ISO)',
    example: '2026-10-05',
  })
  @IsOptional()
  @ValidateIf((_object: unknown, value: unknown) => value !== null && value !== undefined)
  @IsValidCalendarDate({
    message: 'La fecha de vencimiento debe ser una fecha válida (YYYY-MM-DD)',
  })
  @IsCoherentDueDate()
  dueDate?: string;
}
