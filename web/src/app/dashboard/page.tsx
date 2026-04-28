"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Agarramos el token de la URL
    const urlToken = searchParams.get("token");

    if (urlToken) {
      // Lo guardamos en el navegador para no perder la sesión
      localStorage.setItem("lumi_token", urlToken);
      setToken(urlToken);
      
      // Limpiamos la URL por seguridad (sacamos el choclazo de letras de la vista)
      router.replace("/dashboard");
    } else {
      // Si entramos sin token en la URL, nos fijamos si ya teníamos uno guardado
      const savedToken = localStorage.getItem("lumi_token");
      if (savedToken) {
        setToken(savedToken);
      } else {
        // Si no hay token, lo pateamos al inicio
        router.push("/");
      }
    }
  }, [searchParams, router]);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Cargando tu sesión...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Mi Tablero</h1>
        <p className="text-gray-600">Bienvenido a Lumi Finanzas</p>
      </header>
      
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 max-w-2xl">
        <h2 className="text-xl font-semibold mb-4 text-green-600">¡Login exitoso!</h2>
        <p className="text-gray-700 mb-4">
          Ya tenés tu JWT guardado de forma segura en el navegador. 
          A partir de ahora, cada vez que le pidas datos a NestJS, le vamos a adjuntar este token.
        </p>
        <div className="bg-gray-100 p-4 rounded-lg break-all text-xs font-mono text-gray-500">
          Tu token actual empieza con: {token.substring(0, 20)}...
        </div>
      </div>
    </div>
  );
}