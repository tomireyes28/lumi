import { IsOptional, IsString, IsEnum, IsNumberString } from 'class-validator';

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
}