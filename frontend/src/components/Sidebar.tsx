'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Swords,
  ArrowLeftRight,
  ShieldCheck,
  TrendingUp,
  X,
  Zap,
  Lock,
  Smartphone,
} from 'lucide-react';

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

const navItems = [
  { href: '/dashboard', label: 'Command Center', icon: LayoutDashboard },
  { href: '/arena', label: 'Dispute Arena', icon: Swords },
  { href: '/transactions', label: 'Transactions Ledger', icon: ArrowLeftRight },
  { href: '/proofs', label: 'Proof Vault', icon: ShieldCheck },
  { href: '/cashflow', label: 'Runway Guardian', icon: TrendingUp },
  { href: '/', label: 'Landing Showcase', icon: Smartphone },
];

export default function Sidebar({ mobileOpen = false, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();

  const content = (
    <div className="h-full flex flex-col justify-between px-4 py-6">
      {/* Brand Header */}
      <div>
        <div className="h-14 flex items-center justify-between px-2 mb-6 border-b border-white/[0.06]">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-[#0070BA] flex items-center justify-center text-white shadow-sm">
              <Zap className="w-5 h-5 fill-white text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-white">
                  PaySentinel
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#0070BA]/20 text-[#3B9EFF] font-bold border border-[#0070BA]/30">
                  AI
                </span>
              </div>
              <p className="text-[9px] uppercase tracking-widest text-slate-400 font-semibold">
                FINTECH FIREWALL
              </p>
            </div>
          </Link>

          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.05]"
              aria-label="Close navigation"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Section title */}
        <div className="px-3 mb-2 text-[10px] uppercase font-bold tracking-wider text-slate-400">
          Core Modules
        </div>

        {/* Navigation list */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                  transition-colors duration-150
                  ${
                    isActive
                      ? 'bg-[#0070BA]/15 text-white border border-[#0070BA]/30'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
                  }
                `}
              >
                <div
                  className={`p-1.5 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-[#0070BA] text-white'
                      : 'bg-white/[0.05] text-slate-400'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Merchant Guard Card */}
      <div className="space-y-3 pt-6">
        <div className="p-4 rounded-xl bg-[#121826] border border-white/[0.06]">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-white">Firewall Active</span>
            <span className="ml-auto w-2 h-2 rounded-full bg-emerald-400" />
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Untrusted Buyer inputs quarantined. 0 prompt injections permitted.
          </p>
          <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-[10px] text-slate-400">
            <span>Visa CE 3.0</span>
            <span className="text-emerald-400 font-semibold">100% Verified</span>
          </div>
        </div>

        {/* User Mini Profile */}
        <div className="px-3 py-2.5 rounded-xl bg-[#121826] border border-white/[0.06] flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#0070BA] flex items-center justify-center font-bold text-xs text-white">
            SS
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-white truncate">Shaurya Shah</p>
            <p className="text-[10px] text-slate-400 truncate">team@paypal-ai</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar */}
      <aside className="hidden lg:flex w-72 flex-col shrink-0 sticky top-0 h-screen border-r border-white/[0.06] bg-[#0B0F17] z-40">
        {content}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/70"
            onClick={onCloseMobile}
          />
          <aside className="relative w-72 max-w-[85vw] h-full bg-[#0B0F17] border-r border-white/[0.06] z-50 flex flex-col">
            {content}
          </aside>
        </div>
      )}
    </>
  );
}
