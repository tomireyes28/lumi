import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { UserProfile } from '@/types/profile';
import { toast } from 'sonner';

export function useProfile() {
  const { token, logout, user: storeUser } = useAuthStore();
  const [user, setUser] = useState<UserProfile | null>(storeUser as UserProfile | null);
  // Inicializamos en true solo si hay un token que validar
  const [loading, setLoading] = useState(!!token);

  useEffect(() => {
    // Si no hay token, salimos temprano (loading ya es false)
    if (!token) return;

    const fetchProfile = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const response = await fetch(`${apiUrl}/auth/me`, {
          headers: { 
            'Authorization': `Bearer ${token}` 
          }
        });

        if (!response.ok) {
          throw new Error('Sesión expirada o inválida');
        }

        const data = await response.json();
        setUser(data);
      } catch {
        toast.error('Error al cargar la información del perfil');
        logout();
        window.location.href = '/';
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [token, logout]);

  const handleLogout = () => {
    logout();
    toast.success('¡Hasta pronto!');
    window.location.href = '/';
  };

  return { user, loading, handleLogout };
}