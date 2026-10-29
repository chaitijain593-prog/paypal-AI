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
  Sparkles,
} from 'lucide-react';

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

const navItems = [
  { href: '/', label: '3D Sentinel Portal', icon: Sparkles, badge: '3D Hub' },
  { href: '/arena', label: 'Dispute Arena', icon: Swords, badge: 'Red Team' },
  { href: '/transactions', label: 'Transactions Ledger', icon: ArrowLeftRight },
  { href: '/proofs', label: 'Proof Vault', icon: ShieldCheck, badge: 'CE 3.0' },
  { href: '/cashflow', label: 'Runway Guardian', icon: TrendingUp },
];

export default function Sidebar({ mobileOpen = false, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();

  const content = (
    <div className="h-full flex flex-col justify-between p-4">
      {/* Brand Header */}
      <div>
        <div className="h-16 flex items-center justify-between px-3 mb-5 border-b border-slate-800/80">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0070BA] via-[#06B6D4] to-[#FFC43A] p-0.5 shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-[#0B1120] rounded-[10px] flex items-center justify-center">
                <Zap className="w-5 h-5 text-[#FFC43A]" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-white">
                  PaySentinel
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#0070BA]/25 text-[#0090E0] font-bold border border-[#0070BA]/40">
                  AI
                </span>
              </div>
              <p className="text-[10px] uppercase tracking-widest text-[#FFC43A] font-semibold">
                FINTECH FIREWALL
              </p>
            </div>
          </Link>

          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.05]"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Section title */}
        <div className="px-3 pb-2.5 text-[10px] uppercase font-bold tracking-wider text-slate-400">
          Core Modules
        </div>

        {/* Navigation list */}
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                className={`
                  relative flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold
                  transition-all duration-200 group
                  ${
                    isActive
                      ? 'bg-gradient-to-r from-[#0070BA]/30 via-[#06B6D4]/15 to-transparent text-white border border-[#0070BA]/40 shadow-[0_4px_20px_rgba(0,112,186,0.25)]'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-1.5 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-[#0070BA] text-white shadow-md shadow-blue-500/30'
                        : 'bg-slate-800/80 text-slate-400 group-hover:text-white group-hover:bg-slate-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                      item.badge === '3D Hub'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                        : item.badge === 'Red Team'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : 'bg-[#FFC43A]/20 text-[#FFC43A] border border-[#FFC43A]/30'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}

                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r bg-[#06B6D4] shadow-[0_0_8px_#06B6D4]" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Merchant Guard Card */}
      <div className="space-y-3">
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#0B1528] via-[#0F1E3A] to-[#121E36] border border-cyan-500/20 shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-white">Firewall Active</span>
            <span className="ml-auto w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#10B981]" />
          </div>
          <p className="text-[11px] text-slate-300 leading-snug">
            Untrusted Buyer inputs quarantined. 0 prompt injections permitted.
          </p>
          <div className="mt-2.5 pt-2 border-t border-slate-700/60 flex items-center justify-between text-[10px] text-slate-400 font-medium">
            <span>Visa CE 3.0</span>
            <span className="text-emerald-400 font-bold">100% Cryptographic</span>
          </div>
        </div>

        {/* User Mini Profile */}
        <div className="px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#0070BA] to-[#06B6D4] flex items-center justify-center font-bold text-xs text-white shadow-sm">
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
      <aside className="hidden lg:flex w-72 flex-col shrink-0 sticky top-0 h-screen border-r border-slate-800/80 bg-[#0B1120]/95 backdrop-blur-2xl z-40">
        {content}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          <aside className="relative w-72 max-w-[85vw] h-full bg-[#0B1120] border-r border-slate-800 z-50 flex flex-col">
            {content}
          </aside>
        </div>
      )}
    </>
  );
}
