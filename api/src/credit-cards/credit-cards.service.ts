import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCreditCardDto } from './dto/create-credit-card.dto';

@Injectable()
export class CreditCardsService {
  constructor(private readonly prisma: PrismaService) {}

  // 👇 DRY: Helper de seguridad y existencia
  private async getCardOrThrow(id: string, userId: string) {
    const card = await this.prisma.creditCard.findUnique({ where: { id } });
    
    if (!card || card.userId !== userId) {
      throw new NotFoundException('Tarjeta no encontrada o no autorizada');
    }
    return card;
  }

  async create(createCreditCardDto: CreateCreditCardDto, userId: string) {
    return this.prisma.creditCard.create({
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
    const cards = await this.prisma.creditCard.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });

    const today = new Date();

    // Resolviendo consumos en paralelo
    const cardsWithConsumption = await Promise.all(
      cards.map(async (card) => {
        const cycleStart = new Date(today.getFullYear(), today.getMonth(), card.closingDay);
        
        if (today.getDate() < card.closingDay) {
          cycleStart.setMonth(cycleStart.getMonth() - 1);
        }

        const expenses = await this.prisma.transaction.aggregate({
          where: {
            creditCardId: card.id,
            date: { gte: cycleStart },
          },
          _sum: { amount: true },
        });

        return {
          ...card,
          consumed: Number(expenses._sum.amount || 0),
        };
      })
    );

    return cardsWithConsumption;
  }

  async remove(id: string, userId: string) {
    // Reutilizamos la validación de seguridad
    await this.getCardOrThrow(id, userId);

    return this.prisma.creditCard.delete({
      where: { id },
    });
  }

  async getBestCardToUse(userId: string) {
    const cards = await this.prisma.creditCard.findMany({
      where: { userId },
    });

    if (cards.length === 0) return null;

    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    let bestCard: typeof cards[0] | null = null;
    let maxDaysToClose = -1;

    for (const card of cards) {
      let daysToClose: number;

      if (currentDay < card.closingDay) {
        daysToClose = card.closingDay - currentDay;
      } else {
        const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        daysToClose = (daysInCurrentMonth - currentDay) + card.closingDay;
      }

      if (daysToClose > maxDaysToClose) {
        maxDaysToClose = daysToClose;
        bestCard = card;
      }
    }

    if (!bestCard) return null;

    return {
      card: bestCard,
      daysToClose: maxDaysToClose,
      message: `Ideal para usar hoy. Tenés ${maxDaysToClose} días hasta el próximo cierre.`
    };
  }
}