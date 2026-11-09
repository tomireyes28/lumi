# Etapa 2: autenticación persistente

## C03 · Sesiones

Los JWT nuevos identifican una fila AuthSession privada. La API exige una sesión vigente del mismo usuario y consulta su revocación en PostgreSQL en cada petición. Logout espera la escritura antes de responder. Los tokens heredados sin fila de sesión requieren reingreso una vez. El esquema es aditivo y no modifica datos financieros.

Validado con tipos, lint, 73 unitarios, tres pruebas HTTP y seis escenarios de PostgreSQL real. La regresión crea una sesión, reconstruye AuthService, revoca desde otra instancia y comprueba rechazo desde ambas. La migración habilita RLS sin políticas públicas y conserva el acceso del propietario.

La etapa se publica completa al finalizar C03–C07; los commits intermedios no disparan despliegue.

## C07 · Límites compartidos y proxy autenticado

PostgreSQL sostiene ventanas fijas y bloqueos con un UPSERT atómico. Login, registro y canje comparten diez intentos por IP/minuto; el resto conserva cien peticiones por ruta/IP/minuto. El bloqueo no se prolonga indefinidamente con nuevos intentos. Los contadores vencidos se limpian cada minuto. Un fallo del almacenamiento devuelve 503 y no habilita acceso sin límites.

Next firma IP, fecha, método, ruta/query y hash del cuerpo mediante HMAC-SHA256 y `LUMI_PROXY_SECRET`. Railway valida firma y una ventana temporal de sesenta segundos. El secreto nunca se expone como NEXT_PUBLIC ni se envía al navegador. El autor confirmó el 09/11 que configuró el mismo valor en ambos proveedores y redeployó. La API exige su presencia en producción.

En Vercel se toma la IP de la cabecera que sobrescribe su ingreso HTTP; las cabeceras personalizadas del cliente no se reenvían. En llamadas directas a Railway se usa X-Real-IP provista por su ingreso HTTP público; en listeners locales se usa el peer del socket. No se usa un número supuesto de saltos de X-Forwarded-For. Esto asume el servicio HTTP público actual y que los servicios privados del mismo proyecto son confiables: no agregar un TCP proxy ni clientes privados no confiables sin revisar esa frontera.

La regresión real reparte veinte intentos concurrentes entre dos instancias: solo diez pasan. También prueba bloqueo tras reconstrucción, vencimiento, limpieza, fallo de almacenamiento y una API Nest completa con firma sobre el cuerpo original, login, perfil, logout y cabeceras falsificadas. Las pruebas HTTP rápidas con storage/Prisma simulados se conservan aparte.

Referencias: [cabeceras de Vercel](https://vercel.com/docs/headers/request-headers), [ingreso HTTP de Railway](https://docs.railway.com/networking/public-networking/specs-and-limits), [PKCE y protección OAuth](https://www.rfc-editor.org/rfc/rfc9700.html).

## Publicación y comprobación

Aplicar las cuatro migraciones aditivas antes de publicar el código de la etapa. No borrar sesiones ni quitar RLS para revertir un fallo. No volver a aceptar JWT heredados/revocados. Si falla una promoción, conservar el esquema y corregir hacia adelante. Los accesos anteriores requieren un reingreso; un flujo OAuth iniciado durante el reemplazo de instancias puede requerir reiniciarse.

Antes del push: builds y checks de ambos proyectos; regresiones reales en PostgreSQL 16 y 17.6; preflight de producción sin divergencias. Tras el push: comprobar los cuatro jobs, SHA de ambos proveedores, health y las rutas del BFF. Login/registro retornan perfil sin JWT; la cookie de Vercel debe ser HttpOnly/Secure. Logout debe invalidar también una copia anterior del Bearer. Google mantiene su callback de Railway, sin cambiar dominios autorizados en Google Cloud.

## C04 · Vinculación Google

Se exige subject y email positivamente verificado. La vinculación y revocación son una transacción serializable con reintento de conflictos. Una versión de autenticación permite rechazar también una sesión local emitida durante la vinculación usando credenciales anteriores. La nueva sesión del propietario continúa válida. La regresión real cubre ambas sesiones, subject diferente y verificación ausente.

## C05 · OAuth compartido

Códigos y nonces aleatorios se guardan por hash en OAuthGrant, con TTL y consumo DELETE RETURNING atómico. PKCE queda en PostgreSQL privado; la URL lleva un identificador opaco. La cookie HttpOnly de Railway mantiene la vinculación del navegador. La regresión real prueba canje entre instancias, dos consumos concurrentes con un ganador, replay, estado ajeno y expiración. Un job horario elimina únicamente sesiones y grants vencidos.

## C06 · Sesión HttpOnly del mismo origen

Next actúa como frontera de sesión. El navegador recibe únicamente perfil público y cookie HttpOnly, Secure en producción y SameSite=Lax. Next envía Bearer a Railway; la API deja de aceptar cookies como credencial. Login, registro, canje Google, perfil y negocio usan la nueva frontera. Se elimina el almacenamiento legado y se sincroniza el perfil entre pestañas sin transmitir JWT. Logout espera revocación confirmada; un fallo permite reintentar. Las mutaciones exigen Origin del mismo origen y no se reenvían cabeceras/cookies arbitrarias del cliente. Tres regresiones HTTP de Next prueban cookie, reload, expiración, logout y CSRF; API y web pasan tipos, lint y build.

## Evidencia previa al push

El 09/11 se aplicaron las cuatro migraciones mediante Prisma migrate deploy. Preflight posterior: cero pendientes, cero divergencias activas, cero permisos CRUD públicos en 22 combinaciones tabla/rol. Conteos de tablas de dominio y totales financieros sin cambios. No se eliminaron datos existentes.

Controles locales finales aprobados: 76 unitarios, tres pruebas HTTP rápidas, tres pruebas de frontera de sesión Next y nueve escenarios reales de PostgreSQL por versión (16 y 17.6), incluidos instalación, upgrade, restauración, OAuth concurrente, sesiones y API HTTP real. Tipos, lint y ambos builds pasan. El aviso existente de middleware de Next permanece previsto para etapa 6.
