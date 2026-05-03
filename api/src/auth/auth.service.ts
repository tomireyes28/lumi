import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleUser } from './interfaces/auth.interfaces';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
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

    // Acá está la magia: guardamos y actualizamos la foto
    const user = await this.prisma.user.upsert({
      where: { email: reqUser.email },
      update: { 
        name: reqUser.name,
        picture: reqUser.picture, // <-- Agregado para actualizar foto
      },
      create: {
        email: reqUser.email,
        name: reqUser.name,
        picture: reqUser.picture, // <-- Agregado para guardar foto al crear
      },
    });

    const payload = { sub: user.id, email: user.email };
    return this.jwtService.sign(payload, { secret: process.env.JWT_SECRET, expiresIn: '7d' });
  }

  // ==========================================
  // AUTENTICACIÓN LOCAL (EMAIL/PASSWORD)
  // ==========================================
  async register(body: RegisterDto) {
    const { name, email, password } = body;

    const userExists = await this.prisma.user.findUnique({ where: { email } });
    if (userExists) {
      throw new BadRequestException('El email ya está registrado.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await this.prisma.user.create({
      data: {
        name,
        email,
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

    const user = await this.prisma.user.findUnique({ where: { email } });
    
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