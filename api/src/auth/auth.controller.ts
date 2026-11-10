import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { publicUserSchema, type PublicUserDto } from '../contracts/http';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, ExchangeCodeDto } from './dto/auth.dto';
import type { Response } from 'express';
import type {
  AuthenticatedRequest,
  GoogleAuthRequest,
} from './interfaces/auth.interfaces';

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
  async googleAuthRedirect(
    @Req() req: GoogleAuthRequest,
    @Res() res: Response,
  ) {
    const token = await this.authService.googleLogin(req.user);
    const code = await this.authService.createOAuthExchangeCode(
      token,
      req.oauthClientState,
    );
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    const stateParam = req.oauthClientState
      ? `&state=${encodeURIComponent(req.oauthClientState)}`
      : '';
    res.redirect(
      `${frontendUrl}/auth/callback?code=${encodeURIComponent(code)}${stateParam}`,
    );
  }

  // Intercambio seguro del código temporal por el Token JWT + datos de usuario
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('exchange')
  async exchangeCode(@Body() body: ExchangeCodeDto) {
    const result = await this.authService.exchangeOAuthCode(
      body.code,
      body.state,
    );
    return result;
  }

  // ==========================================
  // RUTAS LOCALES (Rate Limiting Estricto Anti-Brute-Force)
  // ==========================================
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('register')
  async register(@Body() body: RegisterDto) {
    const result = await this.authService.register(body);
    return result;
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('login')
  async login(@Body() body: LoginDto) {
    const result = await this.authService.login(body);
    return result;
  }

  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(200)
  @UseGuards(AuthGuard('jwt'))
  async logout(@Req() req: AuthenticatedRequest) {
    await this.authService.revokeToken(req.user.jti);
    return { message: 'Sesión cerrada correctamente' };
  }

  // ==========================================
  // RUTA DE PERFIL (PROTEGIDA)
  // ==========================================
  @ApiBearerAuth()
  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  getProfile(@Req() req: AuthenticatedRequest): PublicUserDto {
    return publicUserSchema.parse(req.user);
  }
}
