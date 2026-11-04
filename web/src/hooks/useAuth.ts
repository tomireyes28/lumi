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
    const clientState = crypto.randomUUID();
    sessionStorage.setItem('lumi_oauth_state', clientState);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    window.location.href = `${apiUrl}/auth/google?client_state=${encodeURIComponent(clientState)}`;
  };

  const authWithEmail = async (isLogin: boolean, data: EmailAuthData) => {
    setLoading(true);
    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

      const response = await fetch(`${apiUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        const message = Array.isArray(result.message)
          ? result.message[0]
          : result.message || 'Error de autenticación';
        throw new Error(message);
      }

      login(result.token, result.user);
      toast.success(isLogin ? '¡Hola de nuevo!' : '¡Cuenta creada con éxito!');
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
