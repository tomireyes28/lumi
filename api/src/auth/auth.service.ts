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
import { OAuthGrantStore } from './oauth-grant.store';
import { Interval } from '@nestjs/schedule';

const BCRYPT_MAX_UTF8_BYTES = 72;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  @Interval(3600000)
  async cleanupExpiredSecurityState(): Promise<void> {
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.authSession.deleteMany({ where: { expiresAt: { lt: now } } }),
      this.prisma.oAuthGrant.deleteMany({ where: { expiresAt: { lt: now } } }),
    ]);
  }

  private async signAccessToken(user: {
    id: string;
    email: string;
    authVersion?: number;
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
        authVersion: user.authVersion ?? 0,
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
      include: { user: { select: { authVersion: true } } },
    });
    if (
      !session ||
      session.userId !== payload.sub ||
      session.authVersion !== session.user.authVersion ||
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
    if (
      !reqUser?.email ||
      !reqUser.googleId?.trim() ||
      reqUser.emailVerified !== true
    ) {
      throw new UnauthorizedException(
        'Google debe verificar email e identidad.',
      );
    }
    const email = reqUser.email.trim().toLowerCase();
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const user = await this.prisma.$transaction(
          async (tx) => {
            const existing = await tx.user.findUnique({ where: { email } });
            const identity = await tx.user.findUnique({
              where: { googleId: reqUser.googleId },
            });
            if (
              (existing?.googleId && existing.googleId !== reqUser.googleId) ||
              (identity && identity.id !== existing?.id)
            ) {
              throw new UnauthorizedException(
                'La identidad de Google ya está vinculada a otra cuenta.',
              );
            }
            const linking = existing && existing.googleId !== reqUser.googleId;
            const result = await tx.user.upsert({
              where: { email },
              update: {
                name: reqUser.name,
                picture: reqUser.picture,
                googleId: reqUser.googleId,
                emailVerified: true,
                ...(existing?.emailVerified && existing.password
                  ? {}
                  : { password: null }),
                ...(linking ? { authVersion: { increment: 1 } } : {}),
              },
              create: {
                email,
                name: reqUser.name,
                picture: reqUser.picture,
                googleId: reqUser.googleId,
                emailVerified: true,
              },
            });
            if (linking)
              await tx.authSession.updateMany({
                where: { userId: result.id, revokedAt: null },
                data: { revokedAt: new Date() },
              });
            return result;
          },
          { isolationLevel: 'Serializable' },
        );
        return await this.signAccessToken(user);
      } catch (error: unknown) {
        if (
          error &&
          typeof error === 'object' &&
          'code' in error &&
          error.code === 'P2034' &&
          attempt < 2
        )
          continue;
        throw error;
      }
    }
    throw new UnauthorizedException('No se pudo vincular la cuenta.');
  }

  async createOAuthExchangeCode(
    token: string,
    clientState?: string,
  ): Promise<string> {
    if (!clientState?.trim())
      throw new UnauthorizedException('Falta estado del navegador.');
    return new OAuthGrantStore(this.prisma).create(
      'exchange',
      { token, clientState: clientState.trim() },
      60000,
    );
  }

  async exchangeOAuthCode(code: string, clientState?: string) {
    const entry = await new OAuthGrantStore(this.prisma).consume(
      code,
      'exchange',
    );
    if (!entry || !clientState || entry.clientState !== clientState.trim())
      throw new UnauthorizedException('Código inválido o expirado.');
    const payload = this.jwtService.verify<JwtPayload>(entry.token, {
      secret: process.env.JWT_SECRET,
    });
    await this.validateSession(payload);
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
