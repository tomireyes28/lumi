import { z } from 'zod';

// Canonical HTTP response DTOs. Amounts preserve the existing wire contract:
// entity Decimal = decimal string or number; computed totals = finite numbers.
export const moneySchema = z
  .union([z.number().finite(), z.string().regex(/^-?\d+(\.\d{1,2})?$/)])
  .refine(
    (value) =>
      Number.isFinite(Number(value)) &&
      Number.isSafeInteger(Math.round(Number(value) * 100)),
  );
const num = z.number().finite();
const id = z.string().min(1);
const integer = z.number().int();
const month = integer.min(1).max(12);
const year = integer.min(1970).max(2100);
const instant = z.iso.datetime({ offset: true });
const nullableDate = instant.nullable().optional();
const color = z.string().nullable();
export const publicUserSchema = z.object({
  id,
  email: z.email(),
  name: z.string().min(1),
  picture: z.string().nullable().optional(),
});
export const browserAuthSchema = z.object({ user: publicUserSchema });
export const apiAuthSchema = browserAuthSchema.extend({
  token: z.string().min(1),
});
export const categorySchema = z.object({
  id,
  name: z.string().min(1),
  type: z.enum(['income', 'expense']),
  colorHex: color,
  icon: z.string().nullable(),
});
export const cycleSchema = z.object({
  id,
  creditCardId: id,
  month,
  year,
  closingDate: instant,
  dueDate: instant.nullable(),
  createdAt: instant.optional(),
  updatedAt: instant.optional(),
});
export const cycleInfoSchema = z.object({
  month,
  year,
  closingDate: instant,
  dueDate: instant.nullable(),
  isCustom: z.boolean(),
  daysToClose: integer,
});
export const cardSchema = z.object({
  id,
  alias: z.string(),
  lastFour: z.string().regex(/^\d{4}$/),
  limit: moneySchema,
  closingDay: integer.min(1).max(31),
  dueDay: integer.min(1).max(31),
  colorHex: color,
  consumed: num.optional(),
  currentCycle: cycleInfoSchema.optional(),
  cycles: z.array(cycleSchema).optional(),
});
export const transactionSchema = z.object({
  id,
  amount: moneySchema,
  date: instant,
  note: z.string().nullable(),
  paymentMethod: z.enum(['cash', 'credit_card']).optional(),
  category: categorySchema,
  creditCard: cardSchema.nullable().optional(),
  referenceDate: nullableDate,
  purchaseDate: nullableDate,
  statementYear: year.nullable().optional(),
  statementMonth: month.nullable().optional(),
  statementClosingDate: nullableDate,
  paymentDueDate: nullableDate,
  installmentNumber: integer.min(1).nullable().optional(),
  installmentCount: integer.min(1).nullable().optional(),
});
export const paginationMetaSchema = z
  .object({
    total: integer.min(0),
    page: integer.min(1).max(10000),
    limit: integer.min(1).max(100),
    totalPages: integer.min(0),
  })
  .refine((meta) => meta.totalPages === Math.ceil(meta.total / meta.limit));
export const transactionPageSchema = z
  .object({ data: z.array(transactionSchema), meta: paginationMetaSchema })
  .refine(
    (value) =>
      value.data.length ===
      Math.max(
        0,
        Math.min(
          value.meta.limit,
          value.meta.total - (value.meta.page - 1) * value.meta.limit,
        ),
      ),
  );
export const reminderSchema = z.object({
  id,
  title: z.string(),
  amount: moneySchema.nullable(),
  dueDate: instant,
  dueOn: nullableDate,
  isPaid: z.boolean(),
  isRecurring: z.boolean().optional(),
  rule: z.object({ active: z.boolean() }).nullable().optional(),
});
export const summarySchema = z.object({
  period: z.string(),
  availableCash: num,
  totalIncome: num,
  totalCashExpense: num,
  totalCardExpense: num,
});
export const recommendationSchema = z
  .object({
    card: z.object({ alias: z.string(), lastFour: z.string() }),
    daysToClose: integer,
    message: z.string(),
  })
  .nullable();
const status = z.enum(['ok', 'warning', 'exceeded']);
export const budgetItemSchema = z.object({
  id,
  categoryId: id,
  category: categorySchema.omit({ type: true }),
  budgetedAmount: num,
  spentAmount: num,
  remainingAmount: num,
  percentageSpent: num,
  status,
});
export const budgetsSchema = z.object({
  period: z.string(),
  totalBudgeted: num,
  totalSpent: num,
  totalRemaining: num,
  overallPercentage: num,
  overallStatus: status.optional(),
  items: z.array(budgetItemSchema),
});
const ratioStatus = z.enum(['available', 'no_income']);
export const forecastMonthSchema = z
  .object({
    period: z.string(),
    label: z.string(),
    month,
    year,
    installmentExpenses: num,
    fixedExpenses: num,
    totalCommitted: num,
    estimatedIncome: num,
    projectedNetCashflow: num,
    commitmentRatio: num.nullable(),
    ratioStatus,
    installments: z.array(
      z.object({
        id,
        note: z.string(),
        amount: num,
        creditCardAlias: z.string(),
      }),
    ),
  })
  .refine(
    (value) =>
      (value.commitmentRatio === null) === (value.ratioStatus === 'no_income'),
  );
export const activePlanSchema = z.object({
  groupId: id,
  concept: z.string(),
  totalInstallments: integer,
  elapsedInstallments: integer.optional(),
  paidInstallments: integer,
  remainingInstallments: integer,
  installmentAmount: num,
  remainingAmount: num,
  totalAmount: num,
  completionPercentage: num,
  finishDate: instant,
  finishPeriod: z.string(),
  creditCard: z
    .object({ alias: z.string(), lastFour: z.string(), colorHex: color })
    .nullable(),
});
export const forecastSchema = z
  .object({
    hasLegacySchedule: z.boolean().optional(),
    monthsCount: integer.min(1).max(12),
    estimatedMonthlyIncome: num,
    totalFutureDebt: num,
    debtFreePeriod: z.string().nullable(),
    averageCommitmentRatio: num.nullable(),
    ratioStatus,
    forecastTimeline: z.array(forecastMonthSchema),
    activePlans: z.array(activePlanSchema),
  })
  .refine(
    (value) =>
      value.forecastTimeline.length === value.monthsCount &&
      (value.averageCommitmentRatio === null) ===
        (value.ratioStatus === 'no_income'),
  );
const analyticsTransaction = z.object({
  id,
  note: z.string().nullable(),
  amount: num,
  date: instant,
});
export const analyticsSchema = z.object({
  currentMonthTotal: num,
  lastMonthTotal: num,
  percentageChange: num,
  categoryBreakdown: z.array(
    z.object({
      name: z.string(),
      color: z.string(),
      total: num,
      transactions: z.array(analyticsTransaction),
    }),
  ),
});

export function responseSchema(
  path: string,
  method = 'GET',
  boundary: 'api' | 'browser' = 'browser',
): z.ZodType | undefined {
  const url = new URL(path, 'http://contract.local'),
    route = url.pathname;
  if (
    method === 'POST' &&
    ['/auth/login', '/auth/register', '/auth/exchange'].includes(route)
  )
    return boundary === 'api' ? apiAuthSchema : browserAuthSchema;
  if (method !== 'GET') return undefined;
  if (route === '/auth/me') return publicUserSchema;
  if (route === '/transactions/summary') return summarySchema;
  if (route === '/transactions')
    return url.searchParams.has('page') || url.searchParams.has('limit')
      ? transactionPageSchema
      : z.array(transactionSchema);
  if (route === '/categories') return z.array(categorySchema);
  if (route === '/credit-cards') return z.array(cardSchema);
  if (route === '/credit-cards/recommendation') return recommendationSchema;
  if (route === '/reminders') return z.array(reminderSchema);
  if (route === '/budgets') return budgetsSchema;
  if (route === '/analytics/forecast') return forecastSchema;
  if (route === '/analytics/monthly') return analyticsSchema;
  return undefined;
}
export class ResponseContractError extends Error {
  constructor() {
    super(
      'La respuesta del servidor es incompatible. No se pueden mostrar los datos; reintentá la carga.',
    );
    this.name = 'ResponseContractError';
  }
}
export function parseHttpResponse(
  path: string,
  method: string,
  payload: unknown,
  boundary: 'api' | 'browser' = 'browser',
): unknown {
  const schema = responseSchema(path, method, boundary);
  if (!schema) return payload;
  const result = schema.safeParse(payload);
  if (!result.success) throw new ResponseContractError();
  return result.data;
}
export function errorMessage(
  payload: unknown,
  fallback = 'Error en la petición a la API',
): string {
  if (!payload || typeof payload !== 'object' || !('message' in payload))
    return fallback;
  const message = payload.message;
  return typeof message === 'string'
    ? message
    : Array.isArray(message) && typeof message[0] === 'string'
      ? message[0]
      : fallback;
}
export type PublicUserDto = z.infer<typeof publicUserSchema>;
export type AuthResponseDto = z.infer<typeof browserAuthSchema>;
export type CategoryDto = z.infer<typeof categorySchema>;
export type CardCycleDto = z.infer<typeof cycleSchema>;
export type CardCycleInfoDto = z.infer<typeof cycleInfoSchema>;
export type CreditCardDto = z.infer<typeof cardSchema>;
export type TransactionDto = z.infer<typeof transactionSchema>;
export type PaginatedTransactionsDto = z.infer<typeof transactionPageSchema>;
export type ReminderDto = z.infer<typeof reminderSchema>;
export type DashboardSummaryDto = z.infer<typeof summarySchema>;
export type CardRecommendationDto = NonNullable<
  z.infer<typeof recommendationSchema>
>;
export type BudgetItemDto = z.infer<typeof budgetItemSchema>;
export type BudgetSummaryDto = z.infer<typeof budgetsSchema>;
export type ForecastMonthDto = z.infer<typeof forecastMonthSchema>;
export type ActivePlanDto = z.infer<typeof activePlanSchema>;
export type ForecastDto = z.infer<typeof forecastSchema>;
export type AnalyticsDto = z.infer<typeof analyticsSchema>;
