'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import TopNav from '@/components/TopNav';
import SilkBackground from '@/components/SilkBackground';

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Standalone Full-Width Starting Landing Page (NO sidebar, NO admin terminal clutter)
  if (pathname === '/') {
    return (
      <div className="min-h-screen bg-[#060D17] text-[#F8FAFC] relative overflow-x-hidden selection:bg-[#76E243] selection:text-slate-950">
        <SilkBackground />
        <div className="fixed inset-0 bg-[#060D17]/50 pointer-events-none z-[1]" />
        <div className="relative z-10 w-full">{children}</div>
      </div>
    );
  }

  // Internal App Modules (/dashboard, /arena, /transactions, /proofs, /cashflow)
  return (
    <div className="flex min-h-screen bg-[#080D1A] text-[#F8FAFC] relative overflow-x-hidden selection:bg-[#0070BA] selection:text-white">
      <SilkBackground />
      <div className="fixed inset-0 bg-[#060C18]/55 pointer-events-none z-[1]" />

      <Sidebar
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 min-w-0 flex flex-col relative z-10">
        <TopNav onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>

        <footer className="border-t border-slate-800/80 py-5 px-6 bg-[#0B1120]/60 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-slate-300">PaySentinel AI</span> — PayPal AI Hackathon 2026
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Visa Compelling Evidence 3.0</span>
            <span>·</span>
            <span>PayPal Orders v2 API</span>
            <span>·</span>
            <span className="text-[#FFC43A] font-semibold">Deterministic Dispute Firewall</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
