import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsNotEmpty,
  IsOptional,
  ValidateBy,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { Transform } from 'class-transformer';

export function MaxUtf8Bytes(
  maxBytes: number,
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return ValidateBy(
    {
      name: 'maxUtf8Bytes',
      constraints: [maxBytes],
      validator: {
        validate(value: unknown, args?: ValidationArguments): boolean {
          if (typeof value !== 'string') return false;
          const limit = (args?.constraints?.[0] as number) ?? maxBytes;
          return Buffer.byteLength(value, 'utf8') <= limit;
        },
        defaultMessage(args?: ValidationArguments): string {
          const limit = (args?.constraints?.[0] as number) ?? maxBytes;
          return `La contraseña no puede superar los ${limit} bytes en UTF-8 (límite de seguridad bcrypt)`;
        },
      },
    },
    validationOptions,
  );
}

export class RegisterDto {
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'El nombre debe ser un texto válido' })
  @IsNotEmpty({ message: 'El nombre no puede estar vacío' })
  @MaxLength(100, { message: 'El nombre no puede superar los 100 caracteres' })
  name!: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'El formato del email no es válido' })
  @MaxLength(254, { message: 'El email no puede superar los 254 caracteres' })
  email!: string;

  @IsString({ message: 'La contraseña debe ser un texto válido' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  @MaxLength(72, {
    message: 'La contraseña no puede superar los 72 caracteres (límite de seguridad bcrypt)',
  })
  @MaxUtf8Bytes(72, {
    message: 'La contraseña no puede superar los 72 bytes UTF-8 (límite de seguridad bcrypt)',
  })
  password!: string;
}

export class LoginDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'El formato del email no es válido' })
  @MaxLength(254, { message: 'El email no puede superar los 254 caracteres' })
  email!: string;

  @IsString({ message: 'La contraseña debe ser un texto válido' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  @MaxLength(72, {
    message: 'La contraseña no puede superar los 72 caracteres',
  })
  @MaxUtf8Bytes(72, {
    message: 'La contraseña no puede superar los 72 bytes UTF-8',
  })
  password!: string;
}

export class ExchangeCodeDto {
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'El código de intercambio debe ser un texto válido' })
  @IsNotEmpty({ message: 'El código de intercambio es obligatorio' })
  @MaxLength(128, { message: 'El código de intercambio es inválido' })
  code!: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'El parámetro state debe ser un texto válido' })
  @MaxLength(128, { message: 'El parámetro state es inválido' })
  state?: string;
}
