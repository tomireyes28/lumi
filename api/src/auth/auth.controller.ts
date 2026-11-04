import { Controller, Get, Post, Body, Req, Res, UseGuards, HttpCode } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, ExchangeCodeDto } from './dto/auth.dto';
import type { Response } from 'express';
import type { AuthenticatedRequest, GoogleAuthRequest } from './interfaces/auth.interfaces';

const SESSION_COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

function setHttpOnlySessionCookie(res: Response | undefined, token: string): void {
  if (!res || typeof res.setHeader !== 'function') return;
  const isProd = process.env.NODE_ENV === 'production';
  const flags = [
    `lumi_session=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${SESSION_COOKIE_MAX_AGE_SECONDS}`,
  ];
  if (isProd) {
    flags.push('Secure');
  }
  res.setHeader('Set-Cookie', flags.join('; '));
}

function clearHttpOnlySessionCookie(res: Response | undefined): void {
  if (!res || typeof res.setHeader !== 'function') return;
  const isProd = process.env.NODE_ENV === 'production';
  const flags = ['lumi_session=', 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
  if (isProd) {
    flags.push('Secure');
  }
  res.setHeader('Set-Cookie', flags.join('; '));
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ==========================================
  // RUTAS GOOGLE
  // ==========================================
  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {
    // Interceptada por GoogleStrategy (genera state firmado + PKCE y cookie HttpOnly)
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req: GoogleAuthRequest, @Res() res: Response) {
    const token = await this.authService.googleLogin(req.user);
    const code = this.authService.createOAuthExchangeCode(token, req.oauthClientState);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    const stateParam = req.oauthClientState
      ? `&state=${encodeURIComponent(req.oauthClientState)}`
      : '';
    res.redirect(`${frontendUrl}/auth/callback?code=${encodeURIComponent(code)}${stateParam}`);
  }

  // Intercambio seguro del código temporal por el Token JWT + datos de usuario
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('exchange')
  async exchangeCode(@Body() body: ExchangeCodeDto, @Res({ passthrough: true }) res?: Response) {
    const result = await this.authService.exchangeOAuthCode(body.code, body.state);
    setHttpOnlySessionCookie(res, result.token);
    return result;
  }

  // ==========================================
  // RUTAS LOCALES (Rate Limiting Estricto Anti-Brute-Force)
  // ==========================================
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('register')
  async register(@Body() body: RegisterDto, @Res({ passthrough: true }) res?: Response) {
    const result = await this.authService.register(body);
    setHttpOnlySessionCookie(res, result.token);
    return result;
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('login')
  async login(@Body() body: LoginDto, @Res({ passthrough: true }) res?: Response) {
    const result = await this.authService.login(body);
    setHttpOnlySessionCookie(res, result.token);
    return result;
  }

  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(200)
  @UseGuards(AuthGuard('jwt'))
  logout(@Req() req: AuthenticatedRequest, @Res({ passthrough: true }) res?: Response) {
    this.authService.revokeToken(req.user.jti, req.user.tokenExp);
    clearHttpOnlySessionCookie(res);
    return { message: 'Sesión cerrada correctamente' };
  }

  // ==========================================
  // RUTA DE PERFIL (PROTEGIDA)
  // ==========================================
  @ApiBearerAuth()
  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  getProfile(@Req() req: AuthenticatedRequest) {
    return req.user;
  }
}
