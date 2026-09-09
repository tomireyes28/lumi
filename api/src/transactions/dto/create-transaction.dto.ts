import { IsNotEmpty, IsNumber, IsOptional, IsString, IsPositive, IsInt, Min, Max } from 'class-validator';

export class CreateTransactionDto {
  @IsNotEmpty({ message: 'El monto es obligatorio' })
  @IsNumber({}, { message: 'El monto debe ser un número válido' })
  @IsPositive({ message: 'El monto debe ser mayor a 0' })
  amount!: number;

  @IsNotEmpty({ message: 'La categoría es obligatoria' })
  @IsString({ message: 'El ID de la categoría debe ser un texto válido' })
  categoryId!: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsString()
  creditCardId?: string; 

  @IsOptional()
  @IsInt({ message: 'Las cuotas deben ser un número entero' })
  @Min(1, { message: 'La cantidad mínima de cuotas es 1' })
  @Max(120, { message: 'La cantidad máxima de cuotas es 120' })
  installments?: number;
}