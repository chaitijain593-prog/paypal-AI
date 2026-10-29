'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import TopNav from '@/components/TopNav';

export default function Shell({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#07090E] text-[#F3F4F6] relative overflow-x-hidden selection:bg-[#0070BA] selection:text-white">
      {/* Background radial ambient lights */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[900px] h-[450px] bg-gradient-to-b from-[#0070BA]/15 via-[#0070BA]/5 to-transparent blur-3xl opacity-70" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#FFC43A]/5 blur-3xl rounded-full" />
        <div className="absolute top-1/3 left-[-10%] w-[400px] h-[400px] bg-indigo-500/5 blur-3xl rounded-full" />
      </div>

      {/* Sidebar (Desktop sticky + Mobile drawer) */}
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

        {/* Global Footer */}
        <footer className="border-t border-white/[0.05] py-4 px-6 text-center text-xs text-gray-500">
          PaySentinel AI · Built for the PayPal AI Hackathon 2026 · Visa Compelling Evidence 3.0 &amp; Orders v2 Certified
        </footer>
      </div>
    </div>
  );
}
