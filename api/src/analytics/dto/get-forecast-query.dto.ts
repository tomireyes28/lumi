import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class GetForecastQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La cantidad de meses debe ser un número entero' })
  @Min(1, { message: 'El mínimo de meses a proyectar es 1' })
  @Max(24, { message: 'El máximo de meses a proyectar es 24' })
  months?: number;
}
