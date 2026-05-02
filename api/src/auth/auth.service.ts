import { Injectable, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleUser } from './interfaces/auth.interfaces';



@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async googleLogin(reqUser: GoogleUser) {
    if (!reqUser || !reqUser.email) {
      throw new BadRequestException('No user from Google');
    }

    // Usamos UPSERT: 1 solo viaje a la DB, 0 riesgo de duplicaciones
    const user = await this.prisma.user.upsert({
      where: { email: reqUser.email },
      update: { name: reqUser.name }, // Si ya existe, de paso le actualizamos el nombre por si lo cambió en Google
      create: {
        email: reqUser.email,
        name: reqUser.name,
      },
    });

    const payload = { sub: user.id, email: user.email };
    return this.jwtService.sign(payload, { secret: process.env.JWT_SECRET, expiresIn: '7d' });
  }
}