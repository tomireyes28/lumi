# Plan de cierre por etapas y commits

**Base:** `a882c803b75ebbac4e00de1e7b4185412802eca8`, revisión del 09/11/2026.  
**Entorno activo:** Vercel + Railway + Supabase, rama `main`.  
**Forma de trabajo acordada:** una corrección por commit; el autor hace el push al terminar cada etapa. Por instrucción posterior del autor, Codex ejecuta también el push al cierre de la etapa 1. La evidencia de ejecución se registra en RUNBOOK-ETAPA-1.md.

## Cómo ejecutar el plan

Se conservan los commits anteriores. Las correcciones nuevas se agregan sobre la base revisada: no hay que desarmar las seis entregas anteriores ni reescribir `main`.

Cada commit incluye su código, migración si corresponde y test de regresión relevante. Evitar un commit “corregir todos los hallazgos”, y también evitar separar el test indispensable de la corrección que verifica. Los títulos C01–C24 son propuestas concretas; el orden identifica dependencias.

Trabajar localmente en una rama `codex/etapa-N-...`, revisar los diffs y completar los checks. Al cerrar la etapa, integrar sus commits preservándolos y dejar preparado el resultado para que el autor haga **un push a `main`**. Este plan no publica nada por sí mismo.

Tratar cada push como una posible publicación inmediata, porque ambos servicios siguen `main`. No asumir que Vercel y Railway terminan en orden ni que esperan al mismo job de GitHub Actions. Confirmar esa configuración en la etapa 1. Un cambio que requiere API nueva debe ser aditivo, tener un mecanismo de activación controlado o esperar una promoción ordenada del frontend.

Los hallazgos ya cerrados —F01 runtime, F02, F04, F06, F07, F10 secuencial y F13— se conservan y se protegen con sus tests. No se programa otra implementación para ellos.

| Etapa | Resultado esperado | Commits | Publicación del autor |
|---|---|---:|---|
| 1 | Historial de base y release reproducibles | C01–C02 | Push 1, tras comprobar Supabase |
| 2 | Sesiones y OAuth resistentes a reinicios y vinculación | C03–C07 | Push 2, con corte de sesión comunicado |
| 3 | Fechas, cuotas y edición con una política coherente | C08–C12 | Push 3, con esquema aditivo previamente validado |
| 4 | Recurrencia, forecast y notificaciones consistentes | C13–C15 | Push 4, tras validar ocurrencias y jobs |
| 5 | Datos completos y frontend confiable | C16–C20 | Push 5, tras recorridos de UI |
| 6 | Evidencia de calidad y portfolio | C21–C24 | Push 6, candidato final de presentación |

## Etapa 1 · Base desplegable y migraciones

**Objetivo:** conocer qué está corriendo antes de tocar una base activa. Atiende R10, parte de F16/F21/F24 y el riesgo de desplegar código que necesita esquema nuevo.

### C01 — `chore(release): documentar despliegue y preflight de Supabase`

- Registrar SHA de Vercel y Railway, rama vinculada, comandos build/start/predeploy, healthcheck y mecanismo real de promoción/rollback. Agregar una identificación pública mínima de versión/health si hace falta; no exponer configuración o secretos.
- Revisar en lectura `_prisma_migrations`, esquema y migraciones pendientes de Supabase. Comprobar si los dos cambios del 03/11 ya fueron aplicados.
- Documentar backup y restauración en un entorno aislado. Obtener un diagnóstico de datos heredados: importes fuera del rango nuevo, filas huérfanas, cuotas no positivas y planes que requieren revisión. No modificar importes ni inferir fechas de compra perdidas durante esta inspección.
- Verificar permisos de tablas financieras frente a roles `anon`/`authenticated` y exposición por la API de Supabase, además del rol usado por Prisma. La revisión actual no acreditó RLS/grants del entorno real.
- Determinar si un push despliega directamente o existe promoción posterior y cómo se evita publicar antes de los checks.

**Listo cuando:** existe un runbook con hechos del entorno, sin secretos, y se conoce el contenido aplicado de cada migración relevante.

### C02 — `fix(db): conciliar migraciones y probar upgrades en PostgreSQL`

- Resolver el archivo histórico editado según lo comprobado en C01. Si Supabase aplicó la versión original, conservar ese contenido y llevar cambios necesarios a una migración nueva. Si aplicó otra versión, definir reconciliación con esa evidencia; no restaurar ni marcar checksums a ciegas.
- Añadir PostgreSQL 16 y 17 aislados a CI (Supabase usa 17.6), con prueba de migración desde cero y desde el esquema anterior con fixtures sintéticos representativos.
- Probar el cambio de precisión de Reminder, backfill de paymentMethod, Restrict de categoría y campos de identidad. Los fixtures deben incluir datos antiguos, no solo tablas vacías.
- Mantener las pruebas HTTP rápidas con mocks y distinguirlas de las pruebas que usan Prisma y PostgreSQL reales.

**Listo cuando:** instalación nueva y upgrade pasan; el histórico real tiene una explicación verificable y no se pide reset de producción.

**Punto de push 1:** ambos builds y checks actuales pasan, se ensaya la migración en entorno aislado y el autor revisa el runbook. No correr `migrate reset`, `db push --accept-data-loss` ni borrar `_prisma_migrations` para hacer desaparecer diferencias.

## Etapa 2 · Autenticación y sesión persistentes

**Objetivo:** cerrar F03/F14/F22 y preservar F02. Esta etapa corrige R01/R02. Se puede aprovechar Supabase PostgreSQL para el estado compartido, sin agregar un servicio externo solo para la demo.

### C03 — `fix(auth): persistir sesiones y revocaciones`

- Agregar una migración aditiva para registro de sesión/revocación con identificador, usuario, expiración y revocación, o una representación equivalente con garantías atómicas.
- JWT firmado identifica una sesión verificable en base. Revocarla debe sobrevivir a reinicios, desplegar Railway y consultar desde una segunda instancia.
- No eliminar revocaciones vigentes al llegar a un máximo de elementos. Limpiar solo datos expirados según política.
- Definir el corte de tokens heredados que no tengan sesión/versionado. Para privilegiar seguridad, planificar un único reingreso de sesiones antiguas; comunicarlo como efecto esperado de esta etapa y probar que no modifica datos.

**Test obligatorio:** emitir → revocar → reconstruir servicio/conexión → rechazar token; repetir desde una segunda instancia.

### C04 — `fix(auth): invalidar accesos previos al vincular Google`

- Exigir subject estable y email positivamente verificado; no interpretar un indicador ausente como `true`.
- Vincular identidad, retirar credencial local no verificada e invalidar sesiones anteriores en una operación coherente/atómica. Emitir la nueva sesión después de esa operación.
- Usar versión de autenticación o invalidación de sesiones para cerrar el token del registrante inicial, no solo su contraseña.

**Test obligatorio:** el caso R01 termina con 401 para el JWT local previo y permite la sesión del dueño con Google. Cubrir identidad de proveedor diferente y email no verificado.

### C05 — `fix(oauth): compartir canjes y estado de un solo uso`

- Llevar códigos y consumo de nonces a almacenamiento compartido con TTL y consumo atómico.
- Mantener nonce ligado al navegador y el state del frontend; guardar el verificador PKCE en servidor, sin incluirlo en el parámetro visible de la URL.
- Proteger el código guardado mediante una representación adecuada, como hash del código aleatorio. Evitar registrar códigos, verificadores o JWT.

**Test obligatorio:** crear en instancia A, canjear en B, rechazar segundo canje y expirado, rechazar navegador ajeno y replay; simular dos canjes concurrentes con un único ganador.

### C06 — `fix(web): usar sesión HttpOnly del mismo origen`

- Implementar la frontera de sesión en Next/BFF: el navegador llama a rutas del mismo origen y Next mantiene la cookie HttpOnly/Secure y comunica con Railway mediante el token del lado servidor.
- Adaptar login local, callback/canje Google, perfil y peticiones de negocio. No entregar el JWT al JavaScript de la aplicación ni persistirlo en localStorage/Zustand/cookie JS.
- Agregar protección CSRF/validación de origen a mutaciones autenticadas por cookie, manejo de expiración y logout esperado/confirmado. Eliminar los restos de almacenamiento legado durante el cambio.
- Conservar la interfaz de servidor de Railway compatible durante el rollout. Una cookie de Railway no debe ser el supuesto que sostiene la navegación de Vercel.

**Test obligatorio:** flujo completo con dominios representativos, Google por callback simulado seguro, recarga, pestañas, logout y expiración; comprobar que no haya token en almacenamiento legible por JS.

### C07 — `fix(security): compartir límites de peticiones entre instancias`

- Usar un storage compartido y atómico para el límite que protege autenticación; definir explícitamente el alcance del límite global. Mantener IP real según proxy confiable comprobado en C01.
- Si se adopta PostgreSQL, probar contención y expiración; si se elige Redis por necesidades medidas, documentar ese nuevo servicio. Evitar un límite que cambie al balancear entre réplicas.
- Documentar comportamiento cuando el almacenamiento de seguridad no está disponible.

**Test obligatorio:** repartir peticiones entre dos instancias no aumenta el límite permitido; una cabecera cliente no suplanta libremente la IP.

**Punto de push 2:** esquema de sesiones compatible aplicado antes de arrancar la API nueva; login y logout probados en preview/entorno aislado. Esperar reingreso de sesiones antiguas. Verificar el flujo real después del push. Ante un problema, no volver a habilitar tokens revocados como mecanismo de rollback; preferir corrección hacia adelante o un cierre temporal controlado del acceso afectado.

## Etapa 3 · Motor financiero y fechas

**Objetivo:** cerrar F05/F08/F09 y lo concurrente de F21. Atiende R03/R05/R09. Mantiene el reparto en centavos ya correcto.

### C08 — `fix(dates): unificar el calendario de negocio en Buenos Aires`

- Centralizar el contrato de fecha calendario e instante. Usar la zona IANA de negocio explícita para períodos, cierres, calendario y ventana del cron, sin depender del TZ del host.
- Rechazar fechas calendario inválidas en las fronteras. Separar el helper de clamp deliberado, si se necesita para fin de mes, del parser de entradas del usuario.
- El cron consulta `[inicio del día local, inicio del día siguiente)`, no un día UTC accidental.

**Test obligatorio:** ejecutar los mismos escenarios en UTC y Buenos Aires, incluyendo `2026-01-26T01:00Z`, cierre 25, fin de mes/año y rango de notificaciones.

### C09 — `feat(db): separar fecha de compra, resumen y vencimiento`

- Introducir campos de compra/período de resumen/fecha de pago con semántica explícita y contrato aditivo.
- Mantener compatibilidad temporal de `date` con clientes anteriores, con un significado documentado mientras dure la transición.
- Tratar los registros que ya perdieron la fecha original como datos heredados con información desconocida. Preparar diagnóstico/dry-run para cualquier reclasificación; no fabricar el día de compra ni reescribir importes históricos automáticamente.

**Test obligatorio:** migrar registros de ambas versiones conservando sus totales e identificadores y sin inventar fechas desconocidas.

### C10 — `fix(cards): asignar cada cuota a su resumen y vencimiento`

- Compartir la política de ciclos entre billetera, transacciones y forecast.
- Evaluar cada período, no solo si la primera compra ocurrió después del cierre. Incluir cierres personalizados posteriores y fecha de pago.
- Preservar compra y monto total; no presentar como cashflow una fecha que representa únicamente período de resumen.

**Test obligatorio:** R03, compra antes/después/en día de cierre, febrero corto, diciembre/enero, un pago, cuotas múltiples y cambio de cierre futuro. El ciclo calculado por billetera debe coincidir con la imputación de la cuota.

### C11 — `fix(transactions): validar el estado final de cada edición`

- Combinar registro guardado y PATCH para validar tipo de categoría, tarjeta, medio de pago y fechas.
- Rechazar ingreso con tarjeta tanto si cambia la categoría como si solo cambia la tarjeta. Reaplicar la política temporal cuando una edición cambie sus entradas.
- Mantener la edición individual de una cuota con una semántica explícita; no cambiar todo el plan sin que la operación lo indique.

**Test obligatorio:** las dos variantes de R05, desconectar tarjeta, cambiar fecha/tarjeta y rechazar recursos de otro usuario.

### C12 — `fix(categories): preservar invariantes bajo operaciones concurrentes`

- Hacer atómica la comprobación de asociaciones frente a creación de movimientos/presupuestos y cambio de tipo de categoría.
- Elegir aislamiento/bloqueo consistente y reintento de conflictos. Mantener Restrict para borrar y mensajes previsibles; no basar la garantía en dos consultas separadas.
- Retirar las ramas que tratan métodos ausentes de Prisma como cero asociaciones y corregir los mocks de las pruebas.
- Documentar qué invariantes de pertenencia se sostienen en servicio y cuáles se refuerzan en base. Antes de agregar restricciones compuestas nuevas, comprobar datos existentes.

**Test obligatorio:** dos conexiones reales creando movimiento/cambiando tipo o borrando categoría no dejan un histórico reinterpretado ni eliminan un movimiento válido.

**Punto de push 3:** fixtures heredados y totales conservados; migración aditiva ensayada y motor consistente en dos TZ. Publicar API compatible y activar la nueva lectura de fechas solo cuando el servidor la sostenga. Cualquier corrección de datos reales se revisa con un resultado concreto del dry-run aparte de la migración de estructura.

## Etapa 4 · Proyección, recurrencia y correo

**Objetivo:** cerrar F11/F12/F20. Atiende R06/R07 y usa la política temporal ya corregida.

### C13 — `fix(reminders): registrar vencimientos recurrentes por período`

- Separar regla recurrente y ocurrencias, con clave única de regla/período o mecanismo equivalente que impida duplicados.
- Un pago corresponde a una ocurrencia. Pagar octubre mantiene noviembre pendiente; permitir detener una regla sin reescribir pagos anteriores.
- Usar las mismas ocurrencias en calendario, forecast y cron. Migrar el recordatorio existente conservando su estado y generar siguientes vencimientos de forma idempotente.

**Test obligatorio:** pagado en mes anterior, impago vencido, cambio de año, día 31, regla detenida y dos ejecuciones concurrentes de generación.

### C14 — `fix(forecast): estimar ingresos y compromiso con períodos válidos`

- Acotar el fallback al mes definido y conservar la estimación histórica con una regla documentada.
- Separar ausencia de ingresos de un ratio calculado. Comunicar porcentajes no calculables mediante un estado explícito y adaptar el contrato/UI.
- Alinear nombres de cuotas transcurridas con su significado; no llamar pago a lo que solo está fechado en el pasado.

**Test obligatorio:** R07, cambiar horizonte 3/6/12 sin inflar ingreso base, ingreso cero con deuda, ratio superior a 100% y planes sin pago confirmado.

### C15 — `fix(notifications): persistir entregas y reintentos de vencimientos`

- Consumir las ocurrencias de C13 con la ventana local de C08.
- Agregar timeout, registro persistente de intento/entrega, reintento acotado y métricas de fallo sin datos sensibles. Usar idempotencia por ocurrencia y evento.
- Verificar remitente/dominio configurado en Resend sin enviar correos de prueba durante esta auditoría. Un envío real se hace únicamente cuando el autor lo solicite y defina destinatario.

**Test obligatorio:** timeout, 429/5xx, caída después del envío, repetición del job, reinicio y no duplicar la entrega. Usar mocks del proveedor en CI.

**Punto de push 4:** una ocurrencia pagada no cancela la siguiente y la proyección coincide con calendario/cron. Verificar jobs y configuración externa después del deploy; no confundir un test HTTP simulado con entrega de correo acreditada.

## Etapa 5 · Frontend y contratos

**Objetivo:** cerrar F15/F17/F18/F19/F23. Atiende R04/R08 y los vacíos de UI que quedan.

### C16 — `fix(pagination): mostrar todos los datos accesibles del período`

- Conservar meta y navegación real en historial; el calendario debe cubrir todas las páginas del mes o usar una consulta de agregación equivalente.
- Para la solución inicial, aprovechar los endpoints existentes con concurrencia acotada y caché, sin publicar una ruta nueva de la que dependa un frontend que podría desplegar antes que Railway.
- Evitar que un error a mitad de paginación convierta el resultado parcial en un mes aparentemente completo.
- Acotar consultas históricas de forecast mediante agregaciones/selección de planes relevantes y retirar gradualmente el contrato ilimitado solo después de migrar consumidores.

**Test obligatorio:** 101 y 201 movimientos, varios días, filtrado de tipo, error en segunda página y navegación hacia atrás/adelante.

### C17 — `fix(web): distinguir error de consulta y resultado de mutación`

- Mostrar estado de error y reintento en calendario, tarjetas, categorías y recordatorios.
- Establecer loading al cambiar de mes, evitar mezclar título nuevo con datos anteriores y representar actualización parcial de forma explícita.
- Si un POST se guardó y luego falló la recarga, informar ambas cosas sin sugerir repetir la creación. Las recargas no deben absorber errores inadvertidamente.

**Test obligatorio:** API caída, timeout, mutación exitosa con GET posterior fallido y cambio rápido de período; ninguna pantalla concluye saldo cero o ausencia de vencimientos por error de red.

### C18 — `fix(budgets): calcular el estado general con centavos`

- Comparar importes para exceso/75% en la tarjeta general y usar el porcentaje redondeado solo como presentación.
- Comunicar que el total incluye categorías presupuestadas y que los límites son plantillas mensuales si se conserva ese modelo. Versionar límites históricos sería una ampliación de producto, no un requisito impuesto por esta auditoría.

**Test obligatorio:** R08 y umbrales exactos; categoría y resumen general muestran el mismo estado para el mismo conjunto de datos.

### C19 — `refactor(contracts): sincronizar respuestas y validar la frontera HTTP`

- Definir DTO de respuesta y convención de dinero, fechas y null. Sincronizar cliente mediante OpenAPI u otra fuente comprobable y agregar pruebas de contrato.
- Tratar JSON externo como unknown y validar las respuestas críticas de autenticación/finanzas; no considerar `as T` una validación.
- Quitar la excepción de `noImplicitAny: false` después de corregir los errores reales que aparezcan. Separar request/input de entidad de lectura y dejar nombres de métricas coherentes.

**Test obligatorio:** respuesta paginada, Decimal serializado, null, respuesta incompleta y discrepancia de auth; un payload incompatible falla de forma visible y controlada.

### C20 — `fix(a11y): completar etiquetas y aislamiento de diálogos`

- Asociar labels de auth/presupuestos y completar nombres/estados de controles.
- Aislar el fondo del modal, asegurar su capa frente a la navegación fija y sostener foco inicial, Tab/Shift-Tab, Escape y devolución al disparador sin reinicios de foco innecesarios.
- Aplicar movimiento reducido también a animaciones JS relevantes.

**Test obligatorio:** recorrido con teclado y lector/inspección de accesibilidad en desktop y móvil; diálogo sin foco en fondo y formularios con nombre accesible.

**Punto de push 5:** se puede explorar un mes con más de 100 movimientos, recuperarse de errores y operar formularios/modales con teclado. Probar el frontend con la versión de API que realmente está en Railway, además de la combinación nueva.

## Etapa 6 · Evidencia final y portfolio

**Objetivo:** terminar F16/F24/F25 y la deuda de desarrollo remanente de F01.

### C21 — `chore(deps): actualizar herramientas de desarrollo compatibles`

Actualizar transitivas/herramientas por grupos compatibles, revisar overrides y lockfiles y repetir lint/typecheck/tests/build. Resolver brace-expansion y minimatch sin aplicar downgrades automáticos de Jest o eslint-config-next. Justificar cualquier advisory remanente con su alcance; no ocultarlo del informe.

### C22 — `test(regression): automatizar el recorrido de finanzas y sesión`

Consolidar las pruebas agregadas en cada corrección y sumar el recorrido de navegador con una base aislada: login, categoría, tarjeta, compra con cierre especial, presupuesto, recurrencia, más de 100 movimientos y logout. CI debe probar migraciones y driver Prisma reales. Mantener una cantidad de tests útil; no fijar 100% global como sustituto de esas garantías.

### C23 — `docs(portfolio): alinear capacidades y preparar una demo reproducible`

Corregir ruta `/auth/exchange`, disponibilidad real de Swagger, límites de sesión, recurrencia y significados de fecha/métricas. Añadir seed idempotente exclusivamente para entorno de demo, capturas actuales, recorrido breve y decisiones con tradeoffs. Conservar auditorías fechadas e incorporar una matriz de cierre con evidencia por corrección.

### C24 — `refactor(web): actualizar proxy y cerrar convenciones de entrega`

Migrar `middleware.ts` a la convención `proxy` compatible con Next instalado; retirar el alias de carrusel cuando no tenga consumidores y limpiar comentarios de pasos intermedios. Comprobar identidad visual, imagen social real, safe areas, mobile/desktop y reduced motion. Son tareas de cierre con build y revisión dirigida, sin rehacer arquitectura por estética.

**Punto de push 6:** CI verde, pruebas contra base aislada, evidencia visual actual y recorrido de demo reproducible. El README debe poder defenderse contra el código y los resultados reales.

## Verificación antes y después de cada push

Antes, ejecutar checks acordes a los módulos cambiados y el conjunto mínimo de integración del release. API dispone de `lint:check`, `typecheck`, unitarios, HTTP tests y build; web dispone de lint, typecheck y build. Cada cambio financiero/de sesión agrega su contraejemplo como regresión dentro del mismo commit. No repetir suites costosas sin un cambio o una preocupación pendiente que lo justifique.

Después del push del autor, comprobar CI, SHA efectivamente servido por ambos proveedores, `/health`, acceso/salida, lectura del resumen y la funcionalidad específica de la etapa. Verificar migraciones pendientes y logs sin secretos. Usar cuenta y datos de prueba identificables; no crear pagos ni enviar emails a terceros como comprobación implícita.

Para esquema, favorecer expansión aditiva y rollback del código sobre columnas compatibles. No planificar un rollback mediante borrado de tablas o restauración de la base que elimine movimientos creados después del despliegue. Si se requiere corregir datos existentes, preparar primero el resultado revisable y su estrategia de reversión.

Una etapa queda cerrada cuando su comportamiento está comprobado en el despliegue. Si falla esa comprobación, corregirla antes de avanzar con el siguiente push. Las correcciones de alta prioridad de sesión y asignación de cuotas tienen preferencia sobre el material visual del portfolio.
