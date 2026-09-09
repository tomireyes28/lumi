import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleUser } from './interfaces/auth.interfaces';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

@Injectable()
export class AuthService {
  // Almacén temporal en memoria para códigos de intercambio OAuth de un solo uso (TTL 60s)
  private readonly oauthExchangeCodes = new Map<string, { token: string; expiresAt: number }>();

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  // ==========================================
  // AUTENTICACIÓN CON GOOGLE
  // ==========================================
  async googleLogin(reqUser: GoogleUser) {
    if (!reqUser || !reqUser.email) {
      throw new BadRequestException('No user from Google');
    }

    const normalizedEmail = reqUser.email.trim().toLowerCase();

    // Acá está la magia: guardamos y actualizamos la foto
    const user = await this.prisma.user.upsert({
      where: { email: normalizedEmail },
      update: { 
        name: reqUser.name,
        picture: reqUser.picture,
      },
      create: {
        email: normalizedEmail,
        name: reqUser.name,
        picture: reqUser.picture,
      },
    });

    const payload = { sub: user.id, email: user.email };
    return this.jwtService.sign(payload, { secret: process.env.JWT_SECRET, expiresIn: '7d' });
  }

  // Genera un código temporal de un solo uso para no exponer el JWT en la URL
  createOAuthExchangeCode(token: string): string {
    const now = Date.now();
    // Limpieza de códigos viejos expirados
    for (const [code, entry] of this.oauthExchangeCodes.entries()) {
      if (entry.expiresAt < now) {
        this.oauthExchangeCodes.delete(code);
      }
    }

    const code = randomUUID();
    this.oauthExchangeCodes.set(code, {
      token,
      expiresAt: now + 60 * 1000, // Válido por 60 segundos
    });
    return code;
  }

  // Canjea el código temporal por el token JWT y datos de usuario
  async exchangeOAuthCode(code: string) {
    const entry = this.oauthExchangeCodes.get(code);
    if (!entry || entry.expiresAt < Date.now()) {
      if (entry) this.oauthExchangeCodes.delete(code);
      throw new UnauthorizedException('El código de autorización ha expirado o es inválido.');
    }

    // Quemamos el código inmediatamente (uso único)
    this.oauthExchangeCodes.delete(code);

    const payload = this.jwtService.verify(entry.token, { secret: process.env.JWT_SECRET });
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
    const normalizedEmail = email.trim().toLowerCase();

    const userExists = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (userExists) {
      throw new BadRequestException('El email ya está registrado.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await this.prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
      },
    });

    const payload = { sub: newUser.id, email: newUser.email };
    return {
      token: this.jwtService.sign(payload, { secret: process.env.JWT_SECRET, expiresIn: '7d' }),
      user: { id: newUser.id, name: newUser.name, email: newUser.email, picture: newUser.picture },
    };
  }

  async login(body: LoginDto) {
    const { email, password } = body;
    const normalizedEmail = email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    
    if (!user || !user.password) {
      throw new UnauthorizedException('Credenciales inválidas. Si usaste Google, iniciá sesión por ahí.');
    }

    const isPasswordValid = await bcrypt.compare(String(password), user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    const payload = { sub: user.id, email: user.email };
    return {
      token: this.jwtService.sign(payload, { secret: process.env.JWT_SECRET, expiresIn: '7d' }),
      user: { id: user.id, name: user.name, email: user.email, picture: user.picture },
    };
  }
}