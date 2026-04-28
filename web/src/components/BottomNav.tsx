"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PlusCircle, LayoutGrid, User } from "lucide-react";

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { href: "/dashboard", label: "Inicio", icon: Home },
    { href: "/dashboard/transactions", label: "Cargar", icon: PlusCircle },
    { href: "/dashboard/categories", label: "Categorías", icon: LayoutGrid },
    { href: "/dashboard/profile", label: "Perfil", icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe z-50">
      {/* max-w-md lo centra si lo abrís en una compu, para que no se estire de punta a punta */}
      <div className="max-w-md mx-auto flex justify-between items-center px-6 py-3">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={`flex flex-col items-center gap-1 transition-colors ${
                isActive ? "text-sky-600" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}