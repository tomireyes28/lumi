import { useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from 'sonner';

interface EmailAuthData {
  email: string;
  password: string;
  name?: string;
}

export function useAuth() {
  const { login } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const loginWithGoogle = () => {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/auth/google`;
  };

  const authWithEmail = async (isLogin: boolean, data: EmailAuthData) => {
    setLoading(true);
    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      
      const response = await fetch(`${apiUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        const message = Array.isArray(result.message)
          ? result.message[0]
          : result.message || 'Error de autenticación';
        throw new Error(message);
      }

      // Guardamos en Zustand y en la Cookie
      login(result.token, result.user);
      
      toast.success(isLogin ? '¡Hola de nuevo!' : '¡Cuenta creada con éxito!');
      
      // Redirigimos al Dashboard
      window.location.href = '/dashboard';
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Ocurrió un error inesperado');
      }
    } finally {
      setLoading(false);
    }
  };

  return { loginWithGoogle, authWithEmail, loading };
}
