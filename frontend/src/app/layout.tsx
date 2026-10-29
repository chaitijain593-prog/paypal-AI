import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PaySentinel AI — Verifiable Dispute Firewall & Agentic Commerce",
  description:
    "AI-powered dispute defense for PayPal merchants with cryptographic proof-carrying verification and adversarial red-teaming.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} min-h-screen bg-[#0A0E17] text-[#F9FAFB] flex`}>
        <Sidebar />
        <main className="flex-1 lg:pl-[260px] pt-16 lg:pt-0 min-h-screen flex flex-col">
          <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
