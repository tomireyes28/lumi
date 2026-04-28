import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

// Esto asegura que TypeScript y NestJS solo acepten estos dos valores
export enum CategoryType {
  INCOME = 'income',
  EXPENSE = 'expense',
}

export class CreateCategoryDto {
  @IsNotEmpty({ message: 'El nombre de la categoría es obligatorio' })
  @IsString()
  name!: string;

  @IsNotEmpty({ message: 'El tipo es obligatorio (income o expense)' })
  @IsEnum(CategoryType, { message: 'El tipo debe ser income o expense' })
  type!: CategoryType;

  @IsOptional()
  @IsString()
  colorHex?: string; // Coincide con tu esquema

  @IsOptional()
  @IsString()
  icon?: string;
}