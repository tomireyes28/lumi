"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { Loader2 } from "lucide-react";

function CallbackLogic() {
  const searchParams = useSearchParams();
  const { login } = useAuthStore();

  useEffect(() => {
    const code = searchParams.get("code");
    const legacyToken = searchParams.get("token");

    if (!code && !legacyToken) {
      window.location.href = "/";
      return;
    }

    const processAuthCallback = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
        let authToken = legacyToken;
        let authUser = null;

        if (code) {
          // Intercambio seguro del código de un solo uso por el token JWT y datos de usuario
          const exchangeResponse = await fetch(`${apiUrl}/auth/exchange`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code }),
          });

          if (!exchangeResponse.ok) {
            throw new Error('Código de autorización inválido o expirado');
          }

          const exchangeData = await exchangeResponse.json();
          authToken = exchangeData.token;
          authUser = exchangeData.user;
        } else if (legacyToken) {
          // Soporte retrocompatible si viniera token directo
          const response = await fetch(`${apiUrl}/auth/me`, {
            headers: { Authorization: `Bearer ${legacyToken}` }
          });

          if (!response.ok) {
            throw new Error("Token inválido");
          }

          authUser = await response.json();
        }

        if (authToken && authUser) {
          // Guarda en Zustand, en LocalStorage y crea la Cookie
          login(authToken, authUser);
          window.location.href = "/dashboard";
        } else {
          throw new Error("No se pudo completar la autenticación");
        }
      } catch (error) {
        console.error(error);
        window.location.href = "/";
      }
    };

    processAuthCallback();
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