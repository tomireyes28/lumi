// web/src/lib/api.ts

export async function apiFetch(path: string, options: RequestInit = {}) {
  // 1. Agarramos el token
  const token = typeof window !== 'undefined' ? localStorage.getItem('lumi_token') : null;

  // 2. Configuramos las cabeceras
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // 3. URL Dinámica (Leemos el .env, y si no está, usamos localhost de respaldo)
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'; // <-- Ajustá el puerto al de tu backend (3001 o 3000)

  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers,
  });

  // 4. NUEVO: Interceptor de Token Expirado (401 Unauthorized)
  if (response.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('lumi_token'); // Limpiamos el token viejo
      window.location.href = '/'; // Pateamos al usuario a la pantalla de login principal
    }
    throw new Error('Sesión expirada');
  }

  // 5. Manejo de errores genérico
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Error en la petición a la API');
  }

  if (response.status === 204) return null;

  return response.json();
}