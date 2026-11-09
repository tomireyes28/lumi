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
