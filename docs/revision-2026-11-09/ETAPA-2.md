# Etapa 2: autenticación persistente

## C03 · Sesiones

Los JWT nuevos identifican una fila AuthSession privada. La API exige una sesión vigente del mismo usuario y consulta su revocación en PostgreSQL en cada petición. Logout espera la escritura antes de responder. Los tokens heredados sin fila de sesión requieren reingreso una vez. El esquema es aditivo y no modifica datos financieros.

Validado con tipos, lint, 73 unitarios, tres pruebas HTTP y seis escenarios de PostgreSQL real. La regresión crea una sesión, reconstruye AuthService, revoca desde otra instancia y comprueba rechazo desde ambas. La migración habilita RLS sin políticas públicas y conserva el acceso del propietario.

La etapa se publica completa al finalizar C03–C07; los commits intermedios no disparan despliegue.
