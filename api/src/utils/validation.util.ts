import { ValidateBy, ValidateIf, ValidationOptions } from 'class-validator';
import { isValidCalendarDateString } from './date.util';

/**
 * Permite que el campo sea omitido (`undefined`), pero NO acepta `null`.
 * Evita que actualizaciones parciales (PATCH) pasen `null` hacia columnas NOT NULL.
 */
export function IsOptionalNonNullable(validationOptions?: ValidationOptions): PropertyDecorator {
  return ValidateIf((_object: unknown, value: unknown) => value !== undefined, validationOptions);
}

/**
 * Valida que el valor sea una cadena de fecha calendario existente ('YYYY-MM-DD' o ISO-8601 válido).
 * Rechaza textos arbitrarios ('not-a-date') y días inexistentes ('2026-02-31').
 */
export function IsValidCalendarDate(validationOptions?: ValidationOptions): PropertyDecorator {
  return ValidateBy(
    {
      name: 'isValidCalendarDate',
      validator: {
        validate(value: unknown): boolean {
          return isValidCalendarDateString(value);
        },
        defaultMessage(): string {
          return 'La fecha proporcionada no es una fecha calendario válida (YYYY-MM-DD)';
        },
      },
    },
    validationOptions,
  );
}
