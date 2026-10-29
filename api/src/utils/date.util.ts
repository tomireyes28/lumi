export function getMonthDateRange(year: number, month: number) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);
  return { startDate, endDate };
}

/**
 * Parsea un string de fecha ('YYYY-MM-DD' o ISO completo) o instancia Date
 * evitando el corrimiento de -1 día en zonas horarias negativas (ej: UTC-3 Argentina)
 * cuando se reciben cadenas 'YYYY-MM-DD' sin componente horario.
 */
export function parseLocalDate(dateInput: string | Date): Date {
  if (dateInput instanceof Date) {
    return dateInput;
  }

  const trimmed = dateInput.trim();
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (dateOnlyMatch) {
    const year = Number(dateOnlyMatch[1]);
    const monthIndex = Number(dateOnlyMatch[2]) - 1;
    const day = Number(dateOnlyMatch[3]);
    return new Date(year, monthIndex, day, 12, 0, 0, 0);
  }

  return new Date(trimmed);
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
