import { useAuthStore } from '@/store/useAuthStore';

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
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  const response = await fetch(`${apiUrl}${path}`, {
    signal:
      options.signal ||
      (typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal
        ? AbortSignal.timeout(10000)
        : undefined),
    ...options,
    headers,
  });

  // 4. Interceptor de Token Expirado (401 Unauthorized)
  if (response.status === 401) {
    if (typeof window !== 'undefined') {
      useAuthStore.getState().logout();
      window.location.href = '/';
    }
    throw new Error('Sesión expirada');
  }

  // 5. Manejo de errores genérico
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const rawMessage = errorData.message;
    const formattedMessage = Array.isArray(rawMessage)
      ? rawMessage[0]
      : rawMessage || 'Error en la petición a la API';
    throw new Error(formattedMessage);
  }

  if (response.status === 204) return null;

  return response.json();
}
