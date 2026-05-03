"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { Loader2 } from "lucide-react";

function CallbackLogic() {
  const searchParams = useSearchParams();
  const { login } = useAuthStore();

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      window.location.href = "/";
      return;
    }

    // Buscamos los datos reales del usuario usando el token de Google
    const fetchUserAndLogin = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
        const response = await fetch(`${apiUrl}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.ok) {
          const user = await response.json();
          // ESTA ES LA MAGIA: Guarda en Zustand, en LocalStorage y crea la Cookie
          login(token, user); 
          
          // Ahora que la cookie existe, el middleware nos va a dejar entrar
          window.location.href = "/dashboard";
        } else {
          throw new Error("Token inválido");
        }
      } catch (error) {
        console.error(error);
        window.location.href = "/";
      }
    };

    fetchUserAndLogin();
  }, [searchParams, login]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <Loader2 className="w-10 h-10 text-sky-500 animate-spin mb-4" />
      <p className="text-gray-500 font-medium">Iniciando sesión segura...</p>
    </div>
  );
}

// Envolvemos en Suspense por requerimientos de Next.js al usar useSearchParams
export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50"></div>}>
      <CallbackLogic />
    </Suspense>
  );
}