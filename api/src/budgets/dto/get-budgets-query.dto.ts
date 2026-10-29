import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class GetBudgetsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El mes debe ser un número entero entre 1 y 12' })
  @Min(1, { message: 'El mes debe estar entre 1 y 12' })
  @Max(12, { message: 'El mes debe estar entre 1 y 12' })
  month?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El año debe ser un número entero válido' })
  @Min(2000, { message: 'El año mínimo permitido es 2000' })
  @Max(2100, { message: 'El año máximo permitido es 2100' })
  year?: number;
}
