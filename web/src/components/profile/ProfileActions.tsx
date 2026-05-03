import { motion, Variants } from "framer-motion";
import { LogOut, Settings, ShieldQuestion } from "lucide-react";

interface ProfileActionsProps {
  handleLogout: () => void;
  itemVariants: Variants;
}

export function ProfileActions({ handleLogout, itemVariants }: ProfileActionsProps) {
  return (
    <motion.div variants={itemVariants} className="flex flex-col gap-3">
      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-2 mt-2">Ajustes y Seguridad</h3>
      
      <button className="w-full p-4 bg-white rounded-2xl shadow-sm border border-gray-50 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left">
        <div className="p-2 bg-gray-100 text-gray-600 rounded-xl">
          <Settings className="w-5 h-5" />
        </div>
        <span className="font-bold text-gray-800 text-sm">Preferencias de la App</span>
      </button>

      <button className="w-full p-4 bg-white rounded-2xl shadow-sm border border-gray-50 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left">
        <div className="p-2 bg-gray-100 text-gray-600 rounded-xl">
          <ShieldQuestion className="w-5 h-5" />
        </div>
        <span className="font-bold text-gray-800 text-sm">Privacidad y Datos</span>
      </button>

      <button 
        onClick={handleLogout}
        className="w-full mt-4 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-center gap-2 hover:bg-red-100 transition-colors group"
      >
        <LogOut className="w-5 h-5 text-red-500 group-hover:scale-110 transition-transform" />
        <span className="font-bold text-red-600">Cerrar Sesión</span>
      </button>
    </motion.div>
  );
}