import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { UserProfile } from '@/types/profile';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';

export function useProfile() {
  const { token, logout, user: storeUser } = useAuthStore();
  const [user, setUser] = useState<UserProfile | null>(storeUser as UserProfile | null);
  const [loading, setLoading] = useState(!!token);

  useEffect(() => {
    if (!token) return;

    const fetchProfile = async () => {
      try {
        const data = await apiFetch('/auth/me');
        setUser(data);
      } catch {
        toast.error('Error al cargar la información del perfil');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [token]);

  const handleLogout = () => {
    logout();
    toast.success('¡Hasta pronto!');
    window.location.href = '/';
  };

  return { user, loading, handleLogout };
}