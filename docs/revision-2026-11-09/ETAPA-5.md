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
