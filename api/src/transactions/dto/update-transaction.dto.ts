import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateTransactionDto } from './create-transaction.dto';
import { IsOptional, IsString, ValidateIf } from 'class-validator';

// 1. Omitimos 'creditCardId' de la herencia usando OmitType
// 2. Aplicamos PartialType al resultado
export class UpdateTransactionDto extends PartialType(
  OmitType(CreateTransactionDto, ['creditCardId'] as const)
) {
  
  // 3. Ahora sí, redefinimos el campo con nuestros decoradores para aceptar null
  @IsOptional()
  @ValidateIf((object, value) => value !== null)
  @IsString()
  creditCardId?: string | null;
}