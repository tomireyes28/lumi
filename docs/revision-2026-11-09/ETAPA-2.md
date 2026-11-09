# Etapa 2: autenticación persistente

## C03 · Sesiones

Los JWT nuevos identifican una fila AuthSession privada. La API exige una sesión vigente del mismo usuario y consulta su revocación en PostgreSQL en cada petición. Logout espera la escritura antes de responder. Los tokens heredados sin fila de sesión requieren reingreso una vez. El esquema es aditivo y no modifica datos financieros.

Validado con tipos, lint, 73 unitarios, tres pruebas HTTP y seis escenarios de PostgreSQL real. La regresión crea una sesión, reconstruye AuthService, revoca desde otra instancia y comprueba rechazo desde ambas. La migración habilita RLS sin políticas públicas y conserva el acceso del propietario.

La etapa se publica completa al finalizar C03–C07; los commits intermedios no disparan despliegue.

## C04 · Vinculación Google

Se exige subject y email positivamente verificado. La vinculación y revocación son una transacción serializable con reintento de conflictos. Una versión de autenticación permite rechazar también una sesión local emitida durante la vinculación usando credenciales anteriores. La nueva sesión del propietario continúa válida. La regresión real cubre ambas sesiones, subject diferente y verificación ausente.

## C05 · OAuth compartido

Códigos y nonces aleatorios se guardan por hash en OAuthGrant, con TTL y consumo DELETE RETURNING atómico. PKCE queda en PostgreSQL privado; la URL lleva un identificador opaco. La cookie HttpOnly de Railway mantiene la vinculación del navegador. La regresión real prueba canje entre instancias, dos consumos concurrentes con un ganador, replay, estado ajeno y expiración. Un job horario elimina únicamente sesiones y grants vencidos.
