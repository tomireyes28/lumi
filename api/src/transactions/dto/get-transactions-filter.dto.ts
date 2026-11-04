import {
  IsOptional,
  IsString,
  IsEnum,
  IsInt,
  Min,
  Max,
  MaxLength,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

export class GetTransactionsFilterDto {
  @IsOptional()
  @Matches(/^(0?[1-9]|1[0-2])$/, {
    message: 'El mes debe ser un número entero entre 1 y 12',
  })
  month?: string;

  @IsOptional()
  @Matches(/^(20\d{2}|2100)$/, {
    message: 'El año debe ser un número entero entre 2000 y 2100',
  })
  year?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  categoryId?: string;

  @IsOptional()
  @IsEnum(['income', 'expense'], { message: 'El tipo debe ser income o expense' })
  type?: 'income' | 'expense';

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La página debe ser un número entero' })
  @Min(1, { message: 'La página mínima es 1' })
  @Max(10000, { message: 'La página supera el máximo permitido' })
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El límite debe ser un número entero' })
  @Min(1, { message: 'El límite mínimo es 1' })
  @Max(100, { message: 'El límite máximo por página es 100' })
  limit?: number;
}
