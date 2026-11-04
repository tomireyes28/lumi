import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsPositive,
  IsInt,
  Min,
  Max,
  MaxLength,
  ValidateBy,
  ValidateIf,
  ValidationArguments,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { IsOptionalNonNullable, IsValidCalendarDate } from '../../utils/validation.util';

function HasEnoughCentsForInstallments(): PropertyDecorator {
  return ValidateBy({
    name: 'hasEnoughCentsForInstallments',
    validator: {
      validate(value: unknown, args?: ValidationArguments): boolean {
        if (value === undefined || value === null) return true;
        if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) return false;
        if (value === 1) return true;
        const obj = args?.object as { amount?: unknown } | undefined;
        const amount = typeof obj?.amount === 'number' ? obj.amount : 0;
        return Math.round(amount * 100) >= value;
      },
      defaultMessage(): string {
        return 'El monto total debe alcanzar para al menos $0,01 por cada cuota';
      },
    },
  });
}

export class CreateTransactionDto {
  @IsNotEmpty({ message: 'El monto es obligatorio' })
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El monto debe ser un número válido con hasta 2 decimales' },
  )
  @IsPositive({ message: 'El monto debe ser mayor a 0' })
  @Min(0.01, { message: 'El monto mínimo permitido es 0.01' })
  @Max(99999999.99, { message: 'El monto supera el límite máximo permitido' })
  amount!: number;

  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty({ message: 'La categoría es obligatoria' })
  @IsString({ message: 'El ID de la categoría debe ser un texto válido' })
  @MaxLength(100, { message: 'El ID de la categoría es demasiado largo' })
  categoryId!: string;

  @IsOptional()
  @ValidateIf((_object: unknown, value: unknown) => value !== null && value !== undefined)
  @IsString({ message: 'La nota debe ser un texto válido' })
  @MaxLength(500, { message: 'La nota no puede superar los 500 caracteres' })
  note?: string;

  @IsOptionalNonNullable()
  @IsValidCalendarDate({ message: 'La fecha debe ser una fecha calendario válida (YYYY-MM-DD)' })
  date?: string;

  @IsOptional()
  @ValidateIf((_object: unknown, value: unknown) => value !== null && value !== undefined)
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'El ID de la tarjeta debe ser un texto válido' })
  @IsNotEmpty({ message: 'El ID de la tarjeta no puede estar vacío' })
  @MaxLength(100, { message: 'El ID de la tarjeta es demasiado largo' })
  creditCardId?: string;

  @IsOptionalNonNullable()
  @IsInt({ message: 'Las cuotas deben ser un número entero' })
  @Min(1, { message: 'La cantidad mínima de cuotas es 1' })
  @Max(120, { message: 'La cantidad máxima de cuotas es 120' })
  @HasEnoughCentsForInstallments()
  installments?: number;
}
