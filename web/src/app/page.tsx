"use client";

import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";

export default function Home() {
  // 1. Extraemos la lógica del Hook (UI tonta)
  const { loginWithGoogle } = useAuth();

  // 2. Definimos una animación genérica para reutilizar
  const fadeUpVariant = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50">
      <div className="text-center">
        
        {/* Envolvemos los elementos en motion.div para animarlos en cascada */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            visible: { transition: { staggerChildren: 0.2 } } // Hace que aparezcan uno después del otro
          }}
        >
          <motion.h1 variants={fadeUpVariant} className="text-5xl font-bold text-gray-900 mb-4">
            Lumi <span className="text-sky-500">Finanzas</span>
          </motion.h1>
          
          <motion.p variants={fadeUpVariant} className="text-xl text-gray-500 mb-8 font-medium">
            Tus cuentas claras, sin límites.
          </motion.p>
          
          <motion.button 
            variants={fadeUpVariant}
            onClick={loginWithGoogle}
            whileHover={{ scale: 1.05 }} // Micro-interacción: crece al pasar el mouse
            whileTap={{ scale: 0.95 }}   // Micro-interacción: se hunde al hacer click
            className="bg-sky-500 text-white px-8 py-4 rounded-full font-bold shadow-lg shadow-sky-200 hover:bg-sky-600 transition-colors"
          >
            Ingresar con Google
          </motion.button>
        </motion.div>

      </div>
    </main>
  );
}