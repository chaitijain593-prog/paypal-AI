'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import {
  Bell,
  Search,
  Zap,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Menu,
} from 'lucide-react';

interface TopNavProps {
  onToggleMobileMenu?: () => void;
}

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Merchant Command Center', subtitle: 'Dispute defense, agentic commerce & risk monitoring' },
  '/arena': { title: 'Dispute Arena', subtitle: 'Adversarial AI red-team simulations & prompt injection firewall' },
  '/transactions': { title: 'Transactions Ledger', subtitle: 'PayPal Sandbox orders, dispute drill-downs & logs' },
  '/proofs': { title: 'Proof Vault', subtitle: 'SHA-256 Merkle proof chain & Visa CE 3.0 evidence ledger' },
  '/cashflow': { title: 'Runway Guardian', subtitle: 'Real-time liquidity impact modeling & capital recovery simulator' },
};

export default function TopNav({ onToggleMobileMenu }: TopNavProps) {
  const pathname = usePathname();
  const current = pageTitles[pathname] || { title: 'PaySentinel AI', subtitle: 'Fintech Protection' };

  return (
    <header className="h-16 border-b border-white/[0.06] bg-[#0A0D14]/80 backdrop-blur-xl px-4 lg:px-8 flex items-center justify-between sticky top-0 z-30">
      {/* Left: Mobile hamburger + Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-gray-300 hover:text-white"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2 text-xs text-gray-400">
          <span className="font-semibold text-gray-300">PaySentinel</span>
          <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
          <span className="text-[#0090E0] font-medium">{current.title}</span>
        </div>
      </div>

      {/* Right: Sandbox Status Badge, Quick Search, Notifications, Profile */}
      <div className="flex items-center gap-3">
        {/* PayPal Sandbox Status Badge */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0070BA]/10 border border-[#0070BA]/25 text-xs text-[#0090E0] font-semibold">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          PayPal Sandbox v2 · Live
        </div>

        {/* Visa CE 3.0 Badge */}
        <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFC43A]/10 border border-[#FFC43A]/25 text-xs text-[#FFC43A] font-semibold">
          <ShieldCheck className="w-3.5 h-3.5 text-[#FFC43A]" />
          Visa CE 3.0 Rebuttal Engine
        </div>

        {/* Quick notification bell */}
        <div className="relative">
          <button className="p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] text-gray-300 transition-colors">
            <Bell className="w-4 h-4" />
          </button>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#FFC43A] ring-2 ring-[#0A0D14]" />
        </div>

        {/* User Pill */}
        <div className="flex items-center gap-2 pl-2 border-l border-white/[0.08]">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#0070BA] to-[#FFC43A] flex items-center justify-center text-xs font-bold text-white shadow-sm">
            SS
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-bold text-white leading-tight">Shaurya Shah</p>
            <p className="text-[10px] text-gray-400 leading-tight">Merchant Admin</p>
          </div>
        </div>
      </div>
    </header>
  );
}
