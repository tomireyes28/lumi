# Etapa 3 · Fechas y motor financiero

Política acordada: los cambios de cierre/vencimiento se aplican a compras nuevas. Las cuotas registradas conservan el resumen y vencimiento asignados. Una reclasificación posterior requiere una acción explícita.

## C08 · Calendario de negocio

Zona IANA única: America/Argentina/Buenos_Aires. Una fecha YYYY-MM-DD representa un día calendario y se ancla al mediodía de Buenos Aires; un ISO con Z/offset es un instante. Entradas imposibles se rechazan; el ajuste deliberado de fin de mes usa otro helper. Los períodos usan intervalos semiabiertos de medianoche local a medianoche local siguiente, sin depender del TZ del host. El frontend distingue fechas de widgets, instantes y fechas calendario heredadas.

Regresión ejecutada en procesos UTC y Buenos Aires: instante 2026-01-26T01:00Z, inicio de mes/año, bisiestos, fechas inválidas y ventana de notificaciones. Los tests no envían correo.

Inspección inicial de producción, solo agregados: 103 movimientos, ninguno a medianoche UTC; dos recordatorios, ambos a medianoche UTC; cero ciclos personalizados. Los campos calendario heredados a medianoche UTC conservan su etiqueta original mediante compatibilidad explícita. La siguiente migración agrega una fecha calendario a Reminder sin alterar el timestamp original. No se interpreta la fecha de una cuota antigua como fecha de compra.

## C09 · Fechas explícitas y legado

Transaction incorpora purchaseDate, statementYear/Month, statementClosingDate, paymentDueDate y posición/cantidad de cuotas, todos aditivos y anulables. Los registros anteriores conservan date e importes; sus campos desconocidos permanecen null. date sigue disponible: en movimientos nuevos representa la fecha de contabilización (cierre para tarjeta, compra para efectivo). Las interfaces usan los campos explícitos cuando existen y conservan el fallback legado.

Reminder incorpora dueOn de tipo PostgreSQL DATE. La migración conserva la etiqueta calendario de la codificación antigua UTC a medianoche y el día de Buenos Aires para otros instantes; no cambia dueDate. Las consultas mensuales y el cron usan esa columna calendario, con fallback para escrituras de una API anterior durante el despliegue. El preflight informa cuántos movimientos siguen siendo heredados; es un diagnóstico en lectura, no una reclasificación automática.

Instalación, upgrade con fixtures anteriores y dump/restore pasaron en PostgreSQL 16. Se verificó que compras/ciclos antiguos permanecen desconocidos y que el recordatorio a medianoche conserva su día y timestamp original.

## C10 · Resumen y vencimiento por cuota

Un único calendario calcula cierre, límite de día, período y vencimiento. La primera cuota usa el ciclo de compra y las siguientes usan períodos consecutivos, consultando cada cierre personalizado. Se preserva purchaseDate; date mantiene la imputación compatible al cierre. Billetera agrupa por resumen explícito y forecast por paymentDueDate. Para registros heredados, el forecast conserva el fallback de date y muestra su carácter estimado.

La regresión R03 (20/01, cierre habitual 25, febrero con cierre 10) produce resúmenes enero/febrero/marzo sin colisiones y pagos febrero/marzo/abril. Se verificaron con Prisma real billetera, forecast, conservación de centavos y que cambiar cierres/vencimientos no reescribe cuotas existentes. Los escenarios de calendario y cuotas pasan en UTC y Buenos Aires.

## C11 · Estado final de cada PATCH

La edición se serializa sobre el movimiento y valida siempre categoría, tarjeta y medio de pago finales. Se rechazan tanto categoría de ingreso sobre tarjeta existente como tarjeta sobre un ingreso existente. La referencia y el medio se escriben en un único UPDATE escalar: una regresión con PostgreSQL detectó que dos escrituras de relación separadas podían activar el trigger dejando credit_card al desconectar.

La edición temporal mueve únicamente ese movimiento al ciclo de la fecha indicada. referenceDate conserva la entrada usada para poder reasignar una tarjeta después; purchaseDate no se reescribe ni se infiere para registros heredados. Nota/importe solos no recalculan las fechas ya asignadas. El formulario diferencia fecha de compra al crear y referencia individual al editar. La regresión real cubre ambas variantes ingreso/tarjeta, cambio de fecha/tarjeta, desconexión, fechas inválidas, aislamiento y conservación de otras cuotas.

## C12 · Integridad concurrente

Creación de movimientos/presupuestos y edición/borrado de categorías comparten transacciones Serializable y bloqueos de categoría del usuario. PATCH bloquea primero el movimiento y ordena los bloqueos de categorías. Los conflictos de Prisma y del adaptador pg (SQLSTATE 40001/40P01) se reintentan hasta tres veces y terminan en 409 controlado si persisten. Las categorías con movimientos o presupuestos no se borran ni cambian de tipo; retirar una cuota de tarjeta a efectivo la excluye del plan para no proyectarla otra vez como deuda.

La base conserva FK RESTRICT de movimientos, claves únicas y comprobaciones de período/posición; la pertenencia al usuario y las reglas ingreso/tarjeta se sostienen en la frontera de servicios y el protocolo transaccional. La arquitectura confirmada accede exclusivamente por Railway/Prisma. Un futuro escritor directo debe adoptar este protocolo o reforzar esas reglas en base antes de incorporarse. No se simulan asociaciones como cero cuando falta un método de Prisma en un mock.

La regresión usa dos clientes/conexiones de PostgreSQL y repite carreras de creación/cambio de tipo, presupuesto/cambio de tipo, creación/borrado y dos PATCH parciales. Se comprueba consistencia y rechazos controlados, sin aceptar un 500 como resultado válido.

## Evidencia previa al push

Pasaron tipos, lint, ambos builds, 77 unitarios, tres pruebas HTTP rápidas, 15 regresiones de fechas en cada TZ (UTC y Buenos Aires), 13 escenarios de PostgreSQL por entorno (16/UTC y 17.6/Buenos Aires), los tres tests HttpOnly/CSRF y el test frontend de fechas en UTC/Buenos Aires/Auckland. Se repitió la regresión dirigida de PATCH/concurrencia tras el último ajuste.

El 09/11 se aplicaron las dos migraciones nuevas mediante Prisma migrate deploy. Las huellas de todas las columnas originales de las siete tablas de dominio coincidieron antes/después. Cero migraciones pendientes, cero divergencias activas, cero permisos CRUD públicos. Se conservaron 103 movimientos (102 de tarjeta) como heredados sin inventar compra/ciclo; los dos recordatorios quedaron con fecha calendario explícita. No se reinició la base.

Publicación: ambos proveedores siguen main y se verifican sus SHA después del push. Los campos y el formulario son compatibles con una API anterior durante el despliegue. Ante fallos, conservar el esquema aditivo y los datos; no hacer reset ni una reclasificación masiva. Una corrección de fechas históricas requiere revisar por separado un diagnóstico concreto y su reversión.
