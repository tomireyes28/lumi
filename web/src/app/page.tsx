"use client";

export default function Home() {
  const handleGoogleLogin = () => {
    // Redirigimos directamente a tu propio backend de NestJS
    // Asegurate de que el puerto (3001) coincida con donde corre tu API
    window.location.href = "http://localhost:3000/auth/google";
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-brand-text mb-4">
          Lumi <span className="text-brand-accent">Finanzas</span>
        </h1>
        <p className="text-xl text-brand-text/80 mb-8">
          Tus cuentas claras, sin límites.
        </p>
        <button 
          onClick={handleGoogleLogin}
          className="bg-brand-accent text-white px-6 py-3 rounded-full font-semibold hover:opacity-90 transition-opacity"
        >
          Ingresar con Google
        </button>
      </div>
    </main>
  );
}