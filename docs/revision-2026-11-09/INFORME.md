# Segunda revisión de Lumi

**Fecha:** 9 de noviembre de 2026, Argentina.  
**Commit revisado:** `a882c803b75ebbac4e00de1e7b4185412802eca8`.  
**Comparación:** auditoría del 30/10/2026, base `68a216a`.  
**Despliegue informado por el autor:** frontend en Vercel, API en Railway y PostgreSQL en Supabase; rama activa `main`.

## Dictamen

Hay un avance sustancial y comprobable. Pasan los builds, tipos, linters, 71 tests unitarios y 3 pruebas HTTP. Las dependencias de producción de ambos proyectos tienen cero alertas en la consulta npm realizada para esta revisión.

**De los 25 hallazgos originales: 7 se pueden cerrar en el código local, 17 están parcialmente corregidos y 1 continúa pendiente.** Un hallazgo parcial puede incluir varias mejoras correctas: la clasificación conserva el alcance completo del problema original. No significa que todo su trabajo de corrección esté pendiente.

Todavía hay problemas de seguridad de sesión y de cálculo financiero reproducibles. El proyecto está más cerca de una presentación profesional, pero la afirmación de que todos los hallazgos están resueltos no queda respaldada por esta revisión.

Este informe evalúa el código y los diagnósticos locales. No certifica que Vercel/Railway estén ejecutando este SHA ni que Supabase haya aplicado estas migraciones. No se hicieron cambios funcionales, commits, pushes, consultas a la base real ni envíos de correo.

## Verificaciones realizadas

| Verificación | Resultado actual | Comparación con 30/10 |
|---|---|---|
| API: lint sin autofix | Pasa | Se conserva |
| API: typecheck completo | Pasa | Antes fallaba en un spec |
| API: build | Pasa | Se conserva |
| API: unitarios | 71 tests / 11 suites, todos pasan | Antes 39 / 8 |
| API: cobertura de líneas unitaria | 48,73% | Antes 38% |
| API: ramas / sentencias / funciones | 43,48% / 47,09% / 36,71% | Mejora; quedan fronteras sin cubrir |
| API: pruebas HTTP | 3/3 pasan | Expectativa obsoleta y teardown corregidos |
| Web: lint, typecheck y build | Pasan | Typecheck explícito incorporado a CI |
| Prisma generate sin `.env`, solo `DATABASE_URL` de prueba | Pasa | Bloqueante original resuelto |
| SQL desde cero | 7 migraciones ejecutadas en PGlite | Antes se probaron 5 |
| Diagnósticos adversos adicionales | Detectan fallos todavía presentes | Ver `resultados.json` |
| npm audit producción | API 0, web 0 | Antes API 16, web 6 paquetes reportados |
| npm audit completo | API 29: 5 bajas, 23 moderadas, 1 alta; web 8 moderadas | Restan herramientas de desarrollo |

La primera ejecución HTTP falló por `EACCES` al abrir conexiones locales desde el sandbox. Repetida con permiso de red local, pasó. No se atribuye ese primer fallo al proyecto.

Las pruebas llamadas e2e en el repositorio usan Prisma simulado con Maps. Ejercitan Nest, validación, rutas, JWT y varias reglas de negocio; no verifican restricciones reales, aislamiento transaccional ni migraciones de PostgreSQL. La cobertura de la tabla corresponde a unitarios, sin combinar las pruebas HTTP.

El SQL se probó en PostgreSQL WASM/PGlite, no contra Supabase ni una instancia PostgreSQL 16 con el driver Prisma. No se recorrió la interfaz completa en un navegador. Las observaciones de accesibilidad se basan en el código. Tampoco se verificaron entrega real de Resend, configuración de proxies, número de réplicas, políticas RLS/grants de Supabase ni configuración de despliegue automático.

## Estado de los 25 hallazgos

“Completo” significa cerrado para el caso original en la implementación auditada, con la evidencia indicada; la comprobación del despliegue se trata aparte. Se mantienen los identificadores F01–F25 del primer informe.

| ID | Estado | Corrección comprobada | Qué falta o cómo se cierra |
|---|---|---|---|
| F01 Dependencias runtime | **Completo** | Next 16.4.5, Prisma 7.10.1 y árbol runtime sin alertas npm | Higiene de dependencias de desarrollo se registra aparte; verificar SHA desplegado |
| F02 Login CSRF OAuth | **Completo** | Cookie ligada al nonce, firma, `state` de sessionStorage, rechazo de cookie ausente/replay y eliminación de callback legado | Mantener prueba real de navegador en el cierre; almacenamiento y PKCE se revisan en F22 |
| F03 Vinculación por email | **Parcial** | Se agrega `googleId`, se elimina contraseña local no verificada | El JWT emitido antes de vincular sigue válido; revocar sesiones anteriores y exigir verificación positiva del proveedor |
| F04 Cuotas negativas | **Completo** | Cálculo en centavos sin negativos; API rechaza más cuotas que centavos | El helper tolera ceros internamente, pero el servicio y DTO impiden persistir ese caso; conservar invariantes |
| F05 Compra/resumen/pago | **Parcial** | Desplaza compras posteriores al cierre y carga ciclos personalizados | Falla con cierres de meses posteriores; no separa fecha de compra, resumen y vencimiento |
| F06 Borrado de tarjeta/histórico | **Completo** | Impide borrado con movimientos y persiste `paymentMethod` con backfill/trigger | SQL confirma clasificación preservada incluso en `SET NULL`; datos ya huérfanos previos requieren diagnóstico, no inferencias |
| F07 CI/Prisma | **Completo** | Fallback a `DATABASE_URL`, variables de CI, lint sin autofix, typecheck y HTTP tests | Falta acreditar la ejecución remota y agregar integración de base real en F16 |
| F08 Validación | **Parcial** | Rechaza las fechas, null, decimales, importes y ciclos inválidos originales; elimina cuotas ignoradas en PATCH | PATCH valida campos nuevos sin validar siempre el estado final; permite tarjeta sobre un ingreso existente |
| F09 Zona horaria | **Parcial** | Separa fecha visible de límite de cierre; cron declara Buenos Aires | Mismo instante asigna meses distintos en UTC/UTC−3; rango SQL del cron sigue usando zona del host |
| F10 Cambio de tipo de categoría | **Completo** | Bloquea cambio si hay transacciones o presupuestos | Carrera concurrente se conserva en F21, sin duplicarla como fallo secuencial |
| F11 Recurrencia | **Parcial** | Campo y UI `isRecurring`, puntuales separados | Pagado en un mes anterior deja de proyectarse; no se generan vencimientos mensuales siguientes |
| F12 Métricas | **Parcial** | UI dice transcurrido, no amortizado; corrige saludable sin ingresos y criterio de recomendación | El fallback mezcla ingresos futuros, ratio ficticio 100% sin denominador y campos `paidInstallments` aún ambiguos |
| F13 Límite bcrypt | **Completo** | DTO y servicio comprueban 72 bytes UTF-8 | Test multibyte rechaza la colisión aceptada antes |
| F14 Sesión | **Parcial** | Cookie HttpOnly adicional, logout con revocación y sincronización entre pestañas | Mismo JWT sigue en localStorage/cookie JS; revocación desaparece al reiniciar; logout no espera confirmación |
| F15 Tipos/contratos | **Parcial** | `apiFetch<T>` devuelve unknown por defecto; tipos de entradas y null mejoran | Se hace `as T` sin validar respuesta, auth aún lee JSON sin contrato; `noImplicitAny` sigue false |
| F16 Pruebas | **Parcial** | Más escenarios, HTTP completo y typecheck CI | Sin integración Prisma/PostgreSQL real, sin tests de navegador, sin regresiones de los casos de esta revisión |
| F17 Errores de frontend | **Parcial** | Dashboard/analytics/forecast/presupuestos tienen estados de error y reintento | Calendario no consume su error; tarjetas/categorías/recordatorios conservan vacíos y recargas con errores absorbidos |
| F18 Paginación/volumen | **Parcial** | Consumidores piden páginas y calendario filtra mes; billetera usa una consulta | Solo cargan página 1; se ocultan movimientos >100; API mantiene modo ilimitado y forecast carga todo el histórico |
| F19 Presupuestos | **Parcial** | Categoría usa comparación exacta en centavos | Tarjeta general sigue comparando porcentaje redondeado; UI debe explicar la plantilla común a todos los meses |
| F20 Email | **Parcial** | Integración HTTP Resend real, idempotency key y masking de email | Ventana horaria incorrecta en UTC, sin timeout/reintentos persistentes ni ocurrencias recurrentes; entrega externa no comprobada |
| F21 Integridad concurrente | **Parcial** | FK Restrict impide pérdida por borrado de categorías; traduce unique conflict de registro | Cambiar tipo/crear movimiento sigue siendo check-then-write separado; no hay integración concurrente ni invariantes tenant en la base |
| F22 Estado entre instancias | **Pendiente** | Se acota el tamaño de Maps | Canjes, nonces consumidos, revocaciones y rate limiting siguen locales al proceso; reiniciar Railway cambia la garantía |
| F23 Accesibilidad | **Parcial** | Modal atrapa/restaura foco; varios formularios tienen labels y estados accesibles | Auth y presupuesto sin asociación completa; fondo no aislado; falta QA de teclado/lector y movimiento de Framer |
| F24 Documentación | **Parcial** | Describe mejor centavos, middleware UX, hash y Resend | Ruta de canje equivocada, Swagger condicional que no existe y afirmaciones de revocación/recurrencia incompletas |
| F25 Presentación/convenios | **Parcial** | Renombra carrusel, define safe area/scrollbar, limita calculadora, corrige URL social | Falta demo/seed, capturas, cierre visual, comentarios de trabajo y migrar convención deprecated de middleware |

Completos: **F01, F02, F04, F06, F07, F10, F13**. Los puntos cerrados no necesitan otra reescritura; necesitan conservar sus pruebas y comprobar su despliegue.

## Fallos reproducidos que deben guiar la siguiente corrección

### R01 · P1 · Sesión anterior válida después de vincular Google

Referencias: `api/src/auth/auth.service.ts:97`, `api/src/auth/strategies/jwt.strategy.ts:49`.

Se creó una cuenta local sintética, se obtuvo un JWT real firmado y después se vinculó Google. El password quedó nulo, como corresponde. El JWT anterior siguió siendo aceptado por `JwtStrategy.validate` porque solo comprueba existencia de usuario y blacklist, sin versión de credenciales ni invalidación de las sesiones emitidas antes de vincular.

Un registrante inicial de email ajeno puede conservar acceso hasta expirar su token aunque ya no pueda iniciar sesión nuevamente con la contraseña anterior. El problema original de apropiación previa queda parcialmente mitigado.

**Aceptación:** el token de esa prueba pasa a recibir 401 inmediatamente; el token nuevo del dueño continúa funcionando. Comprobarlo con persistencia y desde dos instancias, no con una lista local.

### R02 · P1 · Revocaciones que desaparecen al reiniciar

Referencias: `api/src/auth/auth.service.ts:23`, `:50`, `web/src/store/useAuthStore.ts:89`.

El mismo `jti` da revocado en un AuthService y no revocado al construir otra instancia. La blacklist es un Map y también elimina entradas no expiradas al alcanzar 5.000 elementos. Cada redeploy o reinicio de Railway pierde esa protección.

La cookie HttpOnly agregada no retira el JWT de localStorage ni de `lumi_token`, que sigue siendo accesible por JavaScript. El navegador continúa enviando el Bearer leído de localStorage. Es una mejora adicional de transporte, no el cierre de la exposición identificada.

Como frontend y API están en Vercel/Railway, no se debe retirar Bearer de golpe y asumir que la cookie `SameSite=Lax` del host de la API funcionará como sesión del sitio. Si sus dominios son sitios distintos, el navegador aplica restricciones cross-site. La propuesta del plan es una cookie de sesión del mismo origen mediante Next/BFF.

**Aceptación:** logout persiste tras reiniciar y entre réplicas; no queda JWT legible por JS; el flujo funciona con los dominios reales, varias pestañas y expiración.

### R03 · P1 · Cuotas de un mismo plan caen en un resumen equivocado

Referencias: `api/src/transactions/utils/installment-calculator.util.ts:94`, `:110`.

El cálculo decide una sola vez si la compra fue posterior al cierre. Cuando fue anterior, no ajusta la fecha al cierre personalizado de los meses siguientes.

**Caso:** compra el 20/01, cierre habitual 25 y cierre personalizado de febrero el 10. Genera 20/01, 20/02 y 20/03. Según el propio servicio de ciclos, las cuotas 2 y 3 pertenecen ambas a marzo. La proyección por mes calendario las presenta una en febrero y otra en marzo. Dos servicios del mismo backend discrepan.

Además, `date` pasa a contener una fecha de imputación y se pierde el día de compra original. El motor no usa `dueDay` para proyectar salida real de caja y editar fecha/tarjeta no vuelve a aplicar una política coherente.

**Aceptación:** separar compra, resumen y pago; asignar cada cuota al ciclo que le corresponde sin colisiones; mismo resultado para compras antes/después del cierre, cierre personalizado de cualquier mes y edición válida. No reconstruir fechas históricas perdidas con una suposición.

### R04 · P1 para cerrar integridad financiera · El calendario omite datos al paginar

Referencias: `web/src/hooks/useCalendar.ts:26`, `web/src/hooks/useTransactions.ts:70`.

Se ejecutó el hook real transpilado con efectos/estado y red simulados: la API informó 101 movimientos y dos páginas; el hook cargó 100 y solo pidió página 1. El historial usa el mismo patrón y no conserva los metadatos para navegar.

No hay borrado en base, pero el usuario puede consultar un día y ver que no tiene movimientos aunque sí existan en otra página. La mejora de volumen introdujo una regresión funcional.

**Aceptación:** calendario completo para el mes y navegación real en historial; pruebas con 101, 201 y varios días. Ante una página fallida mostrar estado incompleto/error, no certificar ausencia de movimientos.

### R05 · P2 · PATCH permite ingreso con tarjeta

Referencia: `api/src/transactions/transactions.service.ts:194`.

La validación de tipo solo se llena cuando el payload incluye una categoría nueva. Actualizar un ingreso existente enviando solo `creditCardId` pasa. Cambiar una transacción con tarjeta a categoría de ingreso sin repetir la tarjeta también evita el control.

**Aceptación:** validar el registro final combinando estado guardado y patch, incluyendo categoría, medio, tarjeta, fecha y plan. El rechazo debe ser 400 antes de escribir.

### R06 · P2 · Recurrentes pagados dejan de existir al cambiar el mes

Referencias: `api/src/analytics/analytics.service.ts:249`, `api/src/reminders/reminders.service.ts:86`.

Con fecha de referencia 09/11, un recordatorio mensual de $100 vencido y pagado en octubre produce $0 en noviembre, diciembre y enero. No hay generación de la nueva ocurrencia mensual; el cron sigue buscando el `dueDate` viejo y `isPaid=false`.

**Aceptación:** pagar octubre no elimina noviembre; cada vencimiento tiene su pago independiente y su notificación. No crear duplicados si el job corre dos veces o reinicia.

### R07 · P2 · Ingresos futuros inflan el ingreso actual estimado

Referencia: `api/src/analytics/analytics.service.ts:187`.

Sin ingresos pasados, el fallback suma todos los ingresos del horizonte de forecast, aunque su comentario diga “mes corriente”. Con noviembre como mes actual y solo $900 de ingreso registrado en diciembre, estima $900 mensuales desde noviembre.

La UI ya identifica falta de ingresos y dejó de recortar ratios superiores al 100%, pero el backend fabrica 100% cuando no hay denominador. Conviene usar un estado explícito no calculable, distinto de un porcentaje real.

**Aceptación:** el fallback solo usa el período definido y distingue estimación, ingreso confirmado y ausencia de datos; el horizonte elegido no altera el ingreso base por incluir más transacciones futuras.

### R08 · P2 · Resumen general de presupuesto sigue sin detectar un exceso pequeño

Referencias: `api/src/budgets/budgets.service.ts:146`, `web/src/components/budgets/BudgetOverviewCard.tsx:11`.

Presupuesto $100 y gasto $100,01: el item devuelve correctamente `exceeded`; el total devuelve porcentaje redondeado 100 y la tarjeta general no marca exceso. Se corrigió la rama de categoría y quedó pendiente la vista general.

**Aceptación:** estado general basado en centavos; tests de 74,99%, 75%, 100% y un centavo excedido. Presentar los topes como plantilla mensual si se mantiene el modelo sin períodos.

### R09 · P2 · La zona del proceso todavía cambia resultados financieros

Referencias: `api/src/utils/date.util.ts:3`, motor de cuotas y `api/src/notifications/notifications.service.ts:44`.

El mismo instante `2026-01-26T01:00:00Z`, cierre 25, se imputa a febrero con proceso en UTC y a enero con proceso en Buenos Aires. Es todavía la noche del 25 en Argentina. No hay una política de negocio uniforme independiente del host.

El cron dispara a las 9 de Buenos Aires, pero para un proceso UTC consulta 00:00Z–23:59Z; el día local requerido es 03:00Z–03:00Z del día siguiente. Eso desplaza tres horas de la ventana. La configuración real de zona de Railway no se inspeccionó; el defecto es reproducible si el host usa UTC.

**Aceptación:** misma compra y mismo período producen los mismos resultados en los dos TZ; el cron consulta un intervalo semiabierto del día de negocio correcto. La fecha visible a mediodía arregla el síntoma del carrusel, no esta política completa.

### R10 · P1 de operación antes de migrar · Se editó un archivo histórico

Referencia: `api/prisma/migrations/20260503052146_add_email_password_to_user/migration.sql:8`.

El backfill de nombres nulos se agregó dentro de una migración de mayo ya presente en la revisión anterior. Hace funcionar una instalación nueva, pero no ejecuta ese nuevo SQL en bases que ya marcaron la migración como aplicada y cambia la historia local.

No se consultó `_prisma_migrations` de Supabase. Por eso no se afirma que la base real esté hoy en conflicto; corresponde comprobar qué contenido se aplicó y conciliarlo sin resets ni marcar migraciones como resueltas a ciegas. Prisma indica conservar las migraciones aplicadas y tratar los cambios con el historial real. [Documentación oficial](https://www.prisma.io/docs/orm/v7/prisma-migrate/understanding-prisma-migrate/migration-histories).

Las migraciones nuevas también cambian precisión de Reminder, agregan flags y reinterpretan `paymentMethod`. Una base existente necesita preflight de importes y filas huérfanas. El cambio a Decimal(10,2) puede redondear valores previos o fallar por overflow; una instalación vacía no prueba ese upgrade.

**Aceptación:** historial y esquema de Supabase conocidos, backup con restauración comprobada en entorno aislado y migración probada desde una copia sintética de la versión anterior.

## Qué falta sin una reproducción de explotación

- **Contratos:** `apiFetch<T>` hace una aserción de JSON. Resuelve el `Promise<any>` original, pero no prueba compatibilidad entre servidor y cliente. Aún hay contratos duplicados, `Date | string` en transporte y JSON de auth sin validación. `strict: true` está parcialmente sobreescrito por `noImplicitAny: false`.
- **Errores:** el calendario devuelve `error` pero la página no lo lee. Tarjetas/categorías/recordatorios todavía pueden presentar un vacío después de fallar; sus recargas absorben errores. Crear una transacción y fallar al recargar puede mostrar “error al guardar” pese a que se guardó, promoviendo un reintento duplicado.
- **Concurrencia:** el Restrict real de categoría se comprobó con SQL. Cambiar su tipo sigue consultando asociaciones y escribiendo por separado. La propiedad del usuario en relaciones se protege en servicios, sin una garantía equivalente del esquema. No se encontró un IDOR nuevo en esos flujos.
- **Volumen:** se quitó el N+1 principal de tarjetas. Forecast aún trae todos los planes y reminders, analytics agrupa filas en memoria y `/transactions` sin page/limit sigue ilimitado.
- **Estado compartido:** los topes de Maps limitan memoria, pero no hacen compartido el estado. El estado firmado también transporta el verificador PKCE dentro del parámetro URL; conviene mantenerlo en servidor junto al intento de autorización. No se afirma un bypass de CSRF por ese dato; el vínculo con cookie sí está implementado.
- **Google:** `verified !== false` acepta ausencia del indicador como verificación. Es preferible requerir `verified === true` y `googleId` obligatorio; el parser instalado obtiene el valor de `email_verified` de Google. El cierre de cuentas requiere un contrato explícito del proveedor. [Documentación Google](https://developers.google.com/identity/openid-connect/openid-connect).
- **Emails:** Resend ahora se llama de verdad. Falta comprobar configuración de remitente/dominio en la cuenta externa, timeout y reintentos observables. La idempotencia del proveedor se limita a su ventana publicada; no sustituye un registro persistente de entrega. [Resend](https://resend.com/docs/dashboard/emails/idempotency-keys).
- **Accesibilidad:** mejora significativa del foco del modal y formularios de negocio. Auth y BudgetFormModal conservan labels sin asociación; el fondo del diálogo no usa inert/aislamiento equivalente. La CSS de reduced motion no certifica por sí sola todas las animaciones JS de Framer Motion.
- **Documentación:** README raíz y API describen `POST /auth/google/exchange`, pero la ruta real es `POST /auth/exchange`. README API menciona `ENABLE_SWAGGER`, pero `main.ts` monta Swagger siempre. Esto no se clasifica como vulnerabilidad por el solo hecho de mostrar documentación.
- **Desarrollo:** audit completo informa 29 paquetes en API y 8 en web, solo de desarrollo según omit-dev. No aplicar las propuestas automáticas de downgrade a Jest 25 o eslint-config-next 15 para un proyecto Next 16. Actualizar selectivamente las herramientas y comprobar compatibilidad.
- **Calidad del código:** hay ramas `typeof prisma... === 'function'` que devuelven cero o cambian de algoritmo para tolerar mocks incompletos. Los tests deberían representar la interfaz real; estas ramas agregan comportamiento de producción difícil de justificar.

## Preparación para portfolio y producción

El trabajo ahora demuestra una buena capacidad de iteración: hay pruebas de HTTP, tipos completos y un árbol runtime actualizado. Para defenderlo técnicamente sigue siendo esencial cerrar los contraejemplos de este informe. La cantidad de tests o los nombres de etapas en commits anteriores no sustituyen las invariantes que faltan.

La siguiente mejora del portfolio debería documentar un caso financiero de punta a punta con fechas de compra/cierre/pago visibles, una política real de sesión y un CI que pruebe PostgreSQL. Es más útil que agregar otra pantalla.

Faltan capturas actuales, recorrido breve y datos de demo reproducibles en una cuenta/base aislada. No se debe poblar una demo sobre la base activa con un script que borre o reemplace información de usuarios. Las auditorías fechadas anteriores son evidencia histórica y deben conservar su fecha; este informe no reescribe el diagnóstico viejo como si hubiera sido falso.

## Entrega de esta revisión

- `INFORME.md`: estado individual, evidencia y límites.
- `PLAN-POR-ETAPAS.md`: correcciones nuevas, orden de commits y condiciones de push para Vercel/Railway/Supabase.
- `diagnosticos.cjs`: casos locales con datos sintéticos, JWT y bcrypt reales, servicios simulados, hook de calendario con runtime simulado y SQL en memoria. No lee `.env` ni abre conexiones de red.
- `resultados.json`: salida reproducible sobre este SHA.
- `dependencias.json`: fotografía npm completa/runtime del 09/11.

Para reproducir, compilar API y ejecutar desde la raíz:

```powershell
Set-Location api
npm run build
Set-Location ..
node docs/revision-2026-11-09/diagnosticos.cjs
```

Los scripts de auditoría no reemplazan la suite del producto. Los contraejemplos confirmados deben convertirse en tests de regresión al implementar sus respectivos commits.
