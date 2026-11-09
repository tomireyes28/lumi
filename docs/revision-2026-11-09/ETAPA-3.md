# Etapa 3 · Fechas y motor financiero

Política acordada: los cambios de cierre/vencimiento se aplican a compras nuevas. Las cuotas registradas conservan el resumen y vencimiento asignados. Una reclasificación posterior requiere una acción explícita.

## C08 · Calendario de negocio

Zona IANA única: America/Argentina/Buenos_Aires. Una fecha YYYY-MM-DD representa un día calendario y se ancla al mediodía de Buenos Aires; un ISO con Z/offset es un instante. Entradas imposibles se rechazan; el ajuste deliberado de fin de mes usa otro helper. Los períodos usan intervalos semiabiertos de medianoche local a medianoche local siguiente, sin depender del TZ del host. El frontend distingue fechas de widgets, instantes y fechas calendario heredadas.

Regresión ejecutada en procesos UTC y Buenos Aires: instante 2026-01-26T01:00Z, inicio de mes/año, bisiestos, fechas inválidas y ventana de notificaciones. Los tests no envían correo.

Inspección inicial de producción, solo agregados: 103 movimientos, ninguno a medianoche UTC; dos recordatorios, ambos a medianoche UTC; cero ciclos personalizados. Los campos calendario heredados a medianoche UTC conservan su etiqueta original mediante compatibilidad explícita. La siguiente migración agrega una fecha calendario a Reminder sin alterar el timestamp original. No se interpreta la fecha de una cuota antigua como fecha de compra.
