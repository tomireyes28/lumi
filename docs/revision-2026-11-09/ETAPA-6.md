# Etapa 6 · Validación final y portfolio

## C21 — Dependencias y herramientas

Se actualizaron herramientas compatibles y Next/eslint-config-next al parche 16.4.6. Se conservan Nest 11, Jest 30, TypeScript 5 y ESLint 9. brace-expansion quedó en versiones corregidas; minimatch de herramientas modernas usa 11.0.1 con override acotado (las ramas 3.x conservan su API). glob de CLI/cobertura/Jest usa 14.0.2, con reglas explícitas para las dos rutas anidadas que npm conservaba. Ambos paquetes admiten los runtimes Node del proyecto. Los cambios de mayor transitiva se validan con lint, builds, tests y cobertura; no se aplica audit fix --force ni un downgrade del runner.

Auditoría al 09/11/2026: frontend cero avisos; API ocho avisos bajos propagados desde una sola causa, deepmerge 4.3.1 (GHSA-gcqx-w48m-w2h4). La última versión publicada de deepmerge sigue siendo 4.3.1. Se consume únicamente al combinar configuración local de Jest/fork-ts-checker/Nest CLI, no en la aplicación desplegada. No se aceptan configuraciones de build/test aportadas por usuarios de la aplicación. Mantener el aviso visible y reevaluar un parche upstream; los downgrades sugeridos por audit a Jest 25/CLI 7 no constituyen una solución compatible. Fuente: https://github.com/advisories/GHSA-gcqx-w48m-w2h4. npm audit --omit=dev indica cero vulnerabilidades en ambos proyectos.

Validación inicial tras actualizar: 85 unitarios en UTC y Buenos Aires, tres escenarios HTTP, doce pruebas de frontend/BFF, 38 recorridos de Chromium escritorio/móvil, tipos, lint y ambos builds. Cobertura también se ejecuta para ejercitar la cadena de glob de Jest; no se confunde ese porcentaje unitario con la cobertura de integración.

## C22 — Recorrido completo con infraestructura real

Un quinto job de CI levanta PostgreSQL 17 y ejecuta Chromium contra Next de producción, BFF firmado y Nest con Prisma/driver pg reales. No sustituye respuestas financieras por mocks. El setup exige TEST_DATABASE_URL explícito, loopback, nombre lumi_test_* y ausencia de opciones de conexión; crea una base nueva de nombre aleatorio, aplica todas las migraciones y la elimina al terminar, incluso si una prueba falla. No carga api/.env y desactiva explícitamente correo e identidades Google reales. Los puertos locales son exclusivos y el navegador bloquea destinos externos.

Se usan cuentas sintéticas distintas por resolución y 201 filas de fixture para ejercitar paginación sin eludir el rate limit de creación. El navegador hace login, crea categoría/tarjeta, configura un cierre especial, compra en tres cuotas, comprueba centavos y fechas de pago, crea presupuesto, paga una ocurrencia recurrente, verifica la siguiente y su forecast, recorre tres páginas y calendario, y cierra sesión. La cookie real se comprueba HttpOnly y no hay JWT en localStorage. Se usa localhost como origen canónico local de Next, manteniendo Origin/CSRF y Secure de producción sin excepciones para tests.

Pasaron ambos recorridos reales (escritorio y móvil), los 13 tests de frontend/BFF/guardas, tipos y lint. Se comprobó que no quedaron bases lumi_test_browser_* tras el teardown. Los escenarios PostgreSQL independientes siguen cubriendo restauración, dos versiones de motor, RLS, concurrencia, OAuth y correo simulado; el recorrido nuevo los complementa.

## C23 — Demo y documentación defendibles

Se reescribieron los README principal/API/web con rutas reales, Swagger efectivamente disponible, contrato de fechas/dinero/null, sesiones de siete días, recurrencia, métricas y límites operativos. docs/portfolio incluye un recorrido breve, decisiones con sus costes y una matriz F01–F25/R01–R10 que conserva el informe fechado. Los pendientes externos no se declaran cerrados: Resend, backups/PITR y políticas privadas de despliegue.

La demo solo acepta LUMI_DEMO=true y LUMI_DEMO_DATABASE_URL explícita a loopback y nombre lumi_demo; rechaza hosts remotos, opciones que alteren el host, despliegues alojados y otras cuentas. No usa api/.env como fallback. Un Compose independiente ofrece PostgreSQL en 127.0.0.1:55434; el servidor local usa secretos nuevos, API/BFF reales y correo/Google desactivados. El seed no forma parte del arranque normal y no modifica Supabase.

El seed de noviembre de 2026 crea 206 movimientos, cuotas mediante el motor real, un cierre especial, dos presupuestos y tres reglas/39 ocurrencias. El test de demo compara IDs, fechas, importes y conteos tras dos ejecuciones, rechaza conexiones no permitidas y elimina la base de prueba. Ese test se agrega al job integral de CI. Se tomaron cinco capturas reales de la demo sintética y se verificaron los vínculos locales de las guías. Los retoques visuales encontrados al inspeccionarlas se cierran en C24.
