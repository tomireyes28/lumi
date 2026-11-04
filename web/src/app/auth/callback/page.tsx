"use client";

import { useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { Loader2 } from "lucide-react";

function CallbackLogic() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuthStore();
  const hasExchangedRef = useRef(false);

  useEffect(() => {
    if (hasExchangedRef.current) return;
    hasExchangedRef.current = true;

    const code = searchParams.get("code");
    const returnedState = searchParams.get("state");
    const expectedState = sessionStorage.getItem("lumi_oauth_state");
    sessionStorage.removeItem("lumi_oauth_state");

    // Limpiamos inmediatamente los parámetros sensibles de la barra de direcciones e historial
    if (typeof window !== "undefined" && window.history?.replaceState) {
      window.history.replaceState({}, document.title, "/auth/callback");
    }

    // Verificamos que exista código y que el state coincida con el iniciado en este navegador (anti-Login CSRF)
    if (!code || !returnedState || !expectedState || returnedState !== expectedState) {
      router.replace("/");
      return;
    }

    const processAuthCallback = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

        const exchangeResponse = await fetch(`${apiUrl}/auth/exchange`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ code, state: expectedState }),
        });

        if (!exchangeResponse.ok) {
          throw new Error("Código de autorización inválido o expirado");
        }

        const exchangeData = await exchangeResponse.json();
        const authToken = exchangeData.token;
        const authUser = exchangeData.user;

        if (authToken && authUser) {
          login(authToken, authUser);
          router.replace("/dashboard");
        } else {
          throw new Error("No se pudo completar la autenticación");
        }
      } catch (error) {
        console.error(error);
        router.replace("/");
      }
    };

    void processAuthCallback();
  }, [searchParams, login, router]);

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
