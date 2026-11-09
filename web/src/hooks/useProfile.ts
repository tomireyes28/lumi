import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { UserProfile } from "@/types/profile";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

export function useProfile() {
  const { logout, user: storeUser } = useAuthStore();
  const [user, setUser] = useState<UserProfile | null>(
    storeUser as UserProfile | null,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await apiFetch<UserProfile>("/auth/me");
        setUser(data);
      } catch {
        toast.error("Error al cargar la información del perfil");
      } finally {
        setLoading(false);
      }
    };

    void fetchProfile();
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo cerrar la sesión",
      );
      return;
    }
    toast.success("¡Hasta pronto!");
    window.location.replace("/");
  };

  return { user, loading, handleLogout };
}
