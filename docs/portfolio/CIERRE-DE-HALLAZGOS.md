# Matriz de cierre · 10/11/2026

El [informe original](../revision-2026-11-09/INFORME.md) se conserva como registro de su fecha. Esta matriz describe el resultado posterior y distingue implementación probada de configuración externa pendiente. La evidencia ejecutable vive en tests; los documentos de cada etapa registran políticas y aplicación de esquema.

| Hallazgo | Resultado actual | Evidencia / límite |
| --- | --- | --- |
| F01 Dependencias | Runtime sin avisos; higiene de desarrollo aplicada | C21: brace/minimatch/glob corregidos. Un advisory bajo de deepmerge se propaga a ocho paquetes de tooling, sin parche publicado |
| F02 OAuth CSRF | Corregido y conservado | OAuthStateStore y pruebas de nonce/cookie/state/PKCE/replay; Google real fue comprobado por el autor en producción |
| F03 Vinculación Google | Corregido | Sesiones previas invalidadas, subject estable y email verificado; regresión de pre-account takeover |
| F04 Cuotas negativas | Corregido | Reparto en centavos, mínimo por cuota, DTO y motor |
| F05 Compra/resumen/pago | Corregido para registros nuevos | C09–C10 y calendario compartido; legado desconocido se conserva, no se inventa |
| F06 Borrado/histórico | Conservado | FK/trigger y bloqueo de borrado con movimientos; pruebas Prisma reales |
| F07 CI/Prisma | Corregido | Cinco jobs y dos motores de PostgreSQL, install/upgrade/restore |
| F08 Validación/PATCH | Corregido | Validación del estado final y ambas variantes ingreso/tarjeta; aislamiento multiusuario |
| F09 Zona horaria | Corregido | Toda la suite unitaria en UTC/Buenos Aires y etiquetas frontend en tres TZ |
| F10 Categoría | Conservado y reforzado | Checks secuenciales y protocolo transaccional concurrente |
| F11 Recurrencia | Corregido | Regla/ocurrencia, clave por período, pago independiente, día 31, generación concurrente y detención |
| F12 Métricas | Corregido | Base de ingreso acotada, ratio null/estado, elapsedInstallments; alias antiguo temporalmente compatible |
| F13 bcrypt | Corregido y conservado | Validación de 72 bytes UTF-8 y multibyte |
| F14 Sesión | Corregido | HttpOnly BFF, revocación persistente, logout confirmado y sincronización del perfil |
| F15 Tipos/contratos | Corregido | Fuente Zod, --check, JSON unknown, DTOs inferidos y noImplicitAny true |
| F16 Pruebas | Ampliado y probado | Unitarios, HTTP, PostgreSQL real, 38 regresiones de UI y recorrido integral en escritorio/móvil |
| F17 Errores | Corregido | useResource, reintento, descarte de respuestas tardías y escritura confirmada seguida de GET fallido |
| F18 Volumen | Corregido en consumidores web | Historial con meta; calendario completo; forecast limita planes activos. Ruta ilimitada legada aún compatible |
| F19 Presupuestos | Corregido | General/categoría comparan centavos; explica plantilla mensual y alcance del total |
| F20 Correo | Implementación corregida; verificación externa pendiente | Outbox/reintentos/timeout/idempotencia probados con mocks. Falta acreditar clave/remitente/dominio y entrega real; no se enviaron pruebas a terceros |
| F21 Concurrencia | Corregido en la arquitectura acordada | Dos clientes PG, locks/Serializable/reintentos y FK. Pertenencia entre usuarios se comprueba en API; un escritor directo requiere diseño adicional |
| F22 Estado compartido | Corregido | Sesiones, grants y rate limits en PostgreSQL, pruebas entre instancias y tras reconstrucción |
| F23 Accesibilidad | Casos detectados corregidos | Labels, teclado, top layer, árbol de accesibilidad y reduced motion. Sin certificación WCAG global |
| F24 Documentación | Actualizada | README principal/API/web, contrato financiero, disponibilidad real de Swagger, demo y decisiones |
| F25 Presentación | Cierre de demo/convenios | Seed local idempotente, capturas sintéticas, proxy y marca social; revisión visual/funcional dirigida |

## Regresiones de la segunda revisión

| Caso | Corrección y evidencia |
| --- | --- |
| R01 / R02 | Sesión anterior al vínculo y revocación tras reinicio: auth + integración |
| R03 | Cierre especial de un mes posterior: calendario financiero + compra real en navegador |
| R04 | 101/201 movimientos y error de página: colección completa + navegador |
| R05 | Ingreso con tarjeta por PATCH en ambas variantes: servicio + PG |
| R06 | Recurrente pagado y siguiente impago: PG + navegador real |
| R07 | Horizonte 3/6/12 e ingreso solo futuro: analítica + contratos |
| R08 | Exceso de $0,01 con 100% redondeado: API + navegador |
| R09 | Misma entrada en UTC/Buenos Aires: suite temporal |
| R10 | Migraciones originales restauradas: checksums, upgrade y preflight |

## Pendientes externos que siguen visibles

- Confirmar en los paneles de Railway/Vercel los comandos y si esperan a CI; el deploy se verifica por SHA y health, pero esa política privada no se infiere de un build verde.
- Confirmar backups/PITR y retención en Supabase antes de depender de recuperación de datos reales. El restore sintético no acredita un backup de producción.
- Confirmar configuración de Resend antes de activar correo. Una prueba de entrega necesita autorización y destinatario del autor.
- Reevaluar el parche upstream de deepmerge y retirar contratos legados mediante una transición versionada cuando no tengan consumidores.
