'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import TopNav from '@/components/TopNav';
import SilkBackground from '@/components/SilkBackground';

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Standalone Full-Width Starting Landing Page
  if (pathname === '/') {
    return (
      <div className="min-h-screen bg-[#0B0F17] text-[#F8FAFC] relative overflow-x-clip selection:bg-[#0070BA] selection:text-white">
        {/* Soft, calm 3D WebGL silk waves in deep midnight navy & PayPal blues */}
        <SilkBackground opacity={0.75} />

        {/* Soft radial mask: fully reveals the 3D silk wave behind the phone while softly blending to #0B0F17 around text */}
        <div
          className="fixed inset-0 pointer-events-none z-[1]"
          style={{
            background:
              'radial-gradient(1200px 750px at 70% 38%, transparent 0%, rgba(11, 15, 23, 0.4) 50%, #0B0F17 95%)',
          }}
        />

        <div className="relative z-10 w-full">{children}</div>
      </div>
    );
  }

  // Internal App Modules (/dashboard, /arena, /transactions, /proofs, /cashflow)
  return (
    <div className="flex min-h-screen bg-[#0B0F17] text-[#F8FAFC] relative overflow-x-hidden selection:bg-[#0070BA] selection:text-white">
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 min-w-0 flex flex-col relative z-10">
        <TopNav onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)} />

        <main className="flex-1 px-6 lg:px-10 py-8 max-w-7xl mx-auto w-full">
          {children}
        </main>

        <footer className="border-t border-white/[0.06] py-5 px-6 lg:px-10 bg-[#0B0F17] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="font-semibold text-slate-300">PaySentinel AI</span> — PayPal AI Hackathon 2026
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Visa Compelling Evidence 3.0</span>
            <span>·</span>
            <span>PayPal Orders v2 API</span>
            <span>·</span>
            <span className="text-[#3B9EFF] font-semibold">Dispute Defense Firewall</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
