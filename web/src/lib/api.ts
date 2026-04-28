// web/src/lib/api.ts

export async function apiFetch(path: string, options: RequestInit = {}) {
  // 1. Agarramos el token que guardaste en el login
  const token = typeof window !== 'undefined' ? localStorage.getItem('lumi_token') : null;

  // 2. Configuramos las cabeceras por defecto (JSON y el Token de seguridad)
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // 3. Hacemos la petición al backend (NestJS)
  const response = await fetch(`http://localhost:3000${path}`, {
    ...options,
    headers,
  });

  // 4. Manejo de errores genérico
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Error en la petición a la API');
  }

  // Si la respuesta no tiene contenido (ej: al borrar), devolvemos null
  if (response.status === 204) return null;

  return response.json();
}