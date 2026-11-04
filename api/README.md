# Lumi API — Backend Financiero (NestJS 11 + Prisma 7)

API RESTful de **Lumi**, construida con **NestJS 11**, **TypeScript (`strict: true`)**, **Prisma 7** (`@prisma/adapter-pg`) y **PostgreSQL 16**.

## Módulos Principales

- **`AuthModule` (`/auth`)**: Registro e inicio de sesión local (`bcrypt` con validación `@MaxUtf8Bytes(72)`), OAuth 2.0 con Google (`OAuthStateStore` HMAC-SHA256 + PKCE `S256`), canje mediante códigos efímeros de un solo uso (`POST /auth/google/exchange`) y revocación de sesión por `jti` (`POST /auth/logout`).
- **`TransactionsModule` (`/transactions`)**: Registro de ingresos y gastos, paginación filtrada, preservación histórica de `paymentMethod` (`cash` / `credit_card`), resumen mensual de liquidez y creación de planes de cuotas en centavos enteros con imputación según cierre de tarjeta (`InstallmentCalculator.calculate` + `createMany`).
- **`CreditCardsModule` (`/credit-cards`)**: Administración de tarjetas de crédito, cálculo de consumo del ciclo vigente en una sola consulta acotada, configuración de cierres mensuales personalizados (`CardCycle`) y recomendación de tarjeta con mayor margen de días hasta el próximo cierre (`/credit-cards/recommendation`).
- **`BudgetsModule` (`/budgets`)**: Topes mensuales por categoría de gasto con comparación exacta en centavos (`ok`, `warning` >= 75%, `exceeded` > 100%).
- **`AnalyticsModule` (`/analytics`)**: Comparativa de gastos mes actual vs. mes anterior (`/analytics/monthly`) y proyección de flujo de caja a 3, 6 o 12 meses (`/analytics/forecast`) diferenciando recordatorios puntuales de recurrentes (`isRecurring`).
- **`RemindersModule` (`/reminders`) & `NotificationsModule`**: Gestión de recordatorios de vencimientos (puntuales o recurrentes) y tarea programada (`@Cron` en zona `America/Argentina/Buenos_Aires`) para envío idempotente de alertas por correo electrónico mediante la API HTTP de Resend (cuando `RESEND_API_KEY` está configurada).

## Comandos Útiles

```bash
# Instalar dependencias
npm install

# Aplicar migraciones y generar cliente Prisma
npx prisma migrate deploy
npx prisma generate

# Servidor de desarrollo (watch mode)
npm run start:dev

# Linter, validación de tipos, tests unitarios y E2E
npm run lint:check
npm run typecheck
npm test
npm run test:e2e
npm run build
```

## Documentación OpenAPI / Swagger

En entorno de desarrollo (o con `ENABLE_SWAGGER=true`), la documentación interactiva se encuentra disponible en:
- `http://localhost:3000/api/docs`
- Healthcheck de base de datos: `http://localhost:3000/health`
