import { IsNotEmpty, IsNumber, Min, Max, IsDateString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpsertCardCycleDto {
  @ApiProperty({ description: 'Mes del ciclo (1 a 12)', example: 9 })
  @IsNotEmpty({ message: 'El mes es obligatorio' })
  @IsNumber()
  @Min(1, { message: 'El mes mínimo es 1' })
  @Max(12, { message: 'El mes máximo es 12' })
  month!: number;

  @ApiProperty({ description: 'Año del ciclo', example: 2026 })
  @IsNotEmpty({ message: 'El año es obligatorio' })
  @IsNumber()
  @Min(2000, { message: 'Año inválido' })
  @Max(2100, { message: 'Año inválido' })
  year!: number;

  @ApiProperty({ description: 'Fecha exacta de cierre del resumen (YYYY-MM-DD o ISO)', example: '2026-09-24' })
  @IsNotEmpty({ message: 'La fecha de cierre es obligatoria' })
  @IsDateString({}, { message: 'La fecha de cierre debe ser una fecha válida (YYYY-MM-DD)' })
  closingDate!: string;

  @ApiPropertyOptional({ description: 'Fecha exacta de vencimiento para el pago (YYYY-MM-DD o ISO)', example: '2026-10-05' })
  @IsOptional()
  @IsDateString({}, { message: 'La fecha de vencimiento debe ser una fecha válida (YYYY-MM-DD)' })
  dueDate?: string;
}
