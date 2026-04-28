import { IsString, IsNotEmpty, IsNumber, IsOptional, IsDateString, IsPositive } from 'class-validator';

export class CreateTransactionDto {
  @IsNotEmpty({ message: 'El monto es obligatorio' })
  @IsNumber({}, { message: 'El monto debe ser un número válido' })
  @IsPositive({ message: 'El monto no puede ser negativo' })
  amount!: number;

  @IsNotEmpty({ message: 'La categoría es obligatoria' })
  @IsString()
  categoryId!: string;

  @IsOptional()
  @IsDateString({}, { message: 'El formato de fecha no es válido' })
  date?: string;

  @IsOptional()
  @IsString()
  note?: string;
}