import { create } from 'zustand';

// Datos públicos del usuario autenticado
export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string | null;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const COOKIE_MAX_AGE = 604800; // 7 días en segundos

function isJwtNotExpired(token: string | null): boolean {
  if (!token) return false;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const payload = JSON.parse(atob(padded));
    if (typeof payload.exp === 'number') {
      return payload.exp * 1000 > Date.now();
    }
    return Boolean(payload.sub);
  } catch {
    return false;
  }
}

function setAuthCookie(token: string) {
  if (typeof window === 'undefined') return;
  const isSecure = window.location.protocol === 'https:';
  document.cookie = `lumi_token=${token}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax${isSecure ? '; Secure' : ''}`;
}

function clearAuthStorage() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('lumi_token');
  localStorage.removeItem('lumi_user');
  document.cookie = 'lumi_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
}

function getInitialAuthState(): { token: string | null; user: User | null; isAuthenticated: boolean } {
  if (typeof window === 'undefined') {
    return { token: null, user: null, isAuthenticated: false };
  }

  const storedToken = localStorage.getItem('lumi_token');
  const storedUserRaw = localStorage.getItem('lumi_user');

  if (!storedToken || !isJwtNotExpired(storedToken)) {
    clearAuthStorage();
    return { token: null, user: null, isAuthenticated: false };
  }

  let parsedUser: User | null = null;
  try {
    parsedUser = storedUserRaw ? (JSON.parse(storedUserRaw) as User) : null;
  } catch {
    parsedUser = null;
  }

  setAuthCookie(storedToken);

  return {
    token: storedToken,
    user: parsedUser,
    isAuthenticated: true,
  };
}

const initialState = getInitialAuthState();

export const useAuthStore = create<AuthState>((set, get) => ({
  token: initialState.token,
  user: initialState.user,
  isAuthenticated: initialState.isAuthenticated,

  login: (token, user) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('lumi_token', token);
      localStorage.setItem('lumi_user', JSON.stringify(user));
      setAuthCookie(token);
    }
    set({ token, user, isAuthenticated: true });
  },

  logout: () => {
    const currentToken = get().token;
    clearAuthStorage();
    set({ token: null, user: null, isAuthenticated: false });

    // Revocación best-effort del token en el servidor (invalida jti y limpia cookie HttpOnly)
    if (typeof window !== 'undefined' && currentToken) {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      fetch(`${apiUrl}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${currentToken}` },
        credentials: 'include',
      }).catch(() => undefined);
    }
  },
}));

// Sincronización multi-pestaña: si otra pestaña cierra o inicia sesión, actualizamos el estado local
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === 'lumi_token' || event.key === null) {
      const nextState = getInitialAuthState();
      useAuthStore.setState(nextState);
      if (!nextState.isAuthenticated && window.location.pathname.startsWith('/dashboard')) {
        window.location.href = '/';
      }
    }
  });
}
