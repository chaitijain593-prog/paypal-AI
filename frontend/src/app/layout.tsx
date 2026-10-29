import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Shell from "@/components/Shell";

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
    <html lang="en" className="dark h-full">
      <body className={`${inter.className} min-h-full bg-[#07090E] antialiased`}>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
