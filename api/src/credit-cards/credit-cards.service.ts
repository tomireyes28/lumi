import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCreditCardDto } from './dto/create-credit-card.dto';
import { UpdateCreditCardDto } from './dto/update-credit-card.dto';
import { UpsertCardCycleDto } from './dto/upsert-card-cycle.dto';
import { CreditCard, CardCycle } from '@prisma/client';

export type CreditCardWithCycles = CreditCard & {
  cycles?: CardCycle[];
};

export interface CardCycleCalculation {
  cycleStart: Date;
  cycleEnd: Date;
  month: number;
  year: number;
  closingDate: Date;
  dueDate: Date | null;
  isCustom: boolean;
  daysToClose: number;
}

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

  /**
   * Calcula el ciclo de facturación activo de la tarjeta para una fecha de referencia.
   * Si el usuario configuró una fecha personalizada para ese mes (CardCycle), se usa esa fecha exacta.
   * De lo contrario, se usa closingDay como fallback automático.
   */
  getCycleDatesForCard(
    card: CreditCardWithCycles,
    referenceDate: Date = new Date(),
  ): CardCycleCalculation {
    const refYear = referenceDate.getFullYear();
    const refMonth = referenceDate.getMonth() + 1; // 1 a 12

    const getClampedDate = (year: number, monthIndex: number, day: number, endOfDay: boolean) => {
      const firstOfMonth = new Date(year, monthIndex, 1);
      const daysInMonth = new Date(firstOfMonth.getFullYear(), firstOfMonth.getMonth() + 1, 0).getDate();
      const clampedDay = Math.min(day, daysInMonth);
      if (endOfDay) {
        return new Date(firstOfMonth.getFullYear(), firstOfMonth.getMonth(), clampedDay, 23, 59, 59, 999);
      }
      return new Date(firstOfMonth.getFullYear(), firstOfMonth.getMonth(), clampedDay, 0, 0, 0, 0);
    };

    const getCycleDataFor = (targetYear: number, targetMonth: number) => {
      const custom = card.cycles?.find(
        (c) => c.year === targetYear && c.month === targetMonth,
      );

      if (custom) {
        const cDate = new Date(custom.closingDate);
        // Marcamos el final del día de cierre exacto
        const closingDate = new Date(cDate.getFullYear(), cDate.getMonth(), cDate.getDate(), 23, 59, 59, 999);
        const dueDate = custom.dueDate ? new Date(custom.dueDate) : null;
        return { closingDate, dueDate, isCustom: true };
      }

      // Fallback: día habitual
      const closingDate = getClampedDate(targetYear, targetMonth - 1, card.closingDay, true);
      const dueMonthYear = card.dueDay < card.closingDay ? (targetMonth === 12 ? targetYear + 1 : targetYear) : targetYear;
      const dueMonthIndex = card.dueDay < card.closingDay ? (targetMonth === 12 ? 0 : targetMonth) : targetMonth - 1;
      const dueDate = getClampedDate(dueMonthYear, dueMonthIndex, card.dueDay, false);

      return { closingDate, dueDate, isCustom: false };
    };

    // 1. Verificamos el cierre del mes actual de referencia
    const currentMonthCycle = getCycleDataFor(refYear, refMonth);

    let activeCycleMonth = refMonth;
    let activeCycleYear = refYear;
    let cycleEnd = currentMonthCycle.closingDate;
    let cycleDueDate = currentMonthCycle.dueDate;
    let isCustom = currentMonthCycle.isCustom;
    let cycleStart: Date;

    if (referenceDate.getTime() <= currentMonthCycle.closingDate.getTime()) {
      // Estamos dentro del ciclo que cierra este mes
      const prevMonth = refMonth === 1 ? 12 : refMonth - 1;
      const prevYear = refMonth === 1 ? refYear - 1 : refYear;
      const prevMonthCycle = getCycleDataFor(prevYear, prevMonth);
      cycleStart = prevMonthCycle.closingDate;
    } else {
      // El cierre de este mes ya pasó; estamos en el ciclo del mes siguiente
      cycleStart = currentMonthCycle.closingDate;
      const nextMonth = refMonth === 12 ? 1 : refMonth + 1;
      const nextYear = refMonth === 12 ? refYear + 1 : refYear;
      const nextMonthCycle = getCycleDataFor(nextYear, nextMonth);
      activeCycleMonth = nextMonth;
      activeCycleYear = nextYear;
      cycleEnd = nextMonthCycle.closingDate;
      cycleDueDate = nextMonthCycle.dueDate;
      isCustom = nextMonthCycle.isCustom;
    }

    const refMidnight = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
    const closingMidnight = new Date(cycleEnd.getFullYear(), cycleEnd.getMonth(), cycleEnd.getDate());
    const daysToClose = Math.max(0, Math.round((closingMidnight.getTime() - refMidnight.getTime()) / (1000 * 60 * 60 * 24)));

    return {
      cycleStart,
      cycleEnd,
      month: activeCycleMonth,
      year: activeCycleYear,
      closingDate: cycleEnd,
      dueDate: cycleDueDate,
      isCustom,
      daysToClose,
    };
  }

  async findAllByUser(userId: string) {
    const cards = await this.prisma.creditCard.findMany({
      where: { userId },
      include: {
        cycles: {
          orderBy: [{ year: 'desc' }, { month: 'desc' }],
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (cards.length === 0) return [];

    const today = new Date();

    const cardsWithConsumption = await Promise.all(
      cards.map(async (card) => {
        const cycleInfo = this.getCycleDatesForCard(card, today);

        const expenses = await this.prisma.transaction.aggregate({
          where: {
            creditCardId: card.id,
            date: {
              gt: cycleInfo.cycleStart,
              lte: cycleInfo.cycleEnd,
            },
          },
          _sum: { amount: true },
        });

        return {
          ...card,
          consumed: Number(expenses._sum.amount || 0),
          currentCycle: {
            month: cycleInfo.month,
            year: cycleInfo.year,
            closingDate: cycleInfo.closingDate.toISOString(),
            dueDate: cycleInfo.dueDate ? cycleInfo.dueDate.toISOString() : null,
            isCustom: cycleInfo.isCustom,
            daysToClose: cycleInfo.daysToClose,
          },
        };
      }),
    );

    return cardsWithConsumption;
  }

  async update(id: string, updateCreditCardDto: UpdateCreditCardDto, userId: string) {
    await this.getCardOrThrow(id, userId);

    return this.prisma.creditCard.update({
      where: { id },
      data: updateCreditCardDto,
    });
  }

  async remove(id: string, userId: string) {
    await this.getCardOrThrow(id, userId);
    return this.prisma.creditCard.delete({ where: { id } });
  }

  async getBestCardToUse(userId: string, referenceDate: Date = new Date()) {
    const cards = await this.prisma.creditCard.findMany({
      where: { userId },
      include: {
        cycles: true,
      },
    });
    if (cards.length === 0) return null;

    const today = referenceDate;

    let bestCard: (typeof cards)[0] | null = null;
    let maxDaysToClose = -1;
    let bestClosingDate: Date | null = null;

    for (const card of cards) {
      const cycleInfo = this.getCycleDatesForCard(card, today);
      if (cycleInfo.daysToClose > maxDaysToClose) {
        maxDaysToClose = cycleInfo.daysToClose;
        bestCard = card;
        bestClosingDate = cycleInfo.closingDate;
      }
    }

    if (!bestCard) return null;

    const formattedClosing = bestClosingDate
      ? bestClosingDate.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
      : `${bestCard.closingDay}`;

    return {
      card: bestCard,
      daysToClose: maxDaysToClose,
      message: `Ideal para usar hoy. Tenés ${maxDaysToClose} días hasta el próximo cierre (${formattedClosing}).`,
    };
  }

  // ==========================================
  // GESTIÓN DE CICLOS MENSUALES ESPECÍFICOS
  // ==========================================

  async upsertCycle(cardId: string, dto: UpsertCardCycleDto, userId: string) {
    await this.getCardOrThrow(cardId, userId);

    const cDate = new Date(dto.closingDate);
    const closingDate = new Date(cDate.getFullYear(), cDate.getMonth(), cDate.getDate(), 12, 0, 0);
    const dueDate = dto.dueDate ? new Date(new Date(dto.dueDate).getFullYear(), new Date(dto.dueDate).getMonth(), new Date(dto.dueDate).getDate(), 12, 0, 0) : null;

    return this.prisma.cardCycle.upsert({
      where: {
        creditCardId_year_month: {
          creditCardId: cardId,
          year: dto.year,
          month: dto.month,
        },
      },
      create: {
        creditCardId: cardId,
        year: dto.year,
        month: dto.month,
        closingDate,
        dueDate,
      },
      update: {
        closingDate,
        dueDate,
      },
    });
  }

  async getCycles(cardId: string, userId: string) {
    await this.getCardOrThrow(cardId, userId);

    return this.prisma.cardCycle.findMany({
      where: { creditCardId: cardId },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
  }

  async removeCycle(cardId: string, cycleId: string, userId: string) {
    await this.getCardOrThrow(cardId, userId);

    const cycle = await this.prisma.cardCycle.findUnique({
      where: { id: cycleId },
    });

    if (!cycle || cycle.creditCardId !== cardId) {
      throw new NotFoundException('Ciclo no encontrado');
    }

    return this.prisma.cardCycle.delete({ where: { id: cycleId } });
  }
}