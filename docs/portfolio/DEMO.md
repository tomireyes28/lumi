# Demo local reproducible

La demo usa una base separada llamada `lumi_demo`, ligada a loopback. No crea una cuenta de prueba en el despliegue público ni usa datos de Supabase. Google y correo están desactivados explícitamente. Se necesita Node 22 y Docker; los builds de API/web deben estar preparados.

## Preparación

Desde la raíz:

```sh
docker compose -f docker-compose.demo.yml up -d --wait
npm ci --prefix api
npm ci --prefix web
cd api
npx prisma generate
npm run build
cd ../web
npm run build
cd ../api
```

PowerShell:

```powershell
$env:LUMI_DEMO = 'true'
$env:LUMI_DEMO_DATABASE_URL = 'postgresql://lumi_demo:lumi_demo_local_only@127.0.0.1:55434/lumi_demo'
npm run demo:seed
npm run demo:start
```

Bash:

```sh
export LUMI_DEMO=true
export LUMI_DEMO_DATABASE_URL='postgresql://lumi_demo:lumi_demo_local_only@127.0.0.1:55434/lumi_demo'
npm run demo:seed
npm run demo:start
```

Abrir **http://localhost:3201**, con `portfolio@lumi.example.invalid` y contraseña `Lumi-Demo-Local-2026!`. Son credenciales públicas exclusivamente para esta demo local; no corresponden a la aplicación de producción. API local: `http://127.0.0.1:3200`; Swagger: `/api/docs`.

El seed aplica migraciones solo después de comprobar la activación explícita, host local, nombre exacto y ausencia de opciones que puedan sustituir el host. Rechaza ejecución alojada o una base con otras cuentas. No lee `.env` como fallback. La API de demo ignora api/.env, los secretos de sesión/proxy se generan por ejecución y la sesión de demo requiere reingreso después de reiniciar esos secretos. No se exponen endpoints de seed ni se añade un modo demo a producción.

El período por defecto es el mes actual de Buenos Aires. Para repetir exactamente las capturas de noviembre de 2026 se puede indicar `LUMI_DEMO_MONTH=2026-11`; para explorar otro mes desde el dashboard conviene volver al valor actual. Los IDs estables permiten repetir el seed sin duplicar categorías, movimientos, cuotas u ocurrencias. Actualiza sus filas conocidas y no borra registros adicionales que se hayan creado al explorar la demo.

## Recorrido de tres minutos

1. **Resumen:** ingresos de trabajo, saldo disponible del mes y accesos a compromisos. Es una estimación según movimientos, sin conexión bancaria.
2. **Billetera:** Visa con tres cuotas de una notebook. Abrir el cierre personalizado del mes siguiente y observar que tiene su propia fecha de pago.
3. **Proyección:** seguir las cuotas por vencimiento; el alquiler pagado del mes conserva las próximas ocurrencias pendientes. Cambiar 3/6/12 meses mantiene la base de ingresos.
4. **Presupuestos:** compras cotidianas cerca de su límite y tecnología en el límite. El color sale de centavos, no del porcentaje redondeado.
5. **Movimientos/calendario:** más de 200 filas sintéticas; recorrer las páginas y comparar días del mismo mes.
6. **Accesibilidad:** editar una categoría, navegar con Tab/Shift+Tab y cerrar con Escape. El foco vuelve al disparador y el fondo queda inerte.

Los datos incluyen 206 movimientos (201 compras pequeñas, dos ingresos y tres cuotas), tres reglas mensuales y sus vencimientos. Es un fixture de demostración y volumen, no una historia financiera real.

## Capturas

Capturadas el 10/11/2026 de la aplicación con esta base local, sin información personal ni sesiones de producción:

| Vista | Archivo |
| --- | --- |
| Resumen móvil | [dashboard-mobile.png](screenshots/dashboard-mobile.png) |
| Resumen escritorio | [dashboard-desktop.png](screenshots/dashboard-desktop.png) |
| Billetera | [cards-mobile.png](screenshots/cards-mobile.png) |
| Proyección | [forecast-mobile.png](screenshots/forecast-mobile.png) |
| Presupuestos | [budgets-mobile.png](screenshots/budgets-mobile.png) |
| Tarjeta social 1200×630 | [social-card.png](screenshots/social-card.png) |

Para cerrar, Ctrl+C en la terminal de demo y `docker compose -f docker-compose.demo.yml down` desde la raíz. La base de demo del contenedor es desechable; la configuración no monta el volumen de desarrollo ni el de producción.
