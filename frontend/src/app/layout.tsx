import type { Metadata } from "next";
import "./globals.css";
import Shell from "@/components/Shell";

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
      <body className="font-sans min-h-full bg-[#07090E] antialiased">
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
