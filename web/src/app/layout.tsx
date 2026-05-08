import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lumi | Finanzas Claras",
  description: "Lumi es tu asistente financiero. Controlá tus gastos, ingresos, tarjetas y simulá reintegros de forma simple y clara.",
  keywords: ["finanzas", "gastos", "presupuesto", "billetera virtual", "tarjetas", "reintegros", "Lumi"],
  openGraph: {
    title: "Lumi | Finanzas Claras",
    description: "Controlá tu plata de forma inteligente.",
    url: "https://lumi-beta-one.vercel.app", 
    siteName: "Lumi",
    images: [
      {
        url: "/logo-completo.png", 
        width: 1200,
        height: 630,
      },
    ],
    locale: "es_AR",
    type: "website",
  },
  themeColor: "#0284c7",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}
        <Toaster richColors position="bottom-right" closeButton />
      </body>
    </html>
  );
}
