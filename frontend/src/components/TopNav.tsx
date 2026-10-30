'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import {
  Bell,
  ChevronRight,
  Menu,
} from 'lucide-react';

interface TopNavProps {
  onToggleMobileMenu?: () => void;
}

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'Merchant Command Center', subtitle: 'Dispute defense, agentic commerce & risk monitoring' },
  '/arena': { title: 'Dispute Arena', subtitle: 'Adversarial AI red-team simulations & prompt injection firewall' },
  '/transactions': { title: 'Transactions Ledger', subtitle: 'PayPal Sandbox orders, dispute drill-downs & logs' },
  '/proofs': { title: 'Proof Vault', subtitle: 'SHA-256 Merkle proof chain & Visa CE 3.0 evidence ledger' },
  '/cashflow': { title: 'Runway Guardian', subtitle: 'Real-time liquidity impact modeling & capital recovery simulator' },
};

export default function TopNav({ onToggleMobileMenu }: TopNavProps) {
  const pathname = usePathname();
  const current = pageTitles[pathname] || { title: 'PaySentinel AI', subtitle: 'Fintech Protection' };

  return (
    <header className="h-16 border-b border-white/[0.06] bg-[#0B0F17] px-6 lg:px-10 flex items-center justify-between sticky top-0 z-30">
      {/* Left: Mobile hamburger + Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-slate-300 hover:text-white"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
          <span className="font-semibold text-slate-300">PaySentinel</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          <span className="text-[#3B9EFF] font-medium">{current.title}</span>
        </div>
      </div>

      {/* Right: Exactly ONE status badge, notifications, profile */}
      <div className="flex items-center gap-4">
        {/* Single status badge per header */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0070BA]/15 border border-[#0070BA]/30 text-xs text-[#3B9EFF] font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          PayPal Sandbox v2 · Live
        </div>

        {/* Notification bell */}
        <div className="relative">
          <button className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-slate-300 transition-colors" aria-label="Notifications">
            <Bell className="w-4 h-4" />
          </button>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#0070BA] ring-2 ring-[#0B0F17]" />
        </div>

        {/* User Pill */}
        <div className="flex items-center gap-2 pl-3 border-l border-white/[0.06]">
          <div className="w-8 h-8 rounded-full bg-[#0070BA] flex items-center justify-center text-xs font-bold text-white shadow-sm">
            SS
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-bold text-white leading-tight">Shaurya Shah</p>
            <p className="text-[10px] text-slate-400 leading-tight">Merchant Admin</p>
          </div>
        </div>
      </div>
    </header>
  );
}
