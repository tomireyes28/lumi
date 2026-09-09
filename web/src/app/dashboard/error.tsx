"use client";

import { useEffect } from "react";
import { AlertCircle, RotateCcw, Home } from "lucide-react";
import Link from "next/link";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard caught an error:", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
        <AlertCircle className="w-8 h-8" />
      </div>

      <h2 className="text-xl font-bold text-gray-900 mb-2">
        Algo no salió como esperábamos
      </h2>
      <p className="text-sm text-gray-500 max-w-xs mb-6">
        Ocurrió un error al cargar la información financiera. Podés intentar recargar esta sección.
      </p>

      <div className="flex gap-3 w-full max-w-xs">
        <button
          onClick={() => reset()}
          className="flex-1 py-3 px-4 bg-gray-900 text-white font-bold text-sm rounded-xl hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 shadow-sm"
        >
          <RotateCcw className="w-4 h-4" />
          Reintentar
        </button>

        <Link
          href="/dashboard"
          className="py-3 px-4 bg-gray-100 text-gray-700 font-bold text-sm rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center"
          title="Ir al Inicio"
        >
          <Home className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
