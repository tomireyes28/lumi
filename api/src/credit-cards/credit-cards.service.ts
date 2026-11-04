import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCreditCardDto } from './dto/create-credit-card.dto';
import { UpdateCreditCardDto } from './dto/update-credit-card.dto';
import { UpsertCardCycleDto } from './dto/upsert-card-cycle.dto';
import { CreditCard, CardCycle } from '@prisma/client';
import { getCalendarDayParts, parseLocalDate } from '../utils/date.util';

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

    const getClampedDay = (year: number, monthIndex: number, day: number) => {
      const firstOfMonth = new Date(year, monthIndex, 1);
      const daysInMonth = new Date(
        firstOfMonth.getFullYear(),
        firstOfMonth.getMonth() + 1,
        0,
      ).getDate();
      return Math.min(day, daysInMonth);
    };

    const getCycleDataFor = (targetYear: number, targetMonth: number) => {
      const custom = card.cycles?.find(
        (c) => c.year === targetYear && c.month === targetMonth,
      );

      if (custom) {
        const cParts = getCalendarDayParts(new Date(custom.closingDate));
        // Anclamos la fecha calendario al mediodía local (12:00) para evitar desplazamientos de día al serializar a ISO/UTC,
        // y mantenemos el límite operativo del ciclo al final del día (23:59:59.999).
        const closingDate = new Date(
          cParts.year,
          cParts.monthIndex,
          cParts.day,
          12,
          0,
          0,
          0,
        );
        const closingBoundary = new Date(
          cParts.year,
          cParts.monthIndex,
          cParts.day,
          23,
          59,
          59,
          999,
        );
        let dueDate: Date | null = null;
        if (custom.dueDate) {
          const dParts = getCalendarDayParts(new Date(custom.dueDate));
          dueDate = new Date(
            dParts.year,
            dParts.monthIndex,
            dParts.day,
            12,
            0,
            0,
            0,
          );
        }
        return { closingDate, closingBoundary, dueDate, isCustom: true };
      }

      // Fallback: día habitual
      const clampedClosingDay = getClampedDay(
        targetYear,
        targetMonth - 1,
        card.closingDay,
      );
      const closingDate = new Date(
        targetYear,
        targetMonth - 1,
        clampedClosingDay,
        12,
        0,
        0,
        0,
      );
      const closingBoundary = new Date(
        targetYear,
        targetMonth - 1,
        clampedClosingDay,
        23,
        59,
        59,
        999,
      );
      const dueMonthYear =
        card.dueDay <= card.closingDay
          ? targetMonth === 12
            ? targetYear + 1
            : targetYear
          : targetYear;
      const dueMonthIndex =
        card.dueDay <= card.closingDay
          ? targetMonth === 12
            ? 0
            : targetMonth
          : targetMonth - 1;
      const clampedDueDay = getClampedDay(
        dueMonthYear,
        dueMonthIndex,
        card.dueDay,
      );
      const dueDate = new Date(
        dueMonthYear,
        dueMonthIndex,
        clampedDueDay,
        12,
        0,
        0,
        0,
      );

      return { closingDate, closingBoundary, dueDate, isCustom: false };
    };

    // 1. Verificamos el cierre del mes actual de referencia
    const currentMonthCycle = getCycleDataFor(refYear, refMonth);

    let activeCycleMonth = refMonth;
    let activeCycleYear = refYear;
    let cycleEnd = currentMonthCycle.closingBoundary;
    let cycleClosingDate = currentMonthCycle.closingDate;
    let cycleDueDate = currentMonthCycle.dueDate;
    let isCustom = currentMonthCycle.isCustom;
    let cycleStart: Date;

    if (referenceDate.getTime() <= currentMonthCycle.closingBoundary.getTime()) {
      // Estamos dentro del ciclo que cierra este mes
      const prevMonth = refMonth === 1 ? 12 : refMonth - 1;
      const prevYear = refMonth === 1 ? refYear - 1 : refYear;
      const prevMonthCycle = getCycleDataFor(prevYear, prevMonth);
      cycleStart = prevMonthCycle.closingBoundary;
    } else {
      // El cierre de este mes ya pasó; estamos en el ciclo del mes siguiente
      cycleStart = currentMonthCycle.closingBoundary;
      const nextMonth = refMonth === 12 ? 1 : refMonth + 1;
      const nextYear = refMonth === 12 ? refYear + 1 : refYear;
      const nextMonthCycle = getCycleDataFor(nextYear, nextMonth);
      activeCycleMonth = nextMonth;
      activeCycleYear = nextYear;
      cycleEnd = nextMonthCycle.closingBoundary;
      cycleClosingDate = nextMonthCycle.closingDate;
      cycleDueDate = nextMonthCycle.dueDate;
      isCustom = nextMonthCycle.isCustom;
    }

    const refMidnight = new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth(),
      referenceDate.getDate(),
    );
    const closingMidnight = new Date(
      cycleClosingDate.getFullYear(),
      cycleClosingDate.getMonth(),
      cycleClosingDate.getDate(),
    );
    const daysToClose = Math.max(
      0,
      Math.round(
        (closingMidnight.getTime() - refMidnight.getTime()) /
          (1000 * 60 * 60 * 24),
      ),
    );

    return {
      cycleStart,
      cycleEnd,
      month: activeCycleMonth,
      year: activeCycleYear,
      closingDate: cycleClosingDate,
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
    const cardCycles = cards.map((card) => ({
      card,
      cycleInfo: this.getCycleDatesForCard(card, today),
    }));

    if (typeof this.prisma.transaction?.findMany === 'function') {
      const minStart = new Date(
        Math.min(...cardCycles.map((c) => c.cycleInfo.cycleStart.getTime())),
      );
      const maxEnd = new Date(
        Math.max(...cardCycles.map((c) => c.cycleInfo.cycleEnd.getTime())),
      );

      const cycleTransactions = await this.prisma.transaction.findMany({
        where: {
          userId,
          creditCardId: { in: cards.map((c) => c.id) },
          date: { gt: minStart, lte: maxEnd },
        },
        select: {
          creditCardId: true,
          amount: true,
          date: true,
        },
      });

      return cardCycles.map(({ card, cycleInfo }) => {
        const consumedCents = cycleTransactions
          .filter(
            (tx) =>
              tx.creditCardId === card.id &&
              tx.date > cycleInfo.cycleStart &&
              tx.date <= cycleInfo.cycleEnd,
          )
          .reduce((sum, tx) => sum + Math.round(Number(tx.amount) * 100), 0);

        return {
          ...card,
          consumed: consumedCents / 100,
          currentCycle: {
            month: cycleInfo.month,
            year: cycleInfo.year,
            closingDate: cycleInfo.closingDate.toISOString(),
            dueDate: cycleInfo.dueDate ? cycleInfo.dueDate.toISOString() : null,
            isCustom: cycleInfo.isCustom,
            daysToClose: cycleInfo.daysToClose,
          },
        };
      });
    }

    const cardsWithConsumption = await Promise.all(
      cardCycles.map(async ({ card, cycleInfo }) => {
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

    const txCount =
      typeof this.prisma.transaction?.count === 'function'
        ? await this.prisma.transaction.count({ where: { creditCardId: id } })
        : 0;

    if (txCount > 0) {
      throw new BadRequestException(
        `No podés eliminar esta tarjeta porque tiene ${txCount} movimientos asociados. Eliminá o reasigná esos consumos primero para no alterar tu historial.`,
      );
    }

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
      ? bestClosingDate.toLocaleDateString('es-AR', {
          day: '2-digit',
          month: 'short',
        })
      : `${bestCard.closingDay}`;

    return {
      card: bestCard,
      daysToClose: maxDaysToClose,
      criterion: 'max_days_to_closing',
      message: `Mayor margen hasta el cierre: tenés ${maxDaysToClose} días hasta el próximo cierre (${formattedClosing}).`,
    };
  }

  // ==========================================
  // GESTIÓN DE CICLOS MENSUALES ESPECÍFICOS
  // ==========================================

  async upsertCycle(cardId: string, dto: UpsertCardCycleDto, userId: string) {
    await this.getCardOrThrow(cardId, userId);

    const closingDate = parseLocalDate(dto.closingDate);
    if (
      closingDate.getFullYear() !== dto.year ||
      closingDate.getMonth() + 1 !== dto.month
    ) {
      throw new BadRequestException(
        'La fecha de cierre debe corresponder al mes y año del período indicado.',
      );
    }

    const dueDate = dto.dueDate ? parseLocalDate(dto.dueDate) : null;
    if (dueDate && dueDate.getTime() < closingDate.getTime()) {
      throw new BadRequestException(
        'La fecha de vencimiento no puede ser anterior a la fecha de cierre.',
      );
    }

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