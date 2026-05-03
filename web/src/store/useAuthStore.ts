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

// Creamos la bóveda
export const useAuthStore = create<AuthState>((set) => ({
  // 1. Estado inicial: Leemos de localStorage por si el usuario recargó la pestaña
  token: typeof window !== 'undefined' ? localStorage.getItem('lumi_token') : null,
  user: typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('lumi_user') || 'null') : null,
  isAuthenticated: typeof window !== 'undefined' ? !!localStorage.getItem('lumi_token') : false,
  
  // 2. Acción para Iniciar Sesión
  login: (token, user) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('lumi_token', token);
      localStorage.setItem('lumi_user', JSON.stringify(user));
      
      // NUEVO: Guardamos el token también en una Cookie. 
      // Esto es fundamental para que el Middleware (que corre en el servidor) pueda leerlo.
      document.cookie = `lumi_token=${token}; path=/; max-age=604800; SameSite=Strict`; 
    }
    set({ token, user, isAuthenticated: true });
  },
  
  // 3. Acción para Cerrar Sesión
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('lumi_token');
      localStorage.removeItem('lumi_user');
      
      // Borramos la Cookie
      document.cookie = "lumi_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    }
    set({ token: null, user: null, isAuthenticated: false });
  },
}));