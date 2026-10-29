import { IsEmail, IsString, MinLength, MaxLength, IsNotEmpty } from 'class-validator';

export class RegisterDto {
  @IsString({ message: 'El nombre debe ser un texto válido' })
  @IsNotEmpty({ message: 'El nombre no puede estar vacío' })
  @MaxLength(100, { message: 'El nombre no puede superar los 100 caracteres' })
  name!: string;

  @IsEmail({}, { message: 'El formato del email no es válido' })
  email!: string;

  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  @MaxLength(72, {
    message: 'La contraseña no puede superar los 72 caracteres (límite de seguridad bcrypt)',
  })
  password!: string;
}

export class LoginDto {
  @IsEmail({}, { message: 'El formato del email no es válido' })
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  @MaxLength(72, {
    message: 'La contraseña no puede superar los 72 caracteres',
  })
  password!: string;
}

export class ExchangeCodeDto {
  @IsString({ message: 'El código de intercambio debe ser un texto válido' })
  @IsNotEmpty({ message: 'El código de intercambio es obligatorio' })
  code!: string;
}
