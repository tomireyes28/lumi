import * as LucideIcons from "lucide-react";

interface IconRendererProps {
  iconName?: string;
  className?: string;
  colorHex?: string;
}

export function IconRenderer({ iconName, className = "w-5 h-5", colorHex }: IconRendererProps) {
  if (!iconName) return <span className="text-xl">📁</span>;

  // Verificamos si es un ícono de Lucide
  const IconComponent = iconName in LucideIcons 
    ? LucideIcons[iconName as keyof typeof LucideIcons] as React.ElementType
    : null;

  if (IconComponent) {
    return <IconComponent className={className} style={{ color: colorHex || 'currentColor' }} />;
  }

  // Si no es Lucide (por ejemplo, si es un emoji antiguo), lo renderizamos como texto
  return <span className="text-xl">{iconName}</span>;
}