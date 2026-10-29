# Lumi Web — Cliente Frontend (Next.js 16 + React 19)

Interfaz web de **Lumi**, diseñada con enfoque *mobile-first*, animaciones fluidas y arquitectura de componentes desacoplada de la lógica de estado.

## Características Técnicas

- **Next.js 16 (App Router) + React 19**: Rutas protegidas mediante Edge Middleware (`src/middleware.ts`) con verificación de estructura y expiración del JWT.
- **Arquitectura Basada en Custom Hooks**: Separación clara entre vistas declarativas (`src/components/`) y lógica de negocio/fetching (`src/hooks/useDashboardData.ts`, `useTransactions.ts`, `useCards.ts`, `useBudgets.ts`, `useForecast.ts`, `useCalendar.ts`).
- **Gestión de Sesión Sincronizada (`useAuthStore.ts`)**: Persistencia coordinada entre `localStorage` y cookies HTTP (`SameSite=Lax`) con limpieza automática ante respuestas `401 Unauthorized`.
- **Herramientas Financieras Interactivas**:
  - **Billetera y Ciclos de Tarjeta**: Carrusel de plásticos con barra de límite consumido y modal de ajuste de fecha exacta de cierre/vencimiento mensual.
  - **Proyección Financiera (`/dashboard/forecast`)**: Gráfico de flujo de caja comprometido y desglose de planes de cuotas activos.
  - **Presupuestos (`/dashboard/budgets`)**: Control de topes por categoría con alertas visuales al superar el 75% y 100%.
  - **Simulador de Reintegros (`RefundCalculator.tsx`)**: Cálculo en tiempo real del tope de compra óptimo para aprovechar promociones bancarias.

## Comandos Útiles

```bash
# Instalar dependencias
npm install

# Ejecutar entorno de desarrollo (puerto 3001 recomendado)
npm run dev -- -p 3001

# Ejecutar ESLint
npm run lint

# Generar build optimizado de producción
npm run build
```
