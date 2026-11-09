import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleUser, JwtPayload } from './interfaces/auth.interfaces';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

const MAX_EXCHANGE_CODES = 1000;

const BCRYPT_MAX_UTF8_BYTES = 72;

@Injectable()
export class AuthService {
  // Almacén temporal acotado para códigos OAuth de un solo uso (TTL 60s).
  // Nota operativa: en despliegues multi-réplica debe respaldarse en Redis/DB compartida.
  private readonly oauthExchangeCodes = new Map<
    string,
    { token: string; clientState?: string; expiresAt: number }
  >();

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  private async signAccessToken(user: {
    id: string;
    email: string;
  }): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      jti: randomUUID(),
    };
    await this.prisma.authSession.create({
      data: {
        id: payload.jti!,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    return this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: '7d',
    });
  }

  async revokeToken(jti?: string): Promise<void> {
    if (jti)
      await this.prisma.authSession.updateMany({
        where: { id: jti, revokedAt: null },
        data: { revokedAt: new Date() },
      });
  }

  async isTokenRevoked(jti: string): Promise<boolean> {
    const session = await this.prisma.authSession.findUnique({
      where: { id: jti },
    });
    return (
      !session || session.revokedAt !== null || session.expiresAt <= new Date()
    );
  }

  async validateSession(payload: JwtPayload): Promise<void> {
    if (!payload.jti)
      throw new UnauthorizedException('Iniciá sesión nuevamente.');
    const session = await this.prisma.authSession.findUnique({
      where: { id: payload.jti },
    });
    if (
      !session ||
      session.userId !== payload.sub ||
      session.revokedAt ||
      session.expiresAt <= new Date()
    ) {
      throw new UnauthorizedException('La sesión fue cerrada o expiró.');
    }
  }

  // ==========================================
  // AUTENTICACIÓN CON GOOGLE
  // ==========================================
  async googleLogin(reqUser: GoogleUser) {
    if (!reqUser || !reqUser.email) {
      throw new BadRequestException('No user from Google');
    }

    if (reqUser.emailVerified === false) {
      throw new UnauthorizedException('El email de Google no está verificado.');
    }

    const normalizedEmail = reqUser.email.trim().toLowerCase();

    const existingUser =
      typeof this.prisma.user.findUnique === 'function'
        ? await this.prisma.user.findUnique({
            where: { email: normalizedEmail },
          })
        : null;

    if (
      existingUser?.googleId &&
      reqUser.googleId &&
      existingUser.googleId !== reqUser.googleId
    ) {
      throw new UnauthorizedException(
        'El correo electrónico ya está vinculado a otra identidad de proveedor.',
      );
    }

    // Seguridad contra apropiación previa de cuenta (Pre-Account Takeover):
    // Si existía un registro local cuyo email nunca fue verificado, invalidamos la contraseña
    // local previa al vincular la cuenta verificada de Google.
    const preserveVerifiedPassword = Boolean(
      existingUser?.emailVerified && existingUser?.password,
    );

    const user = await this.prisma.user.upsert({
      where: { email: normalizedEmail },
      update: {
        name: reqUser.name,
        picture: reqUser.picture,
        ...(reqUser.googleId ? { googleId: reqUser.googleId } : {}),
        emailVerified: true,
        ...(preserveVerifiedPassword ? {} : { password: null }),
      },
      create: {
        email: normalizedEmail,
        name: reqUser.name,
        picture: reqUser.picture,
        ...(reqUser.googleId ? { googleId: reqUser.googleId } : {}),
        emailVerified: true,
      },
    });

    return this.signAccessToken(user);
  }

  // Genera un código temporal de un solo uso vinculado al estado del navegador
  createOAuthExchangeCode(token: string, clientState?: string): string {
    const now = Date.now();
    for (const [code, entry] of this.oauthExchangeCodes.entries()) {
      if (entry.expiresAt < now) {
        this.oauthExchangeCodes.delete(code);
      }
    }
    while (this.oauthExchangeCodes.size >= MAX_EXCHANGE_CODES) {
      const oldest = this.oauthExchangeCodes.keys().next().value;
      if (!oldest) break;
      this.oauthExchangeCodes.delete(oldest);
    }

    const code = randomUUID();
    this.oauthExchangeCodes.set(code, {
      token,
      clientState: clientState?.trim() || undefined,
      expiresAt: now + 60 * 1000, // Válido por 60 segundos
    });
    return code;
  }

  // Canjea el código temporal por el token JWT y datos de usuario verificando vínculo con el navegador
  async exchangeOAuthCode(code: string, clientState?: string) {
    const entry = this.oauthExchangeCodes.get(code);
    if (!entry || entry.expiresAt < Date.now()) {
      if (entry) this.oauthExchangeCodes.delete(code);
      throw new UnauthorizedException(
        'El código de autorización ha expirado o es inválido.',
      );
    }

    // Quemamos el código inmediatamente (uso único estricto)
    this.oauthExchangeCodes.delete(code);

    if (entry.clientState && entry.clientState !== clientState?.trim()) {
      throw new UnauthorizedException(
        'El estado de autorización no coincide con la sesión del navegador.',
      );
    }

    const payload = this.jwtService.verify<JwtPayload>(entry.token, {
      secret: process.env.JWT_SECRET,
    });
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, name: true, email: true, picture: true },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado.');
    }

    return {
      token: entry.token,
      user,
    };
  }

  // ==========================================
  // AUTENTICACIÓN LOCAL (EMAIL/PASSWORD)
  // ==========================================
  async register(body: RegisterDto) {
    const { name, email, password } = body;
    const trimmedName = typeof name === 'string' ? name.trim() : '';
    if (!trimmedName) {
      throw new BadRequestException('El nombre no puede estar vacío.');
    }

    if (
      typeof password !== 'string' ||
      Buffer.byteLength(password, 'utf8') > BCRYPT_MAX_UTF8_BYTES
    ) {
      throw new BadRequestException(
        'La contraseña no puede superar los 72 bytes UTF-8 (límite de seguridad bcrypt).',
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    const userExists = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (userExists) {
      throw new BadRequestException('El email ya está registrado.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      const newUser = await this.prisma.user.create({
        data: {
          name: trimmedName,
          email: normalizedEmail,
          password: hashedPassword,
          emailVerified: false,
        },
      });

      return {
        token: await this.signAccessToken(newUser),
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          picture: newUser.picture,
        },
      };
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code?: string }).code === 'P2002'
      ) {
        throw new BadRequestException('El email ya está registrado.');
      }
      throw error;
    }
  }

  async login(body: LoginDto) {
    const { email, password } = body;
    const normalizedEmail = email.trim().toLowerCase();

    if (
      typeof password !== 'string' ||
      Buffer.byteLength(password, 'utf8') > BCRYPT_MAX_UTF8_BYTES
    ) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || !user.password) {
      throw new UnauthorizedException(
        'Credenciales inválidas. Si usaste Google, iniciá sesión por ahí.',
      );
    }

    const isPasswordValid = await bcrypt.compare(
      String(password),
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    return {
      token: await this.signAccessToken(user),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        picture: user.picture,
      },
    };
  }
}
