# Operación y evidencia de la etapa 1

Fecha: 09/11/2026. Base inspeccionada: `a882c803b75ebbac4e00de1e7b4185412802eca8`.

## Entorno comprobado

| Componente | Hecho observado |
|---|---|
| Web | https://lumi-beta-one.vercel.app, HTTP 200; Vercel Production asociado al SHA base |
| API | https://lumi-production-7a2a.up.railway.app/health, HTTP 200, base conectada; Railway production asociado al mismo SHA |
| CI de la base | API y Web aprobados en [ejecución 41920656052](https://github.com/tomireyes28/lumi/actions/runs/41920656052) |
| Rama | `main`, confirmada por el autor; los dos servicios están activos |
| Base | Supabase PostgreSQL 17.6, zona UTC; conexión Prisma como `postgres`, con BYPASSRLS |
| Arquitectura | El autor confirma acceso exclusivamente por Railway/Prisma; ningún cliente usa Supabase REST/Auth para estas tablas |
| Backups | El autor informa que probablemente no están habilitados y autoriza prescindir del backup de producción en esta etapa. No se verificaron plan, retención ni PITR |

Los estados de despliegue se comprobaron con la API pública de GitHub y los endpoints publicados. No equivalen a haber inspeccionado las opciones privadas de los proveedores.

Railway está, según el autor, con configuración por defecto. No están acreditados su comando efectivo de build/start/pre-deploy, healthcheck configurado ni la opción de esperar a GitHub CI. Vercel tampoco tiene acreditado un bloqueo por CI. Tratar cada push a `main` como publicación inmediata e independiente en ambos servicios. Completar los checks localmente antes del push y comprobar los SHA después.

## Identificar qué versión responde

Desde `api/`, ejecutar `npm run release:status -- <SHA completo>`. Consulta checks, estados de proveedores y despliegues en GitHub, y contrasta el frontend publicado y la API enlazada en sus bundles. No requiere tokens de los proveedores. Es una herramienta de diagnóstico: revisar los estados; una consulta HTTP exitosa no implica aprobación del release.

Esta entrega agrega `GET /version` y `revision` en `/health`, obtenidos de `RAILWAY_GIT_COMMIT_SHA` (alternativa explícita `SOURCE_REVISION`). Next publica `X-Lumi-Revision` a partir de `VERCEL_GIT_COMMIT_SHA` (alternativa `SOURCE_REVISION`). Solo se publican SHA válidos de 40 caracteres. `unknown` o cabecera ausente significa que no se pudo acreditar la revisión; no inventar una versión a partir de package.json.

## Preflight de la base activa

Desde `api/`: `npm run db:preflight`. Usa `DIRECT_URL` o `DATABASE_URL` del proceso y, como alternativa, de `.env`. Ejecuta una transacción `REPEATABLE READ READ ONLY`, con timeout de consulta y bloqueo. Informa metadatos y conteos agregados, nunca filas de usuarios ni cadenas de conexión. No versionar `.env`, dumps ni respuestas que contengan datos personales.

Después de migrar: `npm run db:preflight -- --verify`. Debe terminar con código 0: sin migraciones pendientes/modificadas, problemas de datos comprobados, permisos públicos efectivos ni grants públicos por defecto del rol de migración. Los movimientos de tarjeta sin referencia se informan aparte: pueden ser válidos después de eliminar una tarjeta.

En la inspección inicial:

- Las siete migraciones existentes están aplicadas. Las dos de noviembre también.
- La migración de mayo conserva en Supabase el checksum original `9c1e7fa14e4908c0790b9999b9548f38235af4161321f9e9600b44260585e60d`. El archivo local había recibido un backfill posteriormente; se restaura el original, sin editar la tabla de historial.
- Octubre tiene un intento histórico revertido y un intento exitoso cuyo checksum coincide. Los intentos revertidos se conservan como evidencia y no se confunden con una migración activa divergente. Se aceptan las variantes LF/CRLF de un mismo SQL al comparar checksums.
- Los conteos de nombres ausentes, importes no positivos, overflow/redondeo monetario y referencias ausentes/ajenas fueron cero. Reminder ya es DECIMAL(10,2), la categoría usa RESTRICT y la tarjeta SET NULL.
- Se detectaron permisos SELECT/INSERT/UPDATE/DELETE para `anon` y `authenticated`, sin RLS, sobre las siete tablas de dominio y `_prisma_migrations`. No se extrajeron filas por REST. El cierre se prepara en una migración nueva y un commit separado.

## Comandos de publicación reproducibles

Configuración esperada para Railway, raíz `api/`:

1. Instalación: `npm ci`.
2. Build: `npx prisma generate && npm run build`.
3. Pre-deploy: `npx prisma migrate deploy` con conexión de migración privada y adecuada para DDL.
4. Start: `npm run start:prod` (ejecuta `node dist/src/main`).
5. Healthcheck: `/health`. Verificar `PORT`, `NODE_ENV=production`, `FRONTEND_URL` y las variables de autenticación sin copiarlas al informe.

Estos son comandos de operación del proyecto, no una certificación de los valores actuales del panel. No agregar migraciones al arranque de cada réplica. Si Railway no tiene pre-deploy, ejecutar la migración una sola vez desde un entorno autorizado antes de publicar el código dependiente. Esta etapa no requiere columnas nuevas para arrancar: agrega metadatos de versión y cierra acceso directo a tablas existentes.

Para Vercel, raíz `web/`: instalación `npm ci`, build `npm run build`, `NEXT_PUBLIC_API_URL` apuntando a la API publicada. No cambiar dominios/callbacks OAuth como parte de esta etapa.

## Validación y recuperación

La suite `npm run test:integration` exige `TEST_DATABASE_URL` explícita, host loopback y nombre `lumi_test_*`. Crea y elimina únicamente bases sintéticas generadas por la propia suite; nunca usa `.env` ni la base de producción. `TEST_POSTGRES_CONTAINER` identifica el contenedor descartable para usar su versión correspondiente de pg_dump/pg_restore.

Ejemplo local en PowerShell, desde la raíz:

```powershell
docker run --rm --name lumi-stage1-postgres16 -e POSTGRES_USER=lumi_test -e POSTGRES_PASSWORD=lumi_test_local_only -e POSTGRES_DB=lumi_test_admin -p 127.0.0.1:55432:5432 -d postgres:16-alpine
cd api
$env:TEST_DATABASE_URL='postgresql://lumi_test:lumi_test_local_only@127.0.0.1:55432/lumi_test_admin'
$env:TEST_POSTGRES_CONTAINER='lumi-stage1-postgres16'
npm run test:integration
docker stop lumi-stage1-postgres16
```

El ensayo comprueba instalación limpia, upgrade desde las cinco migraciones anteriores con datos representativos y un dump/restore en otra base aislada. Conserva importes, datos sintéticos, historial y trigger, y permite repetir migrate deploy después de restaurar. CI ejecuta la suite en PostgreSQL 16 y 17. Las pruebas HTTP con Prisma simulado siguen siendo útiles, pero no acreditan estas garantías de base real.

El ensayo sintético no acredita un backup de Supabase ni recupera datos reales. No se requiere un backup de producción para esta etapa por decisión expresa del autor. Para uso con datos que deban conservarse, habilitar/confirmar backup y retención, custodiar el dump fuera de Git y ensayar su restauración en un proyecto separado antes de considerarlo recuperable.

Ante fallo de código, revertir el commit específico y publicar nuevamente, conservando el esquema compatible. Ante fallo de migración, inspeccionar el error y el estado real; no usar reset, db push destructivo, borrar `_prisma_migrations` ni marcar una migración como aplicada a ciegas. Un rollback de frontend/API no debe reabrir grants públicos. El cierre de permisos es transaccional y limita cuánto espera por locks; no modifica filas ni importes.

Referencias: [RLS y bypass del propietario](https://www.postgresql.org/docs/17/ddl-rowsecurity.html), [privilegios por defecto y alcance global/esquema](https://www.postgresql.org/docs/16/sql-alterdefaultprivileges.html).
