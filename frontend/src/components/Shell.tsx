'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import TopNav from '@/components/TopNav';

export default function Shell({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#080D1A] text-[#F8FAFC] relative overflow-x-hidden selection:bg-[#0070BA] selection:text-white">
      {/* Dynamic Cosmic Gradient Orbs */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Top central intense sapphire glow */}
        <div className="absolute -top-[150px] left-1/2 -translate-x-1/2 w-[1100px] h-[600px] bg-gradient-to-b from-[#0070BA]/25 via-[#06B6D4]/15 to-transparent blur-[140px] rounded-full pointer-events-none" />
        {/* Bottom right gold/amber financial liquidity accent */}
        <div className="absolute -bottom-[100px] -right-[100px] w-[600px] h-[600px] bg-[#FFC43A]/10 blur-[130px] rounded-full pointer-events-none" />
        {/* Mid left royal indigo defense aura */}
        <div className="absolute top-1/3 -left-[150px] w-[500px] h-[500px] bg-[#6366F1]/12 blur-[130px] rounded-full pointer-events-none" />
      </div>

      {/* Sidebar (Desktop sticky in flex flow + Mobile drawer) */}
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col relative z-10">
        {/* Top Navigation */}
        <TopNav onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)} />

        {/* Inner Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>

        {/* Global Sleek Footer */}
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
