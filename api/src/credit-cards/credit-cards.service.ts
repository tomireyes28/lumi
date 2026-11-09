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
import {
  getCalendarDayParts,
  parseLocalDate,
  BUSINESS_TIMEZONE,
} from '../utils/date.util';
import { activeCardCycle } from './card-calendar';

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
    return activeCardCycle(card, referenceDate);
  }

  async findAllByUser(userId: string, referenceDate: Date = new Date()) {
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

    const today = referenceDate;
    const cardCycles = cards.map((card) => ({
      card,
      cycleInfo: this.getCycleDatesForCard(card, today),
    }));

    {
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
          OR: [
            { statementYear: null, date: { gte: minStart, lte: maxEnd } },
            ...cardCycles.map((c) => ({
              creditCardId: c.card.id,
              statementYear: c.cycleInfo.year,
              statementMonth: c.cycleInfo.month,
            })),
          ],
        },
        select: {
          creditCardId: true,
          amount: true,
          date: true,
          statementYear: true,
          statementMonth: true,
        },
      });

      return cardCycles.map(({ card, cycleInfo }) => {
        const consumedCents = cycleTransactions
          .filter(
            (tx) =>
              tx.creditCardId === card.id &&
              (tx.statementYear != null
                ? tx.statementYear === cycleInfo.year &&
                  tx.statementMonth === cycleInfo.month
                : tx.date >= cycleInfo.cycleStart &&
                  tx.date <= cycleInfo.cycleEnd),
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
  }

  async update(
    id: string,
    updateCreditCardDto: UpdateCreditCardDto,
    userId: string,
  ) {
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
          timeZone: BUSINESS_TIMEZONE,
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
      getCalendarDayParts(closingDate).year !== dto.year ||
      getCalendarDayParts(closingDate).monthIndex + 1 !== dto.month
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
