import { IsNotEmpty, IsNumber, IsPositive, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBudgetDto {
  @ApiProperty({ description: 'ID de la categoría asignada al presupuesto' })
  @IsString({ message: 'El ID de la categoría debe ser un texto' })
  @IsNotEmpty({ message: 'La categoría es requerida' })
  categoryId: string;

  @ApiProperty({ description: 'Monto mensual límite para la categoría', example: 50000 })
  @Type(() => Number)
  @IsNumber({}, { message: 'El monto debe ser un número' })
  @IsPositive({ message: 'El monto debe ser mayor a 0' })
  amount: number;
}
