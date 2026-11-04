# Lumi Web — Cliente Frontend (Next.js 16 + React 19)

Interfaz web de **Lumi**, diseñada con enfoque *mobile-first* (contenedor centrado `max-w-md` pensado para experiencia móvil y uso ágil en escritorio), animaciones fluidas con soporte para `prefers-reduced-motion` y componentes desacoplados de la lógica de estado.

## Características Técnicas

- **Next.js 16 (App Router) + React 19**: Guardia de navegación en Edge Middleware (`src/middleware.ts`) combinada con verificación criptográfica de sesión en la API.
- **Arquitectura Basada en Custom Hooks**: Separación entre vistas declarativas (`src/components/`) y coordinación de datos/formularios (`src/hooks/useDashboard.ts`, `useTransactions.ts`, `useCards.ts`, `useBudgets.ts`, `useForecast.ts`, `useCalendar.ts`, `useReminders.ts`, `useAnalytics.ts`) con control de desmontaje y estados diferenciados de carga, vacío y error con reintento.
- **Gestión de Sesión Sincronizada (`useAuthStore.ts`)**: Sincronización entre pestañas (`storage` event), revocación en backend al cerrar sesión (`/auth/logout`) y limpieza automática ante respuestas `401 Unauthorized`.
- **Herramientas Financieras Interactivas**:
  - **Billetera y Ciclos de Tarjeta (`CardCarousel.tsx`)**: Carrusel de plásticos con barra de límite consumido y modal de ajuste de fecha exacta de cierre/vencimiento mensual.
  - **Proyección Financiera (`/dashboard/forecast`)**: Gráfico de flujo de caja comprometido y desglose de planes de cuotas activos.
  - **Presupuestos (`/dashboard/budgets`)**: Control de topes por categoría con alertas visuales al alcanzar el 75% y al superar el 100%.
  - **Simulador de Reintegros (`RefundCalculator.tsx`)**: Cálculo en tiempo real del tope de compra óptimo para aprovechar promociones bancarias (`0%` a `100%`).

## Comandos Útiles

```bash
# Instalar dependencias
npm install

# Ejecutar entorno de desarrollo (puerto 3001 recomendado)
npm run dev -- -p 3001

# Ejecutar ESLint y Typecheck
npm run lint
npm run typecheck

# Generar build optimizado de producción
npm run build
```
