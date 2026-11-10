# Etapa 5 · Frontend y contratos

## C16 — Paginación completa

El historial conserva meta y navega páginas de cien registros; cambiar el filtro vuelve a la primera página. El calendario reúne todas las páginas del mes con concurrencia máxima de dos, comparte una consulta en curso del mismo mes y no guarda resultados parciales. Rechaza errores, IDs duplicados y cambios en totales durante la colección para poder reintentar. No introduce una dependencia de rutas nuevas durante el despliegue.

El forecast busca IDs de planes que aún tienen vencimientos desde el mes actual y solo carga el histórico de esos planes. Conserva el contrato anterior y evita cargar planes completamente transcurridos. El endpoint ilimitado sigue temporalmente disponible para compatibilidad.

Validación: regresiones de 101 y 201 movimientos en distintos días, error en segunda página y reintento; navegador Chromium en escritorio/móvil para avanzar, retroceder, filtrar y ver el movimiento 201 en calendario. PostgreSQL real confirma que se conservan planes activos y se excluyen finalizados. Playwright usa solo una API sintética; su servidor local apunta a un puerto cerrado para impedir acceso accidental al backend real. CI incorpora estas pruebas de interfaz.

## C17 — Consultas y mutaciones con estados diferentes

Un recurso compartido conserva loading/error/datos por clave y descarta respuestas obsoletas. Cambiar de período oculta inmediatamente los datos anteriores y cancela sus consultas; el timeout sigue vigente aunque se pase un AbortSignal externo. Calendario, billetera, categorías, recordatorios e historial muestran error con recarga. Los presupuestos usan la misma protección por período.

Las mutaciones confirmadas restablecen el formulario y una recarga fallida muestra «El cambio se guardó… No repitas la operación», con reintento de GET. La recarga devuelve un resultado explícito y no cae en el catch de la escritura. No se presenta como lista vacía una consulta fallida.

Validación en Chromium escritorio/móvil: API 503 en las cuatro pantallas, recuperación, timeout, cambio rápido de mes con respuesta tardía y POST aceptado seguido de GET fallido (un solo POST). Pasaron los 18 recorridos de UI, tipos, lint y build.

## C18 — Umbrales en centavos

El resumen general compara gasto y límite en centavos para exceso y 75%; el porcentaje redondeado queda solo para presentación. La API suma centavos por categoría y devuelve overallStatus aditivo. El frontend calcula el estado con importes para ser compatible con Railway anterior durante el rollout.

Se aclara que el total incluye solo categorías presupuestadas y que los límites son plantillas mensuales: editarlos afecta consultas de otros meses. Las regresiones cubren 100,01/100 (exceso aunque muestre 100%), 74,99/100, 75/100 y el límite exacto. API y seis pruebas de navegador escritorio/móvil confirman coincidencia entre categoría y resumen general.

## C19 — Contratos verificables y tipado estricto

contracts/http.ts es la fuente canónica de DTOs de respuesta y validadores Zod. scripts/sync-contracts.cjs copia esa fuente en las raíces de deploy de API y web; CI rechaza diferencias con --check. Los tipos de entidades de lectura del frontend y las métricas de API se infieren de esos esquemas, separados de los inputs de edición y estados de formulario.

El cliente trata JSON como unknown y valida las lecturas financieras antes de exponerlas a componentes. Cubre listas y meta de paginación, entidades Decimal como string/number, totales calculados finitos, fechas ISO y nulabilidad explícita; los extras aditivos son compatibles. Un payload incompleto genera error visible. Las escrituras ya confirmadas cuyo cuerpo no se utiliza no se consideran fallidas por un cambio de cuerpo. Auth local, Google, bootstrap de sesión y perfil validan el usuario; BFF no crea cookie con un perfil inválido. La API valida la representación HTTP de Date/Decimal con el mismo contrato mediante un interceptor; los fallos se registran sin payload ni datos personales.

noImplicitAny queda activado; se corrigió el mock transaccional recursivo que impedía inferir su retorno. Se retiraron las interfaces duplicadas de lectura y la recomendación del dashboard ya no disfraza errores como ausencia de tarjeta.

Validación: tipos y lint, contratos Decimal/null/paginación incompleta, usuario inválido sin cookie, rechazo visible de JSON financiero/auth incorrecto en escritorio/móvil, HTTP API con interceptor, pruebas PostgreSQL y restauración aislada. Compatibilidad adicional contra la API de etapa 4 aún desplegada: once consultas validadas y 201 movimientos en tres páginas, con cuenta sintética eliminada al terminar y sin emails. No se cambia el esquema de base en esta etapa.

## C20 — Etiquetas y diálogo modal

Auth asocia Nombre/Email/Contraseña con sus controles y autocomplete. Presupuestos asocia el importe y el grupo de categorías, con estado seleccionado accesible. La navegación principal tiene nombre y página actual; el botón de edición de categoría identifica su categoría.

El diálogo usa showModal y la capa superior nativa del navegador: el fondo queda inerte y la navegación fija no lo tapa. La apertura enfoca el primer campo, Tab/Shift+Tab ciclan dentro, Escape/cierre devuelven foco al disparador y un nuevo callback de onClose no reinicia el foco al escribir. Se conservan scroll y cierre por fondo. MotionConfig respeta la preferencia del sistema y los botones compartidos desactivan hover/tap con escala cuando se pide reducir movimiento.

Validación Chromium escritorio/móvil: etiquetas y autocomplete, teclado, intento de foco en navegación bloqueado, top layer, árbol real de accesibilidad sin navegación de fondo, importe que conserva foco al escribir, Escape y retorno al disparador, y movimiento reducido sin transformaciones de botones. Se inspeccionaron capturas del diálogo en ambas resoluciones. Esto acredita las comprobaciones dirigidas; no se declara una certificación WCAG de toda la aplicación.

## Verificación final previa al push

Pasaron builds, lint y tipos de ambos proyectos; 85 unitarios de API en UTC y Buenos Aires, tres escenarios HTTP, doce pruebas unitarias/BFF de frontend y 36 recorridos de Chromium (18 escritorio + 18 móvil). Las 16 integraciones se validaron con PostgreSQL 16 y 17.6, incluyendo restauración, RLS, finanzas y outbox; no se enviaron correos reales. La sincronización de contratos pasa --check. npm audit --omit=dev informa cero vulnerabilidades de producción en ambos proyectos; las herramientas de desarrollo pendientes corresponden a la etapa 6.

Se comprobó la compatibilidad con Railway de etapa 4 antes del push, con once consultas y 201 movimientos sintéticos. La cuenta fue eliminada. Esta etapa no agrega migraciones ni requiere reset o modificación de datos existentes. Tras publicar se verifican CI, SHA servido por ambos proveedores y el recorrido de paginación/modal en producción con otra cuenta sintética aislada.

## Corrección adicional del calendario durante el cierre

La revisión final encontró que navegar a otro mes conservaba una selección del mes anterior; filtrar datos del mes nuevo por ese día podía mostrar un vacío engañoso. La regresión nueva lo reprodujo antes del cambio. Al cambiar de mes se selecciona ahora su primer día, conservando la selección si ya pertenece al período. El widget comprueba Date en lugar de forzar el tipo de su evento.

El fixture del navegador ahora devuelve fechas del mes realmente pedido, para detectar esta discrepancia. Pasaron lint, build y veinte recorridos dirigidos de paginación/errores en escritorio y móvil, incluida la respuesta tardía de un período anterior. Se publica como corrección adicional en un commit nuevo, conservando el historial ya enviado.
