import { IsNotEmpty, IsNumber, IsPositive, IsString, Min, Max, MaxLength } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBudgetDto {
  @ApiProperty({ description: 'ID de la categoría asignada al presupuesto' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'El ID de la categoría debe ser un texto' })
  @IsNotEmpty({ message: 'La categoría es requerida' })
  @MaxLength(100, { message: 'El ID de la categoría es demasiado largo' })
  categoryId!: string;

  @ApiProperty({ description: 'Monto mensual límite para la categoría', example: 50000 })
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El monto debe ser un número válido con hasta 2 decimales' },
  )
  @IsPositive({ message: 'El monto debe ser mayor a 0' })
  @Min(0.01, { message: 'El monto mínimo permitido es 0.01' })
  @Max(99999999.99, { message: 'El monto supera el máximo permitido' })
  amount!: number;
}
