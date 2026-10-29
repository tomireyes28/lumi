import { Controller, Get, Post, Body, Req, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, ExchangeCodeDto } from './dto/auth.dto';
import type { Response } from 'express';
import type { AuthenticatedRequest, GoogleAuthRequest } from './interfaces/auth.interfaces';

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
    // Esta ruta es interceptada por el Guard, no necesita código dentro
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req: GoogleAuthRequest, @Res() res: Response) {
    const token = await this.authService.googleLogin(req.user);
    // SEGURIDAD: Nunca pasamos el JWT directamente en la URL pública.
    // Generamos un código de un solo uso con 60 segundos de validez.
    const code = this.authService.createOAuthExchangeCode(token);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    res.redirect(`${frontendUrl}/auth/callback?code=${code}`);
  }

  // Intercambio seguro del código temporal por el Token JWT + datos de usuario
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('exchange')
  exchangeCode(@Body() body: ExchangeCodeDto) {
    return this.authService.exchangeOAuthCode(body.code);
  }

  // ==========================================
  // RUTAS LOCALES (Rate Limiting Estricto Anti-Brute-Force)
  // ==========================================
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('register')
  register(@Body() body: RegisterDto) {
    return this.authService.register(body);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('login')
  login(@Body() body: LoginDto) {
    return this.authService.login(body);
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
