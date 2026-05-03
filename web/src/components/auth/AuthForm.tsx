import { useState } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { Mail, Lock, User, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth"; // <-- Importamos nuestro hook

interface AuthFormProps {
  itemVariant: Variants;
}

export function AuthForm({ itemVariant }: AuthFormProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  
  // Extraemos la función y el estado de carga
  const { authWithEmail, loading } = useAuth();

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await authWithEmail(isLogin, { 
      email, 
      password, 
      name: isLogin ? undefined : name 
    });
  };

  return (
    <>
      <motion.div variants={itemVariant} className="flex px-8 mb-6">
        <div className="flex w-full bg-gray-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${isLogin ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Ingresar
          </button>
          <button
            type="button"
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

          <motion.div variants={itemVariant}>
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

          <motion.div variants={itemVariant}>
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
            variants={itemVariant}
            whileHover={{ scale: loading ? 1 : 1.02 }}
            whileTap={{ scale: loading ? 1 : 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full bg-gray-900 text-white font-bold py-3.5 rounded-xl hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 mt-2 disabled:bg-gray-400"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Cargando...
              </>
            ) : isLogin ? (
              <>Iniciar Sesión <ArrowRight className="w-4 h-4" /></>
            ) : (
              <>Crear Cuenta <ArrowRight className="w-4 h-4" /></>
            )}
          </motion.button>
        </form>
      </div>
    </>
  );
}