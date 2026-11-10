# Lumi API

NestJS 11, Prisma 7 con adaptador pg y PostgreSQL 16/17. Ver [README principal](../README.md) para arquitectura, semántica financiera y despliegue.

| Módulo | Responsabilidad |
| --- | --- |
| Auth | Login/registro, Google PKCE, `POST /auth/exchange`, sesiones y revocación persistentes |
| Transactions | Ingresos/gastos, cuotas en centavos, fechas explícitas, PATCH y paginación |
| CreditCards | Cierres habituales/personales por período y recomendación por margen al cierre |
| Budgets | Plantillas mensuales por categoría y umbrales exactos en centavos |
| Analytics | Comparativa mensual y proyección con ingresos acotados y ratio anulable |
| Reminders | Regla mensual y ocurrencias independientes, pagos e histórico |
| Notifications | Outbox privado, reservas, timeout y reintentos; aceptación no equivale a entrega |
| Security | Firma del proxy y límites de peticiones compartidos en PostgreSQL |

```sh
npm ci
npx prisma generate
npx prisma migrate deploy
npm run start:dev
```

Configurar la conexión y secretos mediante `.env.example`. No usar la conexión de producción para tests o demos. El arranque normal no ejecuta seeds ni migraciones automáticas.

```sh
npm run lint:check
npm run typecheck
npm run test:dates
npm run test:e2e
npm run build
npm run test:integration  # TEST_DATABASE_URL y TEST_POSTGRES_CONTAINER explícitos
npm run test:demo         # servicio PostgreSQL aislado sin base lumi_demo preexistente
```

`main.ts` registra Swagger en `/api/docs` en todos los entornos actuales; `ENABLE_SWAGGER` no controla su disponibilidad. `/health` comprueba la base y `/version` informa revisión del servidor. La fuente de respuestas validadas es `../contracts/http.ts`, sincronizada a `src/contracts/http.ts`; la documentación Swagger de respuestas aún no se genera desde esa fuente.

`db:preflight -- --verify` inspecciona historial, checksums, permisos y datos agregados sin modificar filas. `release:status -- <sha>` consulta CI y los SHA servidos. Los comandos `demo:seed` y `demo:start` tienen guardas locales y no forman parte del arranque de Railway. [Demo reproducible](../docs/portfolio/DEMO.md).
