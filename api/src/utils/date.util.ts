import { BadRequestException } from '@nestjs/common';

export function getMonthDateRange(year: number, month: number) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);
  return { startDate, endDate };
}

/**
 * Valida que una cadena represente una fecha calendario real (sin desbordes como 2026-02-31).
 */
export function isValidCalendarDateString(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/.exec(trimmed);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (year < 1970 || year > 2100 || month < 1 || month > 12 || day < 1) {
    return false;
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  if (day > daysInMonth) {
    return false;
  }

  const parsed = new Date(trimmed);
  return !Number.isNaN(parsed.getTime());
}

/**
 * Parsea un string de fecha ('YYYY-MM-DD' o ISO completo) o instancia Date
 * evitando el corrimiento de -1 día en zonas horarias negativas (ej: UTC-3 Argentina)
 * y evitando que días inexistentes (ej: 31 de febrero) desborden al mes siguiente.
 */
export function parseLocalDate(dateInput: string | Date): Date {
  if (dateInput instanceof Date) {
    if (Number.isNaN(dateInput.getTime())) {
      throw new BadRequestException('Fecha inválida.');
    }
    return dateInput;
  }

  if (typeof dateInput !== 'string') {
    throw new BadRequestException('Fecha inválida: se esperaba un texto de fecha válido.');
  }

  const trimmed = dateInput.trim();
  if (!trimmed) {
    throw new BadRequestException('Fecha inválida: la fecha no puede estar vacía.');
  }

  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (dateOnlyMatch) {
    const year = Number(dateOnlyMatch[1]);
    const month = Number(dateOnlyMatch[2]);
    const rawDay = Number(dateOnlyMatch[3]);

    if (month < 1 || month > 12) {
      throw new BadRequestException('Fecha inválida: el mes debe estar entre 1 y 12.');
    }

    const daysInMonth = new Date(year, month, 0).getDate();
    const clampedDay = Math.min(Math.max(1, rawDay), daysInMonth);
    return new Date(year, month - 1, clampedDay, 12, 0, 0, 0);
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException('Fecha inválida.');
  }
  return parsed;
}

/**
 * Extrae año, mes (0-indexed) y día preservando la fecha calendario
 * tanto para fechas guardadas en medianoche UTC (00:00:00.000Z) como en hora local.
 */
export function getCalendarDayParts(date: Date): {
  year: number;
  monthIndex: number;
  day: number;
} {
  if (
    date.getUTCHours() === 0 &&
    date.getUTCMinutes() === 0 &&
    date.getUTCSeconds() === 0 &&
    date.getUTCMilliseconds() === 0
  ) {
    return {
      year: date.getUTCFullYear(),
      monthIndex: date.getUTCMonth(),
      day: date.getUTCDate(),
    };
  }

  return {
    year: date.getFullYear(),
    monthIndex: date.getMonth(),
    day: date.getDate(),
  };
}
