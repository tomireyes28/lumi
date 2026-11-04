# Auditoría técnica de Lumi para portfolio

**Fecha:** 30 de octubre de 2026, Argentina (UTC−3).  
**Revisión base:** `68a216acc0f74bbf707bb3e750c9a9dee47e2021`.  
**Objeto:** evaluar corrección, tipos, arquitectura, seguridad, pruebas y capacidad del proyecto para sostener una presentación profesional.  
**Cambios realizados durante la auditoría:** documentación y diagnósticos en esta carpeta. No se corrigió código de la aplicación, no se actualizaron dependencias ni se modificaron credenciales o bases existentes.

## 1. Dictamen

**Lumi tiene una base valiosa para un portfolio full stack, pero todavía no lo presentaría como una aplicación financiera terminada y endurecida para producción.** Tiene un problema de negocio reconocible, funcionalidades conectadas entre sí, separación por dominios y decisiones de seguridad acertadas. Sin embargo, se comprobaron errores que alteran importes, fechas, proyecciones e históricos, dos riesgos relevantes en autenticación y un fallo reproducible del CI.

Desde una evaluación técnica de contratación, el proyecto da motivos para conversar con su autor: permite discutir modelado, consultas, autenticación, fechas, cuotas y experiencia de usuario. La debilidad principal está en la distancia entre las garantías que describe la documentación y las que sostienen la implementación y las pruebas.

La prioridad es consolidar estas garantías. Agregar más funcionalidades ahora aportaría menos que demostrar que los cálculos, los límites de acceso y la instalación funcionan en situaciones difíciles.

## 2. Alcance y método

Se revisaron los archivos versionados relevantes de ambas aplicaciones, sus servicios, controladores, DTO, esquema y migraciones, hooks, cliente HTTP, sesión, componentes, configuración, workflows y documentación. El repositorio contiene **165 archivos versionados**, **130 archivos TypeScript/TSX** y **77 commits** en las referencias locales al momento de la revisión.

La auditoría combinó lectura de código, ejecución de verificaciones existentes, consulta actualizada de avisos de seguridad y reproducciones locales. Las referencias a código usan rutas desde la raíz del repositorio y líneas de esta revisión base.

### Verificaciones ejecutadas

| Verificación | Resultado | Interpretación |
|---|---|---|
| ESLint API sin `--fix` | Pasa | El análisis no reformateó ni corrigió archivos |
| ESLint web | Pasa | No aparecieron errores con las reglas actuales |
| Tests unitarios API | **39/39**, 8 suites | Son principalmente pruebas con Prisma simulado |
| Cobertura API | **38% líneas**, 36,95% sentencias, 33,47% ramas, 29,49% funciones | Valor global de la configuración actual; no equivale a porcentaje de seguridad |
| Build API | Pasa | Compila la aplicación; excluye los tests |
| TypeScript API completo | **Falla** | Error TS2769 en `installment-calculator.spec.ts:45` |
| TypeScript API con `--strict`, solo build | **Falla: 2 errores** | Inicialización de propiedades de `CreateBudgetDto` |
| TypeScript web | Pasa | Los `any` inferidos en la frontera HTTP siguen pasando |
| Build web | Pasa | Requirió acceso a Google Fonts; aviso de migración de `middleware` a `proxy` |
| Prisma generate con variables del CI y sin `.env` local | **Falla** | Falta `DIRECT_URL` |
| Cinco migraciones SQL desde cero | Pasan en PostgreSQL 17.5 WASM/PGlite | Comprobación auxiliar en memoria, distinta de PostgreSQL 16 y del motor de migraciones Prisma |
| Diagnósticos financieros, DTO y autenticación | Fallos reproducidos | Resultados guardados en `resultados.json` |
| `npm audit`, completo y `--omit=dev` | Alertas vigentes | Resumen guardado en `dependencias.json` |
| Búsqueda acotada de secretos en archivos versionados | Sin credenciales reales confirmadas | Las coincidencias fueron ejemplos y credenciales de PostgreSQL local del CI |

La primera invocación de tests a través de `npm` no conservó correctamente los argumentos en este entorno PowerShell. La medición válida se hizo ejecutando directamente Jest. El primer build web falló por falta de acceso a Google Fonts; al habilitar la red compiló. Ese fallo inicial no se contabiliza como defecto del código.

### Límites de lo verificado

- No se probaron ataques contra un despliegue público ni se accedió a datos reales.
- No se inició sesión contra Google real. Los riesgos OAuth se sustentan en el código, la configuración efectiva de Passport y diagnósticos con datos sintéticos.
- Docker está instalado pero su motor no estaba disponible. No se ejecutaron migraciones ni integración completa Prisma sobre una instancia PostgreSQL 16.
- El e2e existente no se ejecutó contra la base configurada. Su expectativa obsoleta se identificó por inspección.
- La revisión de UX y accesibilidad fue de código. No se realizaron recorridos completos en navegador, mediciones Lighthouse, pruebas con lectores de pantalla ni pruebas de carga.
- La comprobación de secretos no fue una auditoría forense de todos los blobs históricos: se revisaron patrones de alta confianza en el árbol actual y el historial de rutas sensibles. No aparecieron `.env` reales versionados en esas rutas.
- Las versiones vulnerables se comprobaron en manifests, lockfiles e instalación local. No se verificaron las versiones efectivamente desplegadas ni los controles del proveedor de hosting.

## 3. Qué está bien y conviene conservar

1. **Problema de negocio concreto.** Cuotas, cierres, topes y reintegros permiten explicar decisiones más interesantes que un CRUD genérico.
2. **Modularización razonable del backend.** Los controladores delegan y los servicios agrupan operaciones por dominio. NestJS y Prisma se usan de manera consistente.
3. **Separación del frontend.** Páginas, componentes por dominio, hooks y tipos están organizados y son localizables. Zustand se reserva principalmente para sesión.
4. **Controles de pertenencia reales.** Los endpoints de negocio revisados usan guard JWT y obtienen el usuario de la sesión verificada. Las mutaciones comprueban dueño de categorías, tarjetas, transacciones, presupuestos, recordatorios y ciclos.
5. **Buenas defensas básicas.** ValidationPipe con whitelist y rechazo de campos extras, CORS acotado, Helmet, límites de autenticación, hash bcrypt y obligación de definir un secreto JWT.
6. **Mejora acertada en el callback OAuth.** El backend usa un código aleatorio, efímero y de un uso en vez de emitir directamente el JWT en su redirección. Esta defensa existe, aunque el flujo completo necesita correcciones.
7. **Persistencia monetaria decimal.** Los campos principales usan `DECIMAL(10,2)`, hay índices por usuario/fecha y restricciones únicas útiles para presupuestos y ciclos.
8. **Pruebas de comportamientos útiles.** Hay cobertura de pertenencia, distribución del caso habitual de cuotas, fin de mes, presupuestos y ciclos personalizados. También existe un healthcheck de conexión.
9. **Repositorio legible.** Hay ejemplos de variables, documentación de arquitectura y datos, lockfiles y commits descriptivos. No se necesita rehacer la aplicación desde cero.

No se encontró una ruta CRUD de negocio claramente pública, una inyección SQL construida por concatenación o un IDOR directamente explotable en los flujos revisados. El único SQL manual de aplicación observado es un `SELECT 1` parametrizado mediante Prisma. Esto describe lo revisado y no constituye una garantía general de ausencia de vulnerabilidades.

## 4. Registro priorizado

**P1:** corregir antes de presentar las garantías de seguridad/corrección o de abrir una demo con datos reales.  
**P2:** corregir para una entrega profesional y mantenible; algunas observaciones dependen del escenario de uso.  
**P3:** mejoras de consistencia y presentación.

La prioridad del proyecto y la severidad de un advisory son cosas distintas: un paquete puede tener clasificación crítica y requerir una configuración que Lumi no usa. No se afirmó una explotación remota solo por aparecer en `npm audit`.

| ID | Prioridad | Hallazgo | Evidencia |
|---|---|---|---|
| F01 | P1; críticos condicionados al despliegue | Dependencias runtime con avisos vigentes | npm + advisories de mantenedores |
| F02 | P1 | Retorno OAuth sin vínculo con el navegador de origen | Passport configurado con `NullStore` |
| F03 | P1 | Vinculación por email conserva una contraseña local no verificada | Código + repositorio simulado |
| F04 | P1 | El reparto de cuotas puede producir montos negativos | Algoritmo + DTO + SQL en memoria |
| F05 | P1 | Proyección mensual de cuotas desconectada de cierres y vencimientos | Servicio + diagnóstico |
| F06 | P1 | Borrar una tarjeta reclasifica el histórico como efectivo | SQL con las migraciones reales |
| F07 | P1 | CI del backend falla sin el `.env` local | Reproducción de `prisma generate` |
| F08 | P2 | Validación incompleta y `null` incompatibles con la persistencia | ValidationPipe real |
| F09 | P2 | Fechas financieras dependientes del huso horario del proceso | Reproducción UTC−3 |
| F10 | P2 | Editar el tipo de una categoría reinterpreta su histórico | Código y esquema |
| F11 | P2 | Recordatorios puntuales tratados como recurrentes | Diagnóstico de forecast |
| F12 | P2 | Indicadores de deuda/pago/riesgo afirman más que los datos | Código + diagnóstico |
| F13 | P2 | Límite bcrypt validado en caracteres y no en bytes | bcrypt real + DTO |
| F14 | P2, riesgo condicionado a robo de token | Sesión persistente expuesta a JavaScript, sin revocación individual | Código de sesión |
| F15 | P2 | Tipado de contratos HTTP diluido por `any` inferido | Type checker real |
| F16 | P2 | Tests y CI dejan fuera fronteras importantes | Cobertura + configuración |
| F17 | P2 | Errores de red pueden presentarse como ceros o datos vacíos | Hooks y vistas |
| F18 | P2 | Paginación optativa y consultas que cargan todo el historial | Servicios + consumidores |
| F19 | P2 | Alertas de presupuesto calculadas tras redondear el porcentaje | Reproducción con $100,01 |
| F20 | P2 | Notificaciones por email todavía no implementadas | Método con `Promise.resolve()` |
| F21 | P2, escenarios concurrentes | Reglas de integridad apoyadas en comprobaciones separadas | Relaciones + secuencia de consultas |
| F22 | P2, varias instancias | Estado OAuth y rate limiting locales al proceso | Map + storage por defecto |
| F23 | P2 | Accesibilidad incompleta de formularios y modales | Inspección de componentes |
| F24 | P2 | Documentación promete capacidades que no sostiene el código | Contraste documental |
| F25 | P3 | Falta cerrar la presentación y ciertas convenciones | Revisión de repositorio y UI |

## 5. Seguridad

### F01. Dependencias vulnerables: separar presencia de exposición

Ubicaciones: `web/package.json:15`, ambos lockfiles, `api/src/main.ts:8`, `api/src/app.module.ts:20`.

| Árbol auditado | Bajas | Moderadas | Altas | Críticas | Total de paquetes reportados |
|---|---:|---:|---:|---:|---:|
| API completo | 9 | 6 | 13 | 2 | 30 |
| API con `--omit=dev` | 0 | 6 | 9 | 1 | 16 |
| Web completo | 1 | 1 | 8 | 1 | 11 |
| Web con `--omit=dev` | 0 | 1 | 4 | 1 | 6 |

Estos números no cuentan CVE únicos ni puertas abiertas independientes. El mismo advisory puede propagarse entre dependencias. `--omit=dev` tampoco certifica que una función vulnerable se ejecute en una petición.

Casos prioritarios:

- **Next.js 16.2.4**, dependencia directa. Tiene avisos de bypass de middleware, denegación de servicio y RCE condicionada a funciones/plataformas. App Router y middleware están presentes en Lumi. La API separada sigue verificando JWT, por lo que el bypass del middleware no demuestra acceso a datos financieros. [Advisory de bypass del mantenedor](https://github.com/vercel/next.js/security/advisories/GHSA-267c-6grr-h53f).
- La **RCE de Next en servidores Windows** afecta al rango instalado, pero exige ese tipo de hosting. El repositorio no acredita que producción se ejecute en Windows. [Condiciones oficiales](https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36).
- El aviso de **optimización de SVG** depende de Linux glibc y de la biblioteca de imágenes afectada. El árbol instala Sharp vulnerable; no se identificó un flujo de carga de SVG arbitrario de usuarios en Lumi. Debe actualizarse igualmente, distinguiendo este caso de una explotación comprobada. [Advisory de Image Optimization](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw).
- **body-parser 2.2.2**, vía Express/Nest, tiene un aviso de caída del proceso con cuerpos comprimidos. Nest usa el parser estándar y el repo no muestra una mitigación específica: es una superficie relevante aun antes del guard JWT. No se envió un payload destructivo. [Advisory de Express](https://github.com/expressjs/body-parser/security/advisories/GHSA-27r3-jxmh-p828).
- **proxy-addr 2.0.7**, crítico por suplantación de IP bajo ciertas subredes IPv6 configuradas como proxies confiables. Esa configuración no aparece en Lumi; no hay evidencia de que este caso concreto sea explotable aquí. [Condiciones y parche](https://github.com/jshttp/proxy-addr/security/advisories/GHSA-jqcg-44mw-7w3h).
- **Handlebars**, el segundo paquete crítico del árbol completo API, llega por `ts-jest` y es de desarrollo. **Multer** está instalado vía Nest, pero no se encontraron endpoints de subida que lo utilicen.

Al consultar, npm propuso Next **16.4.3** para resolver su conjunto de alertas. Ese dato es una propuesta del registro a esta fecha, no un cambio aplicado ni una garantía suficiente por sí sola. Corresponde actualizar versiones compatibles, revisar el lockfile y repetir build, contratos y audit. No conviene aplicar automáticamente `npm audit fix --force`: algunas propuestas del árbol API implican cambios mayores o incluso versiones anteriores de herramientas.

### F02. Login CSRF y sesión inyectada mediante callback

Ubicaciones: `api/src/auth/strategies/google.strategy.ts:20`, `api/src/auth/auth.controller.ts:21`, `web/src/app/auth/callback/page.tsx:18`.

La estrategia no activa `state`, PKCE ni otro mecanismo equivalente que vincule el retorno al navegador que inició la autorización. La instancia efectiva de Passport usa `NullStore`; su implementación acepta el estado sin verificarlo. El frontend, además, acepta `?token=` por compatibilidad y canjea cualquier código válido recibido, sin comprobar una intención de login propia del navegador.

**Impacto:** un atacante puede inducir a una víctima a abrir el callback con credenciales/código de la cuenta del atacante y hacer que opere dentro de esa cuenta. Los datos que la víctima cargue allí quedarían accesibles al atacante. Es un riesgo de login CSRF, distinto de conocer la contraseña de la víctima.

El código de un solo uso reduce replay y exposición de JWT en la URL emitida por el backend; no resuelve por sí solo esta vinculación. Google exige prevención de CSRF en el cliente OAuth. [Documentación de Google](https://developers.google.com/identity/protocols/oauth2/web-server#creatingclient).

**Dirección de corrección:** nonce de estado asociado al navegador, verificación efectiva en callback y vinculación del canje a ese intento; evaluar PKCE según la arquitectura; retirar el callback legado por token y limpiar parámetros sensibles al procesarlos. No alcanza con añadir `state: true` sin implementar el almacenamiento y la comprobación correspondientes.

### F03. Riesgo de apropiación previa de cuenta por vinculación automática

Ubicaciones: `api/src/auth/auth.service.ts:30`, `api/src/auth/auth.service.ts:97`, `api/src/auth/strategies/google.strategy.ts:28`, modelo `User`.

El registro local crea una cuenta operativa sin comprobar control del email. El acceso con Google hace `upsert` por email y actualiza nombre/foto, preservando la contraseña previa. No se persiste el identificador estable del proveedor ni un estado de verificación local.

**Escenario:** alguien registra primero un email ajeno con una contraseña que conoce. Más tarde, el dueño del email entra con Google y cae en ese mismo usuario. La contraseña original continúa siendo válida, permitiendo al registrante inicial entrar en esa cuenta. El diagnóstico con repositorio simulado confirmó que la rama de actualización preserva el hash.

La estrategia tampoco consulta explícitamente el indicador de email verificado del perfil de Google. Esa comprobación, aislada, no elimina el problema de la contraseña local previa.

**Dirección:** verificar la titularidad antes de habilitar cuentas locales, modelar identidades por proveedor/subject y exigir un flujo explícito y autenticado para vincular credenciales. Cubrir el escenario descrito con una prueba de integración.

### F13. bcrypt limita bytes, pero el DTO limita caracteres

Ubicación: `api/src/auth/dto/auth.dto.ts:14` y `:26`.

Dos contraseñas sintéticas de 37 caracteres, construidas con 36 caracteres `é` y un sufijo diferente, pasan el DTO. Ocupan 73 bytes UTF-8. bcrypt considera sus primeros 72 bytes y la segunda verifica contra el hash de la primera. Se reprodujo con bcrypt 6 real.

Esto no significa que cualquier contraseña se pueda adivinar: significa que parte de una contraseña aceptada puede ignorarse. La afirmación del README de que 72 caracteres resuelve el límite de bcrypt es incorrecta. [Explicación del mantenedor](https://github.com/kelektiv/node.bcrypt.js#security-issues-and-concerns).

**Dirección:** validación de longitud en bytes si se conserva bcrypt, o migración estudiada a otro esquema de hash. Revisar también el mínimo de seis caracteres y el flujo de recuperación; no se requiere imponer reglas arbitrarias de símbolos.

### F14. Protección de sesión mejorable y gate visual distinto de autorización

Ubicaciones: `web/src/store/useAuthStore.ts:41`, `:92`, `web/src/middleware.ts:4`, `api/src/auth/auth.service.ts:44`.

El JWT dura siete días, se guarda en localStorage y se copia a una cookie creada por JavaScript. La cookie no puede ser HttpOnly. Un XSS que se introduzca en el origen podría extraerlo; el logout solo borra el almacenamiento del navegador y no revoca una copia robada. No se encontró un XSS de aplicación confirmado en esta revisión. El `dangerouslySetInnerHTML` del calendario contiene CSS estático, sin entradas del usuario, y no se contabiliza como XSS.

El middleware solo decodifica payload y expiración, sin verificar firma. Se puede construir una cookie que permita ver la estructura del dashboard. **La API sí verifica la firma mediante Passport**, por lo que esto no demuestra acceso no autorizado a los datos. El gate del cliente debe describirse y diseñarse en consecuencia.

**Dirección:** considerar una sesión de servidor/BFF con cookie HttpOnly o un esquema de access token breve y renovación/revocación; al pasar a cookies para autorizar operaciones, incorporar protección CSRF. Evitar tres fuentes de verdad innecesarias entre cookie, localStorage y Zustand. Un logout en una pestaña no actualiza el store de las demás.

### F22. Controles locales al proceso y despliegue

Ubicaciones: `api/src/auth/auth.service.ts:12`, `api/src/app.module.ts:20`, `api/src/notifications/notifications.service.ts:17`.

El canje OAuth usa un Map y el rate limiter su almacenamiento por defecto en memoria. Con varias réplicas, el código creado en una puede rechazarse en otra y cada proceso mantiene contadores distintos. Un reinicio también pierde los canjes pendientes. El cron se ejecutaría en cada réplica.

No es un fallo demostrado para una sola instancia. Es una restricción que debe documentarse o resolverse con almacenamiento compartido, consumo atómico del código y coordinación de jobs si se escala. También falta definir cómo se obtiene la IP real detrás del proxy: no conviene activar confianza indiscriminada en `X-Forwarded-For`.

En desarrollo, Compose publica PostgreSQL en todas las interfaces con credenciales `postgres/postgres`. Es una configuración local, no una credencial de producción filtrada. Para un entorno local menos expuesto conviene enlazar el puerto a `127.0.0.1`. El repo no permite concluir cómo están configurados TLS, secretos, backups y restauración del despliegue real.

## 6. Corrección financiera y persistencia

### F04. Cuotas negativas aceptadas y persistibles

Ubicación: `api/src/transactions/utils/installment-calculator.util.ts:32`.

El algoritmo redondea la cuota base hacia el centavo más cercano, multiplica ese resultado y carga todo el resto en la primera cuota. Con **$0,07 / 12**, genera **−$0,04** en la primera y once cuotas de **$0,01**. El DTO acepta la entrada y el esquema no impide persistir el importe negativo; ambas cosas se comprobaron.

La suma final coincide con el total, pero se viola la propiedad de que las cuotas de una compra positiva no sean negativas. El caso de $1.000/3 cubierto por tests no detecta esta clase de error.

**Dirección:** trabajar en centavos enteros o Decimal, repartir cociente y resto con invariantes explícitas y decidir qué hacer si hay más cuotas que centavos. Probar suma exacta, no negatividad, entradas mínimas y límites, no solo un ejemplo habitual.

### F05. Fecha de compra, resumen y salida de caja están mezclados

Ubicaciones: `api/src/transactions/transactions.service.ts:52`, calculadora `:41`, resumen `:184`, forecast `api/src/analytics/analytics.service.ts:212`, UI `web/src/components/dashboard/DashboardStats.tsx`.

La calculadora recibe la fecha de compra y genera cuotas el mismo día de meses sucesivos. No recibe `closingDay`, `dueDay` ni ciclos personalizados. La tarjeta se consulta para comprobar dueño, pero sus fechas no se usan para este cálculo.

**Caso reproducido:** compra del 26/01 con cierre el 25 genera fechas 26/01, 26/02 y 26/03. La proyección las agrupa por esos meses. No traslada la primera cuota al resumen posterior ni a su vencimiento. Los cambios de ciclo alteran el consumo mostrado en tarjetas, pero no la imputación del forecast.

Además, el resumen de transacciones calcula `totalCardExpense` por mes calendario y la UI lo rotula como “Consumos del ciclo actual”. La billetera sí usa límites de ciclo: dos pantallas pueden mostrar totales diferentes con rótulos que sugieren lo mismo.

**Dirección:** definir expresamente fecha de compra, período de resumen y fecha de pago; compartir el cálculo de ciclos con cuotas y forecast. Si la proyección es de compromisos por fecha de compra, documentarla así; no presentarla como flujo real de caja por vencimientos.

No se cuestiona la atomicidad de `createMany`: la inserción masiva tiene su garantía transaccional. Lo incorrecto del README es afirmar que existe un `$transaction` explícito y un algoritmo que integra los ciclos, cuando el código actual no lo hace.

### F06. Eliminar tarjetas cambia la clasificación del histórico

Ubicaciones: `api/prisma/schema.prisma:55`, `api/src/credit-cards/credit-cards.service.ts:200`, `api/src/transactions/transactions.service.ts:197`.

La relación aplica `ON DELETE SET NULL`. El resumen interpreta `creditCardId = null` como efectivo/débito. Al borrar la tarjeta, un gasto de $100 antes clasificado como tarjeta pasa a $100 de efectivo. La prueba SQL con las migraciones reales produjo:

| Estado | Gasto en efectivo | Gasto en tarjeta |
|---|---:|---:|
| Antes de borrar | $0 | $100 |
| Después de borrar | $100 | $0 |

Esto cambia la liquidez calculada y el histórico sin una nueva operación financiera. La advertencia “quedarán huérfanos” del modal no explica ese efecto.

**Dirección:** archivar tarjetas o impedir borrado con movimientos, y modelar el medio de pago de forma independiente de la existencia actual de la tarjeta.

### F08. La whitelist no asegura la validez de los valores

Ubicaciones: DTO de transacciones, tarjetas, ciclos y recordatorios; `api/src/utils/date.util.ts:12`.

Se reprodujeron los siguientes casos pasando por el ValidationPipe con la misma configuración global:

| Entrada | Comportamiento observado | Problema |
|---|---|---|
| Fecha de transacción `not-a-date` | Aceptada por DTO | Se construye un Invalid Date y puede terminar en error de persistencia |
| PATCH con `date: null` | Aceptado | `parseLocalDate(null)` falla al ejecutar `.trim()` |
| Importe `100000000.001` | Aceptado por DTO | Supera precisión/escala de `DECIMAL(10,2)` |
| Importe positivo `0.001` | La columna lo redondea a `0.00` | Se guarda un monto contrario a la intención de `IsPositive` |
| Cierre/vencimiento `2.5` / `4.5` | Aceptados por DTO | Campos enteros de Prisma no compatibles |
| Últimos cuatro caracteres `ABCD` | Aceptados | Se comprueba longitud, no cuatro dígitos |
| Mes de búsqueda `13` | Aceptado | Date normaliza al año siguiente en vez de rechazar |
| Ciclo octubre 2026 con cierre enero 2027 y vencimiento enero 2025 | Aceptado | Incoherencia temporal que puede romper los intervalos |
| Nombre de usuario solo con espacios | Aceptado | Después del trim se persiste vacío |
| PATCH con `installments: 12` | Aceptado | El servicio no usa ese campo; contrato engañoso |

`parseLocalDate('2026-02-31')` normaliza al 03/03. Las actualizaciones con PartialType también deben distinguir campo omitido de `null`: la mayoría de columnas no son anulables y `IsOptional` puede saltarse la validación de ambos casos.

Faltan además límites de longitud razonables en muchos textos y validación de rango/escala monetaria uniforme. Reminder permite montos negativos y tiene `Decimal(65,30)` por defecto, distinto del resto. Los nombres de IDs no se validan como UUID. La API también permite cuotas sin tarjeta o asociar una tarjeta a una categoría de ingreso, aunque la interfaz restringe esos casos.

**Dirección:** contratos específicos por operación, validación estricta de fecha calendario, enteros y rangos, semántica de `null`, importes de hasta dos decimales y restricciones de negocio en servidor. Traducir conflictos/errores esperables de Prisma a 400/409, en lugar de depender de errores 500 genéricos.

### F09. Inconsistencia de zona horaria

Ubicaciones: `api/src/utils/date.util.ts:1`, `api/src/credit-cards/credit-cards.service.ts:74`, `web/src/components/cards/CardCarrousel.tsx:42`, cron `:17`.

Se usan fechas locales del servidor, heurísticas sobre medianoche UTC y renderizado explícito en UTC en distintas capas. No hay una política única de zona de negocio.

**Reproducción:** en UTC−3, el cierre local del 25/10 a las 23:59 se serializa como `2026-10-26T02:59:59.999Z`. El carrusel fuerza UTC y muestra **26/10**. En la zona de negocio corresponde **25/10**.

También cambian límites mensuales y el horario del cron dependiendo de la configuración del host. Una compra con timestamp de las 22:30 de Argentina puede figurar al día siguiente en un calendario que compara la porción UTC del ISO.

**Dirección:** separar fechas calendario de instantes, definir zona de negocio o del usuario y convertir en fronteras explícitas. Probar el mismo escenario en UTC y UTC−3, incluyendo medianoche, fin de mes y año.

### F10. Cambiar categoría de gasto a ingreso reescribe la interpretación del pasado

Ubicación: `api/src/categories/categories.service.ts:37` y filtros por `category.type` en resumen/analytics.

La API permite editar `type` con movimientos o presupuestos asociados. Como cada transacción obtiene su tipo de la categoría actual, gastos antiguos pasan a verse como ingresos. Un presupuesto de gasto puede quedar enlazado a una categoría de ingreso, sin que su actualización lo valide.

**Dirección:** impedir el cambio de tipo cuando hay asociaciones, o modelar el tipo financiero en la transacción y definir una operación explícita para reclasificar el histórico. Cambiar color o nombre no requiere el mismo tratamiento.

### F11. Recurrencia inferida desde recordatorios impagos

Ubicación: `api/src/analytics/analytics.service.ts:230`.

Un recordatorio impago del mes actual se replica como gasto fijo en todos los meses proyectados, aunque el modelo no tiene una propiedad de recurrencia. Al marcarlo pagado desaparece de la consulta y de todos los meses futuros.

Con un recordatorio sintético de $100 se obtuvo `[100,100,100]`; marcado como pagado, `[0,0,0]`. Un vencimiento puntual se sobreproyecta y un servicio realmente recurrente deja de proyectarse justo después de pagarlo.

**Dirección:** recurrencia explícita, ocurrencias/vencimientos y estado de pago de cada una. Los recordatorios puntuales deben pertenecer a su mes.

### F12. Métricas que sugieren un estado no modelado

Ubicaciones: `api/src/analytics/analytics.service.ts:247`, `:289`, `web/src/components/forecast/ForecastSummaryCard.tsx` y `ActiveInstallmentsList.tsx`.

- Las cuotas de meses anteriores se cuentan como **pagadas** solo por su fecha. No hay un estado de pago/conciliación que respalde “amortizado”.
- Con deuda y sin ingreso estimable, el ratio queda en **0%**, y la vista lo muestra como “Compromiso Saludable”. Ese resultado se reprodujo.
- Los ratios superiores al 100% se recortan a 100, ocultando la magnitud real del exceso.
- La recomendación de tarjeta maximiza días hasta cierre sin considerar crédito disponible ni vencimiento; puede recomendar una tarjeta sin margen. La regla puede ser válida como comparación de cierres, pero el rótulo “Ideal” excede ese criterio.
- “Plata Disponible” es ingresos menos gastos en efectivo del mes, no un saldo de cuenta: no modela saldo inicial, arrastre ni pagos de resúmenes. La aclaración de la UI ayuda, pero el nombre principal sigue siendo ambiguo.

**Dirección:** distinguir pasado/estimado de pagado, usar estado desconocido cuando no hay base para el ratio y mantener el valor real para clasificación. Explicitar los criterios de recomendación y el alcance de cada métrica.

### F19. Alerta de presupuesto atrasada por redondeo

Ubicación: `api/src/budgets/budgets.service.ts:116`.

Se redondea el porcentaje antes de comparar `> 100`. Con presupuesto $100 y gasto $100,01 se devuelve 100% y estado `warning`, aunque el monto ya fue excedido. El umbral del 75% también puede activarse antes por redondeo.

Además, el presupuesto se almacena por usuario/categoría, sin período. Cambiarlo al mirar un mes cambia la referencia para todos los meses históricos. Puede ser una plantilla mensual recurrente válida, pero no un presupuesto histórico por mes. El total “General” suma solo las categorías presupuestadas y no representa necesariamente todo el gasto.

**Dirección:** comparar los importes sin redondear para decidir el estado, y redondear solo la presentación. Definir si el límite es una plantilla o una entidad por período y comunicar qué incluye el total.

### F21. Integridad bajo concurrencia y defensa de base de datos

Ubicaciones: `api/src/categories/categories.service.ts:49`, relaciones en `schema.prisma`, `api/src/auth/auth.service.ts:101`.

La prevención de borrado de categorías cuenta transacciones y luego borra en una consulta separada. Si entra un movimiento entre ambas operaciones, `ON DELETE CASCADE` puede borrarlo. Una comprobación previa sin una restricción que la sostenga no garantiza esta regla bajo concurrencia.

El registro comprueba email y después crea; dos registros simultáneos pueden llegar al unique constraint y generar un error sin traducir. Las relaciones independientes de `userId` y `categoryId`/`creditCardId` no garantizan a nivel de base que los dueños coincidan: la API lo comprueba actualmente, pero futuros scripts u operaciones nuevas deben sostenerlo.

No se comprobó una fuga entre usuarios por estas condiciones. Son riesgos de integridad y de mantenimiento. Corresponde reforzar restricciones, usar operaciones atómicas donde haga falta y tratar los conflictos. Las migraciones antiguas que convierten `User.name` a NOT NULL también necesitan una estrategia si se actualiza una base heredada que contenga nombres nulos.

## 7. Tipado, arquitectura y contrato de API

### F15. Hay interfaces, pero la frontera HTTP sigue sin tipar

Ubicaciones: `web/src/lib/api.ts:3`, hooks, `api/tsconfig.json`, `api/src/auth/interfaces/auth.interfaces.ts:24`.

El type checker confirma esta firma inferida:

```ts
(path: string, options?: RequestInit) => Promise<any>
```

`response.json()` devuelve `any`, que se propaga a los hooks. Una anotación como `const res: BudgetsSummaryResponse = await apiFetch(...)` acepta el resultado, pero no verifica que el servidor lo cumpla. El frontend puede compilar con campos cambiados, null inesperados o un objeto paginado donde esperaba un array.

Observaciones específicas:

- `picture` puede llegar como `null` desde la API, pero `User` y `UserProfile` lo declaran como string opcional.
- Los importes se expresan como `number | string` o string según el tipo; no hay una convención única de transporte monetario.
- Fechas JSON se tipan a veces como `Date | string`, aunque por HTTP llegan strings.
- `AuthenticatedRequest.user` describe solo `userId`/email; el endpoint `/auth/me` devuelve más campos en runtime.
- Callbacks de guardado se declaran `void` y reciben funciones asíncronas. JavaScript sí espera la promesa real cuando se hace `await`; la firma pierde la obligación de tratar esa operación como asíncrona.
- Se usa `Partial<CreditCard>`/`Partial<Category>` como entrada de mutaciones, permitiendo tipar campos de salida que el endpoint no admite.
- `UpdateTransactionDto` hereda cuotas que la actualización ignora.
- Presupuestos y forecast mantienen contratos duplicados en servidor/cliente sin sincronización automática.
- Backend no tiene `strict: true`, declara `noImplicitAny: false` y desactiva `no-explicit-any`. No se observó un uso masivo de `any` explícito en el código; el principal agujero comprobado es el `any` inferido en red.

Activar strict para el build backend produjo solo dos errores de propiedades no inicializadas en `CreateBudgetDto`: el salto inicial no parece requerir una reescritura. El chequeo completo actual ya falla en un test porque el tipo de `tx.date` incluye `undefined`.

**Dirección:** DTO de entrada y respuesta específicos, convención de fechas/importes/null, cliente tipado por endpoint y contrato generado desde OpenAPI o equivalente. Un genérico `apiFetch<T>` mejora ergonomía, pero no valida JSON por sí mismo; usar `unknown` y validación de frontera o pruebas de contrato donde corresponda.

### Valoración de la estructura

La organización actual es adecuada para el tamaño. No justifica microservicios, una capa de repositorios por cada llamada Prisma o una reescritura “clean architecture”. Los cambios de mayor valor serían:

- Unificar política de fechas, dinero y ciclos, que hoy cruza varios servicios.
- Extraer contratos de transporte y mapeo de respuestas, sin exponer indiscriminadamente modelos Prisma.
- Mantener los hooks como coordinadores de datos y formularios, evitando duplicar manejo de errores y recargas.
- Sustituir dependencias cruzadas accidentales, como usar `GetBudgetsQueryDto` desde transacciones, por un DTO de período compartido con nombre neutral.
- Definir una estrategia consistente de fetching/cache si el volumen de recargas crece. Adoptar una biblioteca concreta es una elección de implementación, no un requisito previo para corregir el proyecto.
- Agregar comandos raíz o workspaces solo si mejora la experiencia de desarrollo. Tener `api/` y `web/` con sus lockfiles no es en sí un defecto.

## 8. Calidad, pruebas y operación

### F07. El pipeline no es reproducible en un checkout limpio

Ubicaciones: `api/prisma.config.ts:7`, `.github/workflows/ci.yml:32`.

Prisma evalúa `env('DIRECT_URL')` al cargar la configuración. El workflow provee `DATABASE_URL`, pero no `DIRECT_URL`. Sin el `.env` local se reprodujo:

```text
PrismaConfigEnvError: Cannot resolve environment variable: DIRECT_URL.
```

El fallo ocurre antes de tests/build. No se necesita una base real para resolver ese paso, pero sí la configuración exigida. La guía inicial también menciona ajustar solo `DATABASE_URL` y JWT aunque el archivo requiere ambas URLs.

**Dirección:** alinear la configuración de Prisma con CI y guía de instalación; comprobar desde un entorno sin `.env` ni cliente Prisma generado previamente. No se consultó una ejecución remota de GitHub Actions, por lo que esta conclusión corresponde al workflow del commit auditado.

### F16. Una suite verde no cubre la garantía principal

Ubicaciones: `api/package.json`, `.github/workflows/ci.yml`, `api/test/app.e2e-spec.ts:23`, tests de servicios.

Los 39 tests pasan y varios son útiles. Sin embargo:

- La cobertura global de líneas es 38%. Controladores, estrategias JWT/Google, DTO, categorías, recordatorios y notificaciones no tienen cobertura efectiva en esta ejecución.
- El servicio de transacciones tiene aproximadamente 47% de líneas cubiertas; faltan comportamientos relevantes de actualización, borrado y resumen.
- La suite de forecast cubre pocos escenarios y no detecta recurrencia implícita ni ratio cero sin ingresos.
- Prisma se simula: estos tests no ejercitan restricciones, serialización de Decimal, migraciones ni operaciones concurrentes.
- No hay tests de frontend ni recorrido de usuario automatizado.
- El e2e conserva la expectativa `Hello World!`, mientras `/` devuelve `Lumi API is running`. Además no replica los pipes y configuración de `main.ts` ni cierra la app con un teardown.
- CI no ejecuta el e2e ni un typecheck completo que incluya tests. El build excluye specs y Jest transpila con la configuración actual, por eso puede pasar aunque `tsc` detecte TS2769.
- El lint API del workflow ejecuta `--fix`; puede corregir archivos durante CI y pasar sin exigir que esas correcciones estén versionadas.

**Dirección:** priorizar pruebas de frontera HTTP/validación y aislamiento entre dos usuarios, casos financieros adversos y migración desde cero. Agregar un recorrido corto registro → categoría → tarjeta → compra → resumen/proyección. Los umbrales deben representar garantías útiles; perseguir 100% de cobertura indiscriminada no resolvería las reglas de negocio.

### F18. Consultas no acotadas y trabajo en memoria

Ubicaciones: `api/src/transactions/transactions.service.ts:87`, `api/src/analytics/analytics.service.ts:163`, `api/src/credit-cards/credit-cards.service.ts:162`, `web/src/hooks/useCalendar.ts` y `useTransactions.ts`.

La paginación de transacciones existe, pero es optativa. Sus consumidores principales solicitan el historial completo. El calendario carga todas las transacciones y recordatorios aunque se mire un solo mes. El forecast carga todos los planes históricos; analytics y presupuestos traen filas para agrupar en memoria. La billetera hace una agregación por cada tarjeta: patrón N+1.

No se midió latencia ni carga, por lo que no corresponde afirmar que la aplicación hoy sea lenta. Sí hay crecimiento de memoria y volumen de respuestas previsible con el historial. `page` no tiene un máximo, y la ordenación de páginas no incluye desempate por ID.

**Dirección:** paginación obligatoria y contrato uniforme, rangos de fechas para calendario, agregaciones de base y consultas agrupadas cuando aporten. Validar con un conjunto de datos representativo antes de optimizar detalles de render.

### F20. Los correos aún no se envían

Ubicación: `api/src/notifications/notifications.service.ts:60`.

El método de envío hace `await Promise.resolve()`, escribe un log y deja pendiente la integración. No hay dependencia Resend ni invocación a su API en el árbol auditado. Tener `RESEND_API_KEY` en el ejemplo no implementa el servicio.

**Dirección:** marcarlo como pendiente en la presentación o implementar envío con manejo de fallos, idempotencia y configuración de zona horaria. No mostrar la característica como terminada. Los logs actuales incluyen email y título financiero del recordatorio; al implementar observabilidad conviene minimizar y redactar esos datos.

### Operación aún no acreditada

Hay una base de healthcheck y cierre del pool. Faltan evidencias de despliegue reproducible de API/web, política de migraciones, monitoreo de errores, backup/restauración y gestión de configuración. La ausencia de Dockerfiles para ambas apps no es necesariamente un defecto si se usan plataformas administradas; sí hace falta documentar el método real.

El requisito “Node >=20.x” es demasiado amplio: Prisma instalado exige `^20.19 || ^22.12 || >=24.0`. Conviene declarar `engines` y una versión de desarrollo/CI coherente. El build web descarga fuentes de Google en compilación; tenerlo en cuenta para entornos con red restringida o usar fuentes locales si la reproducibilidad offline es un objetivo.

## 9. Frontend, UX y accesibilidad

### F17. Un error de carga se puede interpretar como estado financiero real

Ubicaciones: `web/src/hooks/useDashboard.ts:18`, `DashboardStats.tsx`, hooks de listas y páginas de analytics/forecast.

El dashboard convierte fallos del resumen en `null` y de recordatorios en `[]`; sus componentes muestran $0 y ausencia de alertas. Un usuario puede interpretar que no tiene gastos/vencimientos cuando la API falló. Otras listas dejan un array vacío y algunos errores terminan en una pantalla en blanco.

Al cambiar el mes de presupuesto u horizonte de forecast, se conserva información anterior sin un estado visual de actualización consistente; si falla la nueva petición puede quedar el período elegido junto a datos previos. Varias recargas capturan errores internamente y la mutación muestra éxito aunque la pantalla no se haya sincronizado.

En edición de transacciones, borrar el texto de una nota envía `undefined`; JSON omite el campo y no limpia la nota guardada. El DTO/servicio ya permiten otras semánticas posibles, pero el cliente no las usa coherentemente.

**Dirección:** estados diferenciados de carga, vacío, error, desactualizado y éxito; reintento visible; conservar el motivo útil del error sin filtrar datos sensibles. En dominios monetarios no usar cero como sustituto de “no se pudo obtener”. Los booleanos `isMounted` evitan actualizar estado al desmontar, pero no cancelan la petición: la documentación debe usar ese término con precisión.

### F23. Accesibilidad parcial

Ubicaciones: `web/src/components/ui/Modal.tsx`, formularios de auth/transacciones/tarjetas/categorías/recordatorios, `PaidReminders.tsx`, enlaces con solo iconos de `DashboardHeader.tsx`.

El modal tiene rol, nombre, Escape y bloqueo de scroll: son buenas bases. Le falta gestión de foco inicial, contención de Tab, devolución de foco al disparador y aislamiento del fondo mediante inert o una solución equivalente. `aria-modal` no implementa esos comportamientos.

Muchos labels se muestran como hermanos del input sin `htmlFor`/`id`. Hay selectores de iconos y algunos botones/enlaces solo visuales sin nombre accesible. Estados de pestaña/selección y acordeones carecen de atributos como `aria-pressed`, `aria-selected` o `aria-expanded`, según corresponda. No hay una política explícita para movimiento reducido.

**Dirección:** completar semántica y navegación por teclado, preferir una implementación de diálogo probada y verificar manualmente. La revisión de código no permite certificar contraste, tamaño de blancos táctiles o cumplimiento WCAG.

### F25. Terminación visual y detalles de producto

Observaciones P3 y decisiones a validar en navegador:

- Dashboard está deliberadamente limitado a `max-w-md`, también en escritorio. Puede ser una decisión de producto móvil; conviene explicarla y demostrar que sigue siendo cómodo en desktop, en lugar de presentarlo como adaptación completa sin comprobar.
- `pb-safe` y `scrollbar-hide` se usan sin una definición visible en el CSS/configuración auditados. Comprobar safe areas y comportamiento en dispositivos reales.
- Unos botones de acción se ocultan por opacidad en desktop sin un tratamiento de foco equivalente en todos los componentes.
- La calculadora de reintegros no limita porcentajes a 0–100 ni montos a valores no negativos; puede mostrar costos/reintegros sin sentido. Incorporar límites y formato monetario consistente.
- El calendario incluye recordatorios pagados en sus marcas y detalle sin comunicar claramente ese estado.
- Metadata OpenGraph conserva una URL fija aunque se configure `NEXT_PUBLIC_SITE_URL`; revisar además que la imagen social corresponda a las dimensiones declaradas.
- Hay comentarios conversacionales y de pasos intermedios (“acá está la magia”, “nuevo”, “chau any”) que conviene sustituir por explicaciones del motivo cuando aporten valor.
- `CardCarrousel.tsx` exporta `CardCarousel`: unificar el nombre. Centralizar variantes/formatos repetidos cuando reduzca ruido, sin abstraer por obligación.
- Se usa `@nestjs/mapped-types: "*"`: el lockfile fija la instalación actual, pero el manifest expresa una compatibilidad demasiado abierta.

## 10. Documentación y presentación ante un reclutador

### F24. Alinear las afirmaciones con lo demostrable

La documentación principal está trabajada y ayuda a entender el producto. Precisamente por eso, las afirmaciones fuertes que no coinciden con el código resultan visibles en una revisión técnica.

| Afirmación actual | Lo comprobado | Ajuste necesario |
|---|---|---|
| Cuotas imputadas según cierre personalizado/habitual | Se generan en el día de compra de cada mes | Corregir motor o acotar la afirmación |
| Uso de `calculateInstallmentPlan` y `$transaction` explícito | Existe `InstallmentCalculator.calculate` y `createMany` | Actualizar nombres y explicar la garantía real |
| Aritmética financiera exacta | Persistencia decimal, cálculo JS con un caso negativo reproducido | No equiparar columna decimal con exactitud de todo el dominio |
| Resend integrado | Método de envío pendiente | Marcar como roadmap o implementar |
| Hooks con cancelación segura | Principalmente booleanos para omitir setState | Distinguir cancelación de ignorar resultados |
| Protección de rutas con JWT | Middleware decodifica; API sí verifica firma | Precisar la responsabilidad de cada capa |
| Tope de 72 caracteres resuelve el límite bcrypt | El límite relevante es de bytes UTF-8 | Corregir DTO y explicación |
| `useDashboardData.ts` en README web | El hook actual es `useDashboard.ts` | Actualizar referencia |
| Alertas de presupuesto al superar límites | Algunas superaciones se ocultan al redondear | Corregir condición y documentar igualdad/exceso |

En la pantalla de privacidad se usa “contraseñas encriptadas”; bcrypt produce un hash. También se muestran términos internos como Anti-IDOR a usuarios finales. Explicar que cada persona solo accede a sus datos suele comunicar mejor que trasladar el nombre del control técnico a la UI.

### Lectura de contratación

**Para un perfil junior full stack:** es un proyecto con suficiente amplitud para justificar una entrevista técnica. Las señales favorables son dominio claro, implementación vertical, módulos reconocibles y capacidad de conectar backend/frontend. Lo que restaría puntos es no reconocer los fallos de borde o defender el README por encima del comportamiento real.

**Para un perfil intermedio:** el alcance de funcionalidades por sí solo no acredita el nivel. Se esperaría precisión en contratos, autenticación, integridad histórica, errores, pruebas y operación. Es justamente donde están las brechas actuales.

**Para un perfil senior:** no alcanza con el stack ni con etiquetas de arquitectura. Haría falta mostrar decisiones con tradeoffs, estrategia de consistencia, riesgos conocidos, migraciones seguras y evidencias de operación. No hace falta introducir infraestructura compleja para demostrar ese criterio.

Estas son valoraciones técnicas del artefacto, no una predicción de contratación ni una evaluación integral de la experiencia de su autor.

### Qué debería poder ver una persona que entra al portfolio

1. Una explicación breve del problema y del público al que ayuda Lumi.
2. Capturas o video de un recorrido real, con datos ficticios y una demo fácil de explorar.
3. Un camino de prueba con categorías, tarjetas, cuotas y presupuestos ya disponibles o un seed documentado. En el repo no se encontró un seed ni modo demo.
4. Dos o tres decisiones de ingeniería con su motivo, limitaciones y evidencia: por ejemplo, fechas de tarjetas, aislamiento por usuario y reparto de centavos.
5. Instrucciones verificadas desde cero y un CI que ejecute lo que declara.
6. Un alcance honesto: qué funciona, qué está estimado y qué falta. Esto aumenta la credibilidad técnica.
7. Autoría y contribución personal claras. Si hubo asistencia o trabajo en equipo, poder explicar y defender cada decisión principal.

Una licencia pública y guías de contribución pueden resultar útiles según el objetivo del repositorio; no son requisitos universales para un portfolio personal. `private` o `UNLICENSED` en package.json no indican por sí mismos un problema técnico.

## 11. Condiciones para darlo por listo para presentar

Esto es un conjunto de criterios de aceptación para preparar el plan posterior, no un cronograma ni una implementación ya autorizada.

- Los flujos OAuth no aceptan un intento ajeno y la vinculación de identidades no conserva un acceso local no verificado.
- Se actualizan las dependencias expuestas y se documentan las alertas restantes con condiciones verificadas.
- Una compra conserva su total en centavos y no genera cuotas negativas; cierres y vencimientos tienen una regla coherente en todas las pantallas.
- Borrar/archivar tarjetas o editar categorías no altera silenciosamente el significado del histórico.
- Fechas y períodos producen el mismo resultado de negocio en UTC y UTC−3.
- Payloads inválidos reciben errores de cliente previsibles; los contratos documentan null, dinero y fechas.
- CI pasa en un checkout sin `.env` local y cubre tipos de tests, migraciones y al menos un flujo integrado relevante.
- Las fallas de red no se muestran como una situación financiera válida.
- Los componentes centrales se pueden usar con teclado y sus controles tienen nombres accesibles.
- README, demo y estado real de notificaciones/forecast coinciden.

## 12. Evidencias y reproducción

Archivos de esta carpeta:

- `diagnosticos.cjs`: reproducciones con datos sintéticos, servicios simulados, ValidationPipe real, bcrypt real y SQL de las migraciones en PostgreSQL WASM en memoria. No carga `.env` ni abre conexiones de red. No sustituye una suite e2e.
- `resultados.json`: salida del diagnóstico ejecutado sobre esta revisión.
- `dependencias.json`: resúmenes del registro npm, separación completo/omit-dev, propuestas de actualización y enlaces a advisories. Es una fotografía de la fecha, no una lista que deba permanecer estática.

Desde la raíz, para reproducir los diagnósticos con las dependencias instaladas:

```powershell
Set-Location api
npm run build
Set-Location ..
node docs/auditoria-2026-10-30/diagnosticos.cjs
```

El diagnóstico SQL aprovecha PGlite ya presente como dependencia transitiva de la instalación auditada. No se añadió como dependencia del producto. Si una actualización lo retira, esa comprobación deberá trasladarse al entorno de integración PostgreSQL del proyecto.

Verificaciones independientes, dentro de `api/`:

```powershell
node node_modules/eslint/bin/eslint.js "{src,apps,libs,test}/**/*.ts"
node node_modules/typescript/bin/tsc --noEmit --incremental false
node node_modules/typescript/bin/tsc --project tsconfig.build.json --noEmit --incremental false --strict
node node_modules/jest/bin/jest.js --runInBand --coverage
npm run build
npm audit --json
npm audit --omit=dev --json
```

Dentro de `web/`:

```powershell
npm run lint
node node_modules/typescript/bin/tsc --noEmit --incremental false
npm run build
npm audit --json
npm audit --omit=dev --json
```

La comprobación de CI se hizo con `DOTENV_CONFIG_PATH` apuntando a un archivo inexistente, `DATABASE_URL` de prueba y `DIRECT_URL` ausente, ejecutando Prisma generate. Esos cambios fueron variables del proceso de verificación; los `.env` del proyecto no se editaron.
