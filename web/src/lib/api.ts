import { useAuthStore } from '@/store/useAuthStore';

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('lumi_token') : null;

  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  const response = await fetch(`${apiUrl}${path}`, {
    credentials: options.credentials ?? 'include',
    signal:
      options.signal ||
      (typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal
        ? AbortSignal.timeout(10000)
        : undefined),
    ...options,
    headers,
  });

  if (response.status === 401) {
    if (typeof window !== 'undefined') {
      useAuthStore.getState().logout();
      window.location.replace('/');
    }
    throw new Error('Sesión expirada');
  }

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as {
      message?: string | string[];
    };
    const rawMessage = errorData.message;
    const formattedMessage = Array.isArray(rawMessage)
      ? rawMessage[0]
      : rawMessage || 'Error en la petición a la API';
    throw new Error(formattedMessage);
  }

  if (response.status === 204) return null as T;

  return (await response.json()) as T;
}
