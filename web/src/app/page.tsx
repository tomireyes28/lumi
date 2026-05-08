"use client";

import { useAuth } from "@/hooks/useAuth";
import { motion, Variants } from "framer-motion";
import { AuthForm } from "@/components/auth/AuthForm";
import { GoogleButton } from "@/components/auth/GoogleButton";
import Image from "next/image"; // <-- Importamos el componente de imagen optimizada

export default function Home() {
  const { loginWithGoogle } = useAuth();

  const containerVariant: Variants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 } 
    }
  };

  const fadeUpVariant: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4 sm:p-8">
      
      {/* Fondos difuminados */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-sky-100 blur-[120px] opacity-60"></div>
        <div className="absolute top-[60%] right-[-10%] w-[40%] h-[40%] rounded-full bg-pink-100 blur-[120px] opacity-60"></div>
      </div>

      <motion.div 
        className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden relative z-10"
        initial="hidden"
        animate="visible"
        variants={containerVariant}
      >
        
        {/* ACÁ ESTÁ LA MAGIA: El nuevo Logo */}
        <div className="p-8 pb-4 flex justify-center">
          <motion.div variants={fadeUpVariant} className="relative flex justify-center w-full">
            <Image 
              src="/logo-completo.png" 
              alt="Lumi Finanzas Claras" 
              width={220} // Ajustá este valor si lo querés más grande o chico
              height={100}
              priority // Le dice a Next.js que cargue esta imagen primero
              className="object-contain"
            />
          </motion.div>
        </div>

        {/* Formulario Modularizado */}
        <AuthForm itemVariant={fadeUpVariant} />

        <div className="px-8 pb-8">
          <motion.div variants={fadeUpVariant} className="flex items-center gap-3 my-6">
            <div className="h-px bg-gray-200 flex-1"></div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">O continuá con</span>
            <div className="h-px bg-gray-200 flex-1"></div>
          </motion.div>

          {/* Botón de Google Modularizado */}
          <GoogleButton onClick={loginWithGoogle} itemVariant={fadeUpVariant} />
        </div>

      </motion.div>
    </main>
  );
}