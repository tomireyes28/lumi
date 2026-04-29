import { IsString, IsNotEmpty, IsNumber, IsOptional, Min, Max, Length, IsHexColor, IsPositive } from 'class-validator';

export class CreateCreditCardDto {
  @IsNotEmpty({ message: 'El alias es obligatorio (Ej: Visa Banco Galicia)' })
  @IsString()
  alias!: string;

  @IsNotEmpty({ message: 'Los últimos 4 dígitos son obligatorios' })
  @IsString()
  @Length(4, 4, { message: 'Deben ser exactamente 4 dígitos' })
  lastFour!: string;

  @IsNotEmpty({ message: 'El límite es obligatorio' })
  @IsNumber({}, { message: 'El límite debe ser un número válido' })
  @IsPositive({ message: 'El límite no puede ser negativo' })
  limit!: number;

  @IsNotEmpty({ message: 'El día de cierre es obligatorio' })
  @IsNumber()
  @Min(1, { message: 'El día mínimo es 1' })
  @Max(31, { message: 'El día máximo es 31' })
  closingDay!: number;

  @IsNotEmpty({ message: 'El día de vencimiento es obligatorio' })
  @IsNumber()
  @Min(1, { message: 'El día mínimo es 1' })
  @Max(31, { message: 'El día máximo es 31' })
  dueDay!: number;

  @IsOptional()
  @IsHexColor({ message: 'El color debe ser un hexadecimal válido' })
  colorHex?: string;
}