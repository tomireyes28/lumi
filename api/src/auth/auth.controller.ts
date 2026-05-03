import { Controller, Get, Post, Body, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto/auth.dto'; // <-- Importamos los tipos
import type { Request, Response } from 'express';
import type { AuthenticatedRequest, GoogleAuthRequest } from './interfaces/auth.interfaces';

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
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
  }

  // ==========================================
  // RUTAS LOCALES
  // ==========================================
  @Post('register')
  register(@Body() body: RegisterDto) { // <-- Chau any
    return this.authService.register(body);
  }

  @Post('login')
  login(@Body() body: LoginDto) { // <-- Chau any
    return this.authService.login(body);
  }

  // ==========================================
  // RUTA DE PERFIL (PROTEGIDA)
  // ==========================================
  @Get('me')
  @UseGuards(AuthGuard('jwt')) // <-- Este patovica pide el Token JWT sí o sí
  getProfile(@Req() req: AuthenticatedRequest) {
    // Si el token es válido, el Guard lo desencripta y nos deja los datos en req.user
    return req.user;
  }
}