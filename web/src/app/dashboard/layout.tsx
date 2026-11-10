import BottomNav from "@/components/BottomNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-100 flex justify-center">
      <main className="w-full max-w-md bg-white min-h-screen relative shadow-2xl overflow-x-hidden pb-app-nav">
        {children}
        <BottomNav />
      </main>
    </div>
  );
}
