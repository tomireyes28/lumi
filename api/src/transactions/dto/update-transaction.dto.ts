import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { IsOptionalNonNullable, IsValidCalendarDate } from '../../utils/validation.util';

export class UpdateTransactionDto {
  @IsOptionalNonNullable()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El monto debe ser un número válido con hasta 2 decimales' },
  )
  @IsPositive({ message: 'El monto debe ser mayor a 0' })
  @Min(0.01, { message: 'El monto mínimo permitido es 0.01' })
  @Max(99999999.99, { message: 'El monto supera el límite máximo permitido' })
  amount?: number;

  @IsOptionalNonNullable()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'El ID de la categoría debe ser un texto válido' })
  @IsNotEmpty({ message: 'La categoría no puede estar vacía' })
  @MaxLength(100, { message: 'El ID de la categoría es demasiado largo' })
  categoryId?: string;

  @IsOptional()
  @ValidateIf((_object: unknown, value: unknown) => value !== null && value !== undefined)
  @IsString({ message: 'La nota debe ser un texto válido' })
  @MaxLength(500, { message: 'La nota no puede superar los 500 caracteres' })
  note?: string | null;

  @IsOptionalNonNullable()
  @IsValidCalendarDate({ message: 'La fecha debe ser una fecha calendario válida (YYYY-MM-DD)' })
  date?: string;

  @IsOptional()
  @ValidateIf((_object: unknown, value: unknown) => value !== null && value !== undefined)
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'El ID de la tarjeta debe ser un texto válido' })
  @IsNotEmpty({ message: 'El ID de la tarjeta no puede estar vacío' })
  @MaxLength(100, { message: 'El ID de la tarjeta es demasiado largo' })
  creditCardId?: string | null;
}
