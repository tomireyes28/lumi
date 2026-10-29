import { create } from 'zustand';

// Definimos qué datos queremos guardar del usuario
export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

// Definimos la estructura de nuestra bóveda
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
    const payload = JSON.parse(atob(base64));
    if (typeof payload.exp === 'number') {
      return payload.exp * 1000 > Date.now();
    }
    return true;
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

  // Aseguramos que la cookie esté sincronizada con localStorage para evitar bucles con el Middleware
  setAuthCookie(storedToken);

  return {
    token: storedToken,
    user: parsedUser,
    isAuthenticated: true,
  };
}

const initialState = getInitialAuthState();

// Creamos la bóveda
export const useAuthStore = create<AuthState>((set) => ({
  token: initialState.token,
  user: initialState.user,
  isAuthenticated: initialState.isAuthenticated,

  // Acción para Iniciar Sesión
  login: (token, user) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('lumi_token', token);
      localStorage.setItem('lumi_user', JSON.stringify(user));
      setAuthCookie(token);
    }
    set({ token, user, isAuthenticated: true });
  },

  // Acción para Cerrar Sesión
  logout: () => {
    clearAuthStorage();
    set({ token: null, user: null, isAuthenticated: false });
  },
}));
