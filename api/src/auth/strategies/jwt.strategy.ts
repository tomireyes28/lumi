import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { JwtPayload } from '../interfaces/auth.interfaces';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from '../auth.service';

function extractCookieToken(req: Request | undefined): string | null {
  const cookieHeader = req?.headers?.cookie;
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    if (key === 'lumi_session' || key === 'lumi_token') {
      const val = decodeURIComponent(part.slice(idx + 1).trim());
      if (val) return val;
    }
  }
  return null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    configService: ConfigService,
  ) {
    const secret =
      configService.get<string>('JWT_SECRET') || process.env.JWT_SECRET;
    if (!secret) {
      throw new Error(
        'CRITICAL: La variable de entorno JWT_SECRET es obligatoria para inicializar JwtStrategy.',
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        extractCookieToken,
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload.sub) {
      throw new UnauthorizedException('Token inválido');
    }

    await this.authService.validateSession(payload);

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user;

    return {
      ...result,
      userId: result.id,
      jti: payload.jti,
      tokenExp: payload.exp,
    };
  }
}
