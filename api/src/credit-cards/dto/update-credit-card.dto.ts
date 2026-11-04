import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsInt,
  Min,
  Max,
  MaxLength,
  Matches,
  IsHexColor,
  IsPositive,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { IsOptionalNonNullable } from '../../utils/validation.util';

export class UpdateCreditCardDto {
  @IsOptionalNonNullable()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty({ message: 'El alias no puede estar vacío' })
  @IsString({ message: 'El alias debe ser un texto válido' })
  @MaxLength(60, { message: 'El alias no puede superar los 60 caracteres' })
  alias?: string;

  @IsOptionalNonNullable()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Matches(/^\d{4}$/, { message: 'Deben ser exactamente 4 dígitos numéricos' })
  lastFour?: string;

  @IsOptionalNonNullable()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El límite debe ser un número válido con hasta 2 decimales' },
  )
  @IsPositive({ message: 'El límite debe ser mayor a 0' })
  @Min(0.01, { message: 'El límite mínimo es 0.01' })
  @Max(99999999.99, { message: 'El límite supera el máximo permitido' })
  limit?: number;

  @IsOptionalNonNullable()
  @IsInt({ message: 'El día de cierre debe ser un número entero' })
  @Min(1, { message: 'El día mínimo es 1' })
  @Max(31, { message: 'El día máximo es 31' })
  closingDay?: number;

  @IsOptionalNonNullable()
  @IsInt({ message: 'El día de vencimiento debe ser un número entero' })
  @Min(1, { message: 'El día mínimo es 1' })
  @Max(31, { message: 'El día máximo es 31' })
  dueDay?: number;

  @IsOptional()
  @IsHexColor({ message: 'El color debe ser un hexadecimal válido' })
  colorHex?: string;
}
