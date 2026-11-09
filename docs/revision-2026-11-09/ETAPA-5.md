# Etapa 5 · Frontend y contratos

## C16 — Paginación completa

El historial conserva meta y navega páginas de cien registros; cambiar el filtro vuelve a la primera página. El calendario reúne todas las páginas del mes con concurrencia máxima de dos, comparte una consulta en curso del mismo mes y no guarda resultados parciales. Rechaza errores, IDs duplicados y cambios en totales durante la colección para poder reintentar. No introduce una dependencia de rutas nuevas durante el despliegue.

El forecast busca IDs de planes que aún tienen vencimientos desde el mes actual y solo carga el histórico de esos planes. Conserva el contrato anterior y evita cargar planes completamente transcurridos. El endpoint ilimitado sigue temporalmente disponible para compatibilidad.

Validación: regresiones de 101 y 201 movimientos en distintos días, error en segunda página y reintento; navegador Chromium en escritorio/móvil para avanzar, retroceder, filtrar y ver el movimiento 201 en calendario. PostgreSQL real confirma que se conservan planes activos y se excluyen finalizados. Playwright usa solo una API sintética; su servidor local apunta a un puerto cerrado para impedir acceso accidental al backend real. CI incorpora estas pruebas de interfaz.
