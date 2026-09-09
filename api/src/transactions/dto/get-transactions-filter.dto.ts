import { IsOptional, IsString, IsEnum, IsNumberString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class GetTransactionsFilterDto {
  // IsNumberString asegura que, aunque venga por URL como texto ("4"), sea un número válido
  @IsOptional()
  @IsNumberString({}, { message: 'El mes debe ser un número' })
  month?: string;

  @IsOptional()
  @IsNumberString({}, { message: 'El año debe ser un número' })
  year?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsEnum(['income', 'expense'], { message: 'El tipo debe ser income o expense' })
  type?: 'income' | 'expense';

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La página debe ser un número entero' })
  @Min(1, { message: 'La página mínima es 1' })
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El límite debe ser un número entero' })
  @Min(1, { message: 'El límite mínimo es 1' })
  @Max(100, { message: 'El límite máximo por página es 100' })
  limit?: number;
}