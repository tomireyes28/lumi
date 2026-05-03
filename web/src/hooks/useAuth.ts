import { useAuthStore } from "@/store/useAuthStore";

export function useAuth() {
  // Traemos la función login de nuestra bóveda global
  const { login } = useAuthStore();

  const loginWithGoogle = () => {
    // Acá iría tu lógica de Firebase/Supabase/NextAuth real.
    // Por ahora, simulamos un login exitoso.
    
    const fakeToken = "jwt_token_falso_12345";
    const fakeUser = {
      id: "1",
      email: "aylu@lumifinanzas.com",
      name: "Aylu",
    };

    // Usamos nuestra nueva acción centralizada!
    login(fakeToken, fakeUser);
    
    // Redirigimos al dashboard
    window.location.href = '/dashboard';
  };

  return { loginWithGoogle };
}