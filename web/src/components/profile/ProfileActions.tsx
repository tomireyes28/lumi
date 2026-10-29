import { useState } from "react";
import Link from "next/link";
import { motion, Variants } from "framer-motion";
import { LogOut, Wallet, Target, ShieldCheck, ChevronRight } from "lucide-react";
import { Modal } from "@/components/ui/Modal";

interface ProfileActionsProps {
  handleLogout: () => void;
  itemVariants: Variants;
}

export function ProfileActions({ handleLogout, itemVariants }: ProfileActionsProps) {
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);

  return (
    <>
      <motion.div variants={itemVariants} className="flex flex-col gap-3">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-2 mt-2">
          Accesos y Seguridad
        </h3>

        <Link
          href="/dashboard/cards"
          className="w-full p-4 bg-white rounded-2xl shadow-sm border border-gray-50 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-pink-50 text-pink-600 rounded-xl">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-gray-800 text-sm block">Mis Tarjetas y Ciclos</span>
              <span className="text-xs text-gray-400">Límites, cierres mensuales y vencimientos</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </Link>

        <Link
          href="/dashboard/budgets"
          className="w-full p-4 bg-white rounded-2xl shadow-sm border border-gray-50 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-gray-800 text-sm block">Topes y Presupuestos</span>
              <span className="text-xs text-gray-400">Alertas de gasto por categoría</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </Link>

        <button
          type="button"
          onClick={() => setIsPrivacyOpen(true)}
          className="w-full p-4 bg-white rounded-2xl shadow-sm border border-gray-50 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-50 text-sky-600 rounded-xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-gray-800 text-sm block">Privacidad y Seguridad</span>
              <span className="text-xs text-gray-400">Protección de sesión y datos financieros</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>

        <button
          type="button"
          onClick={handleLogout}
          className="w-full mt-4 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-center gap-2 hover:bg-red-100 transition-colors group"
        >
          <LogOut className="w-5 h-5 text-red-500 group-hover:scale-110 transition-transform" />
          <span className="font-bold text-red-600">Cerrar Sesión</span>
        </button>
      </motion.div>

      <Modal
        isOpen={isPrivacyOpen}
        onClose={() => setIsPrivacyOpen(false)}
        title="Privacidad y Seguridad"
      >
        <div className="flex flex-col gap-4 text-sm text-gray-600">
          <div className="p-4 bg-sky-50/70 border border-sky-100 rounded-2xl">
            <h4 className="font-bold text-sky-900 mb-1">Aislamiento estricto por usuario</h4>
            <p className="text-xs text-sky-800 leading-relaxed">
              Todas tus transacciones, tarjetas, recordatorios y presupuestos están vinculados a tu
              identificador único y protegidos contra accesos de terceros (controles Anti-IDOR).
            </p>
          </div>
          <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl">
            <h4 className="font-bold text-gray-900 mb-1">Autenticación segura</h4>
            <p className="text-xs text-gray-600 leading-relaxed">
              Las contraseñas locales se almacenan encriptadas mediante <strong>bcrypt</strong> y el
              inicio de sesión con Google utiliza códigos OAuth efímeros de un solo uso.
            </p>
          </div>
          <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl">
            <h4 className="font-bold text-gray-900 mb-1">Datos de tarjetas</h4>
            <p className="text-xs text-gray-600 leading-relaxed">
              Lumi nunca solicita ni almacena números completos de tarjeta ni códigos de seguridad
              (CVV): solo guardamos un alias y los últimos 4 dígitos para tu referencia.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsPrivacyOpen(false)}
            className="w-full py-3 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-2xl transition-colors text-xs"
          >
            Entendido
          </button>
        </div>
      </Modal>
    </>
  );
}
