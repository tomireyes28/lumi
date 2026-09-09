import React from "react";
import { 
  ShoppingCart, Coffee, Utensils, Car, Bus, Home, Zap, Smartphone, Heart, 
  Briefcase, DollarSign, TrendingUp, Plane, Gift, Tag, Monitor, Scissors, GraduationCap,
  Folder
} from "lucide-react";

export const ICON_MAP: Record<string, React.ElementType> = {
  ShoppingCart, Coffee, Utensils, Car, Bus, Home, Zap, Smartphone, Heart, 
  Briefcase, DollarSign, TrendingUp, Plane, Gift, Tag, Monitor, Scissors, GraduationCap,
  Folder
};

interface IconRendererProps {
  iconName?: string | null;
  className?: string;
  colorHex?: string | null;
}

export function IconRenderer({ iconName, className = "w-5 h-5", colorHex }: IconRendererProps) {
  if (!iconName) return <Folder className={className} style={{ color: colorHex || 'currentColor' }} />;

  const IconComponent = ICON_MAP[iconName];

  if (IconComponent) {
    return <IconComponent className={className} style={{ color: colorHex || 'currentColor' }} />;
  }

  // Si no es un icono de la lista (por ejemplo, si es un emoji), lo renderizamos como texto
  return <span className="text-xl leading-none">{iconName}</span>;
}