# Etapa 4: recurrencia, proyección y notificaciones

## C13 — Ocurrencias mensuales

Se separan reglas y vencimientos con clave única regla/período. Se preservan ID, importe, fecha y pago del recordatorio existente. La generación compartida por calendario, forecast y cron ajusta fin de mes sin desplazar el día ancla. Pagar una ocurrencia no paga las siguientes.

Política confirmada por el autor: conservar pagos y actualizar futuras impagas. Editar título/importe preserva los vencidos; actualiza los próximos pendientes y la plantilla. Detener la regla cancela próximos impagos y conserva pagos y vencidos. No se permite borrar pagos registrados ni reactivar una serie detenida: se crea otra.

Validación: 77 unitarios; pruebas PostgreSQL de migración conservadora, generación concurrente, enero 31/febrero, cambio de año, pago histórico y detención. Migración aditiva y tabla privada con RLS. Sin envío real de correos.

## C14 — Base de ingresos y significado de las métricas

Sin historial, el fallback incluye únicamente ingresos del mes actual, independientemente del horizonte. Con historial se conserva el promedio de los meses con ingresos entre los tres meses completos anteriores. Sin ingreso positivo, ratio y promedio son null y ratioStatus es no_income; la UI muestra ausencia de base. Los ratios calculables pueden superar 100%.

elapsedInstallments cuenta cuotas cuyo período pasó, sin afirmar pago; paidInstallments queda temporalmente como alias de compatibilidad para el despliegue independiente. La UI usa el nombre nuevo. Se corrige también el año de finalización para usar vencimiento de pago.

Pruebas: horizontes 3/6/12, ingreso solo futuro, compromiso 150%, ausencia de ingresos con/sin obligaciones y cuota transcurrida sin pago confirmado.

## C15 — Registro persistente y reintentos

NotificationDelivery conserva una fila por ocurrencia/evento, contenido inmutable, intentos, reserva con token, próxima ejecución, aceptación del proveedor y código de resultado. accepted significa aceptación HTTP por Resend, no entrega al buzón. No se registran destinatarios, títulos, claves ni respuestas del proveedor en logs.

El job consulta vencimientos de Buenos Aires cada diez minutos desde las 9; procesa reintentos también antes de esa hora. Hace como máximo ocho intentos con timeout de diez segundos y backoff desde un minuto. Respeta Retry-After. Reintenta timeout/transporte, 429, 5xx y conflicto 409. Otros 4xx quedan failed. Pagos/cancelaciones detienen filas pendientes. Una reserva de 60 segundos y token evitan que dos workers confirmen la misma reserva.

La clave due:<occurrence-id> y el cuerpo permanecen iguales tras reinicios o caída después del envío. Los reintentos se cortan a las 23 horas del primer intento y quedan review; una incertidumbre fuera de la ventana de idempotencia requiere revisión manual, sin reenvío automático. Fuente: https://resend.com/changelog/idempotency-keys (retención del proveedor: 24 horas). Cambiar cuenta/API key o eliminar filas aceptadas puede invalidar esa protección y requiere una revisión operativa.

La tabla es privada, con RLS y sin permisos públicos. Su payload contiene los datos del correo y se elimina por cascade al borrar su recordatorio/usuario. No se ofrece un endpoint público de administración.

Configuración externa pendiente de acreditar: el autor no puede confirmar aún la clave, remitente y dominio verificado de Railway/Resend; no hay acceso autenticado al panel ni credenciales locales de correo. Se exige RESEND_API_KEY y RESEND_FROM_EMAIL explícitos; faltando uno, no hay envíos. No se enviaron correos reales ni se afirmó entrega al destinatario. Verificar dominio y variables en el panel antes de activar correo.

## Evidencia previa a publicación

Pasaron tipos y lint de ambos proyectos, builds de producción, 79 unitarios en UTC y Buenos Aires, tres pruebas HTTP, BFF HttpOnly/CSRF y calendario frontend en tres zonas. Los 16 escenarios de integración completos pasaron tanto en PostgreSQL 16/UTC como en 17.6/Buenos Aires, incluyendo instalación, upgrade, privacidad/RLS, dump/restore y outbox con proveedor simulado.

El preflight de producción anterior al despliegue confirmó únicamente las dos migraciones nuevas pendientes, historial existente sin divergencias, rol Prisma con acceso y ningún hallazgo de permisos públicos. Se aplicará expansión aditiva antes de publicar; no se resetea la base ni se reclasifican movimientos heredados.

## Aplicación de esquema

El 09/11 se aplicaron las dos migraciones mediante Prisma migrate deploy. Coincidieron las huellas de todas las columnas originales de User, Category, CreditCard, Transaction, Reminder, Budget y CardCycle antes/después: se conservaron 103 movimientos y dos recordatorios, entre los demás datos existentes. Cero migraciones pendientes, cero divergencias y cero permisos CRUD públicos. No se generaron ocurrencias ni se enviaron correos manualmente sobre usuarios reales.
