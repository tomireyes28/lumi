import { motion, Variants } from "framer-motion";
import { UserProfile } from "@/types/profile";

interface ProfileInfoProps {
  user: UserProfile;
  itemVariants: Variants;
}

export function ProfileInfo({ user, itemVariants }: ProfileInfoProps) {
  // Sacamos la primera letra del nombre para el avatar por defecto
  const initial = user.name ? user.name.charAt(0).toUpperCase() : '?';

  return (
    <motion.div variants={itemVariants} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
      <div className="w-24 h-24 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center text-3xl font-bold mb-4 shadow-inner overflow-hidden">
        {user.picture ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={user.picture} alt={user.name} className="w-full h-full object-cover" />
        ) : (
          initial
        )}
      </div>
      <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
      <p className="text-sm text-gray-500 font-medium mt-1">{user.email}</p>
      
      <div className="mt-6 px-4 py-2 bg-gray-50 rounded-xl border border-gray-100 w-full flex justify-between items-center">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Estado de cuenta</span>
        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">Activa</span>
      </div>
    </motion.div>
  );
}