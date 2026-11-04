import { IsString, IsNotEmpty, IsOptional, IsEnum, MaxLength, IsHexColor } from 'class-validator';
import { Transform } from 'class-transformer';
import { CategoryType } from './create-category.dto';
import { IsOptionalNonNullable } from '../../utils/validation.util';

export class UpdateCategoryDto {
  @IsOptionalNonNullable()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty({ message: 'El nombre de la categoría no puede estar vacío' })
  @IsString({ message: 'El nombre debe ser un texto válido' })
  @MaxLength(60, { message: 'El nombre no puede superar los 60 caracteres' })
  name?: string;

  @IsOptionalNonNullable()
  @IsEnum(CategoryType, { message: 'El tipo debe ser income o expense' })
  type?: CategoryType;

  @IsOptional()
  @IsHexColor({ message: 'El color debe ser un código hexadecimal válido' })
  colorHex?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'El ícono no puede superar los 50 caracteres' })
  icon?: string;
}
