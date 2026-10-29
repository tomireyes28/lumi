# Lumi API — Backend Financiero (NestJS 11 + Prisma 7)

API RESTful de **Lumi**, construida con **NestJS 11**, **Prisma 7** (`@prisma/adapter-pg`) y **PostgreSQL 16**.

## Módulos Principales

- **`AuthModule` (`/auth`)**: Registro e inicio de sesión local (`bcrypt`), OAuth 2.0 con Google y canje seguro mediante códigos efímeros de un solo uso (`POST /auth/exchange`), protegido con rate limiting estricto (`@Throttle`).
- **`TransactionsModule` (`/transactions`)**: Registro de ingresos y gastos, paginación filtrada, resumen mensual de liquidez y creación atómica de planes de cuotas con distribución exacta de centavos (`installment-calculator.util.ts`).
- **`CreditCardsModule` (`/credit-cards`)**: Administración de tarjetas de crédito, cálculo de consumo del ciclo vigente, configuración de cierres mensuales personalizados (`CardCycle`) y motor de recomendación de tarjeta según días restantes hasta el cierre (`/credit-cards/recommendation`).
- **`BudgetsModule` (`/budgets`)**: Presupuestos mensuales por categoría con cálculo de porcentaje ejecutado y clasificación automática de estado (`ok`, `warning` >= 75%, `exceeded` >= 100%).
- **`AnalyticsModule` (`/analytics`)**: Comparativa de gastos mes actual vs. mes anterior (`/analytics/monthly`) y proyección de flujo de caja a 3, 6 o 12 meses (`/analytics/forecast`).
- **`RemindersModule` (`/reminders`) & `NotificationsModule`**: Gestión de recordatorios de vencimientos y tarea programada (`@Cron`) para envío de alertas por correo electrónico mediante Resend.

## Comandos Útiles

```bash
# Instalar dependencias
npm install

# Aplicar migraciones y generar cliente Prisma
npx prisma migrate deploy
npx prisma generate

# Servidor de desarrollo (watch mode)
npm run start:dev

# Ejecutar suite de tests unitarios (Jest)
npm test

# Linter y validación de tipos
npm run lint
npm run build
```

## Documentación OpenAPI / Swagger

Con el servidor en ejecución, la documentación interactiva se encuentra disponible en:
- `http://localhost:3000/api/docs`
- Healthcheck de base de datos: `http://localhost:3000/health`
