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
    // 1. Traemos todas las tarjetas del usuario
    const cards = await this.prisma.creditCard.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });

    const today = new Date();

    // 2. Calculamos el consumo exacto de CADA tarjeta según su día de cierre
    const cardsWithConsumption = await Promise.all(
      cards.map(async (card) => {
        // Lógica del ciclo: Si hoy es 10 y la tarjeta cierra el 25, 
        // el ciclo empezó el 25 del MES PASADO.
        const cycleStart = new Date(today.getFullYear(), today.getMonth(), card.closingDay);
        
        if (today.getDate() < card.closingDay) {
          // Restamos un mes
          cycleStart.setMonth(cycleStart.getMonth() - 1);
        }

        // Sumamos solo las transacciones de esta tarjeta DESDE que arrancó el ciclo
        const expenses = await this.prisma.transaction.aggregate({
          where: {
            creditCardId: card.id,
            date: { gte: cycleStart },
          },
          _sum: { amount: true },
        });

        const consumed = Number(expenses._sum.amount || 0);

        // Devolvemos la tarjeta con el dato extra del consumo
        return {
          ...card,
          consumed,
        };
      })
    );

    return cardsWithConsumption;
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
      let daysToClose : number;

      if (currentDay < card.closingDay) {
        // Cierra este mismo mes. Ej: Hoy es 10, cierra el 25. Faltan 15 días.
        daysToClose = card.closingDay - currentDay;
      } else {
        // Ya cerró este mes (es la ideal). Cierra el mes que viene.
        // Calculamos cuántos días faltan para que termine el mes actual + el día de cierre del próximo
        const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const daysLeftInMonth = daysInCurrentMonth - currentDay;
        daysToClose = daysLeftInMonth + card.closingDay;
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