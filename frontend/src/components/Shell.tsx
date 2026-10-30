'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import TopNav from '@/components/TopNav';
import SilkBackground from '@/components/SilkBackground';

export default function Shell({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#080D1A] text-[#F8FAFC] relative overflow-x-hidden selection:bg-[#0070BA] selection:text-white">
      {/* Animated WebGL Silk Shader Background */}
      <SilkBackground />
      {/* Semi-transparent overlay to ensure content readability */}
      <div className="fixed inset-0 bg-[#060C18]/55 pointer-events-none z-[1]" />

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
