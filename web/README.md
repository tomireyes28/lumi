# Lumi Web

Next.js 16 App Router, React 19, TypeScript estricto, Tailwind 4, Zustand, Framer Motion y Recharts. La interfaz usa un contenedor mobile-first centrado en escritorio.

- El navegador llama al BFF del mismo origen. La cookie de sesión es HttpOnly/Secure en producción y la API verifica la sesión persistida. `proxy` comprueba navegación, no autoriza datos.
- El estado público de sesión se sincroniza mediante BroadcastChannel y al recuperar foco, sin transmitir JWT.
- `useResource` separa período, carga, datos y error; descarta respuestas tardías. Guardar y recargar se informan como resultados distintos.
- Los tipos de lectura y validadores vienen de `../contracts/http.ts`; CI comprueba su copia local. El historial conserva meta y el calendario reúne todas las páginas.
- El modal nativo aísla el fondo, protege foco y aparece por encima de la navegación fija. Movimiento reducido se respeta también en los controles animados.

```sh
npm ci
# Configurar .env.local desde .env.example y compartir LUMI_PROXY_SECRET con la API.
npm run dev
```

Usar `http://localhost:3001` como origen local canónico. Configurar API_URL/NEXT_PUBLIC_API_URL para la API local. No poner secretos en variables NEXT_PUBLIC_.

```sh
npm run lint
npm run typecheck
npm run test:unit
npm run build
npx playwright install chromium
npm run test:ui
# Con API compilada y TEST_DATABASE_URL apuntando a PostgreSQL aislado:
npm run test:full-stack
```

`test:ui` usa respuestas sintéticas y un upstream cerrado. `test:full-stack` usa Next/BFF/Nest y Prisma reales, con una base creada/migrada/eliminada por su setup. Son pruebas complementarias; ninguna envía correos reales. [Demo local y capturas](../docs/portfolio/DEMO.md).
