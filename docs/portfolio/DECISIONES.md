# Decisiones de ingeniería

| Decisión | Motivo | Coste o límite |
| --- | --- | --- |
| Next BFF con cookie HttpOnly | Evitar que el JS del navegador conserve el JWT y operar con Vercel/Railway en distintos orígenes | Un salto adicional, firma de proxy compartida y Origin válido para mutaciones |
| PostgreSQL para sesión, OAuth, límites y outbox | Mantener garantías entre reinicios/réplicas sin agregar Redis a una demo pequeña | Lecturas/escrituras de seguridad en cada petición; medir carga antes de ampliar escala |
| Prisma como acceso único a tablas | Reutilizar validación/pertenencia en la API y cerrar REST público de Supabase | Un escritor directo futuro debe adoptar las mismas invariantes; RLS no sustituye autorización cuando Prisma hace bypass |
| Centavos para reparto y umbrales | Evitar cuotas negativas, pérdida del resto y exceso oculto por redondeo | API acepta importes de hasta dos decimales y PostgreSQL almacena DECIMAL(10,2) |
| Calendario de negocio explícito | Que UTC del host no cambie resumen, mes o cron | Distinguir Date de instante y etiqueta calendario; pruebas en dos TZ |
| Fechas de compra/resumen/pago separadas | Proyectar vencimientos en lugar de usar el cierre como fecha de pago | Las fechas históricas ya perdidas quedan desconocidas; no se reconstruyen automáticamente |
| Regla mensual y ocurrencia única por período | Un pago no debe anular meses futuros y dos workers no deben crear duplicados | Materializar ocurrencias agrega filas; las ediciones preservan pagos y vencidos |
| Serializable, bloqueo y reintento acotado | Proteger cambios de categorías frente a escrituras concurrentes | Conflictos persistentes terminan en 409; no se prometen escrituras ilimitadas sin contención |
| Outbox con cuerpo y clave estables | Recuperarse de errores y de una caída después de aceptación del correo | La idempotencia del proveedor vence a las 24 h; se detiene a las 23 h y requiere revisión manual ante incertidumbre |
| Contrato canónico copiado a dos raíces | Compartir DTOs/validación sin cambiar las raíces de deploy de Vercel/Railway | Copias generadas verificadas por CI; Swagger de respuestas aún no se genera desde Zod |
| Modo ilimitado conservado temporalmente | Mantener compatibilidad con consumidores previos | Web usa páginas; el endpoint legado sigue disponible hasta una retirada versionada |
| Diálogo nativo y preferencia de movimiento | Usar top layer/fondo inerte y evitar reinicios de foco | QA dirigido de Chromium; no equivale a certificación WCAG ni cobertura de todos los lectores |

## Límites que conviene explicar en una entrevista

Los presupuestos son plantillas comunes a todos los meses. La proyección no confirma pagos de tarjeta ni conecta a bancos. El ingreso estimado depende del historial disponible. Las cuotas pasadas se llaman transcurridas, no pagadas. La recomendación de tarjeta maximiza días al cierre, no calcula costo financiero ni promociones.

El sistema de correo está probado con proveedor simulado y estado persistente, pero la configuración externa y la entrega real no se acreditaron. Tampoco se acreditaron backup/PITR de producción ni la espera de CI configurada en proveedores. El usuario autorizó las migraciones previas sin backup; eso no se transforma en una garantía de recuperación.

Las dependencias de producción no tienen avisos npm en la comprobación del 10/11/2026. Permanece el aviso bajo de deepmerge en herramientas, detallado en ETAPA-6; no se oculta ni se resuelve con un downgrade incompatible de Jest/Nest CLI.
