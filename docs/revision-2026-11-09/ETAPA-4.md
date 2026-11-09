# Etapa 4: recurrencia, proyección y notificaciones

## C13 — Ocurrencias mensuales

Se separan reglas y vencimientos con clave única regla/período. Se preservan ID, importe, fecha y pago del recordatorio existente. La generación compartida por calendario, forecast y cron ajusta fin de mes sin desplazar el día ancla. Pagar una ocurrencia no paga las siguientes.

Política confirmada por el autor: conservar pagos y actualizar futuras impagas. Editar título/importe preserva los vencidos; actualiza los próximos pendientes y la plantilla. Detener la regla cancela próximos impagos y conserva pagos y vencidos. No se permite borrar pagos registrados ni reactivar una serie detenida: se crea otra.

Validación: 77 unitarios; pruebas PostgreSQL de migración conservadora, generación concurrente, enero 31/febrero, cambio de año, pago histórico y detención. Migración aditiva y tabla privada con RLS. Sin envío real de correos.

## C14 — Base de ingresos y significado de las métricas

Sin historial, el fallback incluye únicamente ingresos del mes actual, independientemente del horizonte. Con historial se conserva el promedio de los meses con ingresos entre los tres meses completos anteriores. Sin ingreso positivo, ratio y promedio son null y ratioStatus es no_income; la UI muestra ausencia de base. Los ratios calculables pueden superar 100%.

elapsedInstallments cuenta cuotas cuyo período pasó, sin afirmar pago; paidInstallments queda temporalmente como alias de compatibilidad para el despliegue independiente. La UI usa el nombre nuevo. Se corrige también el año de finalización para usar vencimiento de pago.

Pruebas: horizontes 3/6/12, ingreso solo futuro, compromiso 150%, ausencia de ingresos con/sin obligaciones y cuota transcurrida sin pago confirmado.
