"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence, Variants } from "framer-motion"; // <-- Agregamos Variants
import { Mail, Lock, User, ArrowRight } from "lucide-react";

export default function Home() {
  const { loginWithGoogle } = useAuth();
  
  const [isLogin, setIsLogin] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`¡Próximamente! Falta armar el backend para ${isLogin ? 'iniciar sesión' : 'registrar'} con email.`);
  };

  // 1. Tipamos el contenedor padre
  const containerVariant: Variants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 } 
    }
  };

  // 2. Tipamos los elementos hijos
  const fadeUpVariant: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4 sm:p-8">
      
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-sky-100 blur-[120px] opacity-60"></div>
        <div className="absolute top-[60%] right-[-10%] w-[40%] h-[40%] rounded-full bg-pink-100 blur-[120px] opacity-60"></div>
      </div>

      <motion.div 
        className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden relative z-10"
        initial="hidden"
        animate="visible"
        variants={containerVariant} // <-- Usamos la variable tipada
      >
        <div className="p-8 pb-6 text-center">
          <motion.h1 variants={fadeUpVariant} className="text-4xl font-bold text-gray-900 mb-2">
            Lumi <span className="text-sky-500">Finanzas</span>
          </motion.h1>
          <motion.p variants={fadeUpVariant} className="text-sm text-gray-500 font-medium">
            Tus cuentas claras, sin límites.
          </motion.p>
        </div>

        <motion.div variants={fadeUpVariant} className="flex px-8 mb-6">
          <div className="flex w-full bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${isLogin ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Ingresar
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${!isLogin ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Registrarse
            </button>
          </div>
        </motion.div>

        <div className="px-8 pb-8">
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <AnimatePresence mode="popLayout">
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0, scale: 0.95 }}
                  animate={{ opacity: 1, height: 'auto', scale: 1 }}
                  exit={{ opacity: 0, height: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Nombre</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input 
                      type="text" required={!isLogin} value={name} onChange={(e) => setName(e.target.value)}
                      placeholder="Ej: Aylu"
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div variants={fadeUpVariant}>
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input 
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all"
                />
              </div>
            </motion.div>

            <motion.div variants={fadeUpVariant}>
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input 
                  type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all"
                />
              </div>
            </motion.div>

            <motion.button
              variants={fadeUpVariant}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              className="w-full bg-gray-900 text-white font-bold py-3.5 rounded-xl hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 mt-2"
            >
              {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </form>

          <motion.div variants={fadeUpVariant} className="flex items-center gap-3 my-6">
            <div className="h-px bg-gray-200 flex-1"></div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">O continuá con</span>
            <div className="h-px bg-gray-200 flex-1"></div>
          </motion.div>

          <motion.button
            variants={fadeUpVariant}
            onClick={loginWithGoogle}
            whileHover={{ scale: 1.02, backgroundColor: "#f8fafc" }}
            whileTap={{ scale: 0.98 }}
            className="w-full bg-white border-2 border-gray-100 text-gray-700 font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-3"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google
          </motion.button>
        </div>
      </motion.div>
    </main>
  );
}