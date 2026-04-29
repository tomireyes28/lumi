import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCreditCardDto } from './dto/create-credit-card.dto';

@Injectable()
export class CreditCardsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createCreditCardDto: CreateCreditCardDto, userId: string) {
    // Agregamos await para cumplir con la regla estricta de ESLint
    return await this.prisma.creditCard.create({
      data: {
        alias: createCreditCardDto.alias,
        lastFour: createCreditCardDto.lastFour,
        limit: createCreditCardDto.limit,
        closingDay: createCreditCardDto.closingDay,
        dueDay: createCreditCardDto.dueDay,
        colorHex: createCreditCardDto.colorHex,
        user: { connect: { id: userId } },
      },
    });
  }

  async findAllByUser(userId: string) {
    // Agregamos await
    return await this.prisma.creditCard.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async remove(id: string, userId: string) {
    const card = await this.prisma.creditCard.findUnique({ where: { id } });
    
    if (!card || card.userId !== userId) {
      throw new NotFoundException('Tarjeta no encontrada o no autorizada');
    }

    // Agregamos await
    return await this.prisma.creditCard.delete({
      where: { id },
    });
  }
}