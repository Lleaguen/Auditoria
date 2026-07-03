import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/lib/store";
import Sidebar from "@/components/ui/Sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HU Audit — Auditoría de Pallets",
  description: "Sistema de auditoría de pallets armados (HU)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body className="min-h-screen flex bg-[#f6f7fb]">
        <AppProvider>
          <Sidebar />
          <main className="flex-1 min-h-screen overflow-y-auto">
            <div className="w-full max-w-5xl mx-auto px-8 py-10">
              {children}
            </div>
          </main>
        </AppProvider>
      </body>
    </html>
  );
}
