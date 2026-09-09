import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCreditCardDto } from './dto/create-credit-card.dto';
import { UpdateCreditCardDto } from './dto/update-credit-card.dto';

@Injectable()
export class CreditCardsService {
  constructor(private readonly prisma: PrismaService) {}

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

  private getCardCycleDates(closingDay: number, referenceDate: Date = new Date()) {
    const currentYear = referenceDate.getFullYear();
    const currentMonth = referenceDate.getMonth();
    const currentDay = referenceDate.getDate();

    let startMonth = currentMonth;
    if (currentDay < closingDay) {
      startMonth = currentMonth - 1;
    }

    const getClampedDate = (year: number, month: number, day: number) => {
      const firstOfMonth = new Date(year, month, 1);
      const daysInMonth = new Date(firstOfMonth.getFullYear(), firstOfMonth.getMonth() + 1, 0).getDate();
      const clampedDay = Math.min(day, daysInMonth);
      return new Date(firstOfMonth.getFullYear(), firstOfMonth.getMonth(), clampedDay, 0, 0, 0, 0);
    };

    const cycleStart = getClampedDate(currentYear, startMonth, closingDay);
    const cycleEnd = getClampedDate(currentYear, startMonth + 1, closingDay);

    return { cycleStart, cycleEnd };
  }

  async findAllByUser(userId: string) {
    const cards = await this.prisma.creditCard.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });

    if (cards.length === 0) return [];

    const today = new Date();

    const cardsWithConsumption = await Promise.all(
      cards.map(async (card) => {
        const { cycleStart, cycleEnd } = this.getCardCycleDates(card.closingDay, today);

        const expenses = await this.prisma.transaction.aggregate({
          where: {
            creditCardId: card.id,
            date: { 
              gte: cycleStart,
              lt: cycleEnd,
            },
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

  // ==========================================
  // NUEVO MÉTODO: UPDATE SEGURO
  // ==========================================
  async update(id: string, updateCreditCardDto: UpdateCreditCardDto, userId: string) {
    // 1. Verificamos pertenencia
    await this.getCardOrThrow(id, userId);

    // 2. Actualizamos
    return this.prisma.creditCard.update({
      where: { id },
      data: updateCreditCardDto,
    });
  }

  async remove(id: string, userId: string) {
    await this.getCardOrThrow(id, userId);
    return this.prisma.creditCard.delete({ where: { id } });
  }

  async getBestCardToUse(userId: string) {
    const cards = await this.prisma.creditCard.findMany({ where: { userId } });
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