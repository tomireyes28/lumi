import BottomNav from "@/components/BottomNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Fondo general gris para la pantalla de la compu
    <div className="min-h-screen bg-gray-100 flex justify-center">
      {/* Contenedor que simula la pantalla del celular (max-w-md) */}
      <main className="w-full max-w-md bg-white min-h-screen relative shadow-2xl overflow-x-hidden pb-20">
        {children}
        <BottomNav />
      </main>
    </div>
  );
}