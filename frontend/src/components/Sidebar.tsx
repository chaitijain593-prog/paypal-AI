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
  ShieldAlert,
  Sliders,
  ExternalLink,
  Lock,
} from 'lucide-react';

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

const navItems = [
  { href: '/', label: 'Command Center', icon: LayoutDashboard, badge: 'Live' },
  { href: '/arena', label: 'Dispute Arena', icon: Swords, badge: 'Red Team' },
  { href: '/transactions', label: 'Transactions Ledger', icon: ArrowLeftRight },
  { href: '/proofs', label: 'Proof Vault', icon: ShieldCheck, badge: 'CE 3.0' },
  { href: '/cashflow', label: 'Runway Guardian', icon: TrendingUp },
];

export default function Sidebar({ mobileOpen = false, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();

  const content = (
    <div className="h-full flex flex-col justify-between p-4">
      {/* Top Header & Brand */}
      <div>
        <div className="h-16 flex items-center justify-between px-3 mb-4 border-b border-white/[0.06]">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0070BA] via-[#0090E0] to-[#FFC43A] p-0.5 shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-[#0A0D14] rounded-[10px] flex items-center justify-center">
                <Zap className="w-5 h-5 text-[#FFC43A]" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-white">
                  PaySentinel
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#0070BA]/20 text-[#0090E0] font-bold border border-[#0070BA]/30">
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
              className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/[0.05]"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Section title */}
        <div className="px-3 pb-2 text-[10px] uppercase font-bold tracking-wider text-gray-500">
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
                      ? 'bg-gradient-to-r from-[#0070BA]/25 to-[#0070BA]/5 text-white border border-[#0070BA]/40 shadow-[0_4px_20px_rgba(0,112,186,0.2)]'
                      : 'text-gray-400 hover:text-gray-100 hover:bg-white/[0.04] border border-transparent'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-1.5 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-[#0070BA] text-white shadow-sm'
                        : 'bg-white/[0.04] text-gray-400 group-hover:text-white group-hover:bg-white/[0.08]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                      item.badge === 'Red Team'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : item.badge === 'Live'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-[#FFC43A]/20 text-[#FFC43A] border border-[#FFC43A]/30'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}

                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r bg-[#0090E0]" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Merchant Guard Card */}
      <div className="space-y-3">
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#0070BA]/15 via-black/40 to-[#FFC43A]/10 border border-white/[0.08]">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-white">Firewall Active</span>
            <span className="ml-auto w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <p className="text-[11px] text-gray-300 leading-snug">
            Untrusted Buyer inputs quarantined. 0 prompt injections permitted.
          </p>
          <div className="mt-2.5 pt-2 border-t border-white/[0.08] flex items-center justify-between text-[10px] text-gray-400 font-medium">
            <span>Visa CE 3.0</span>
            <span className="text-emerald-400 font-bold">100% Verified</span>
          </div>
        </div>

        {/* User Mini Profile */}
        <div className="px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#0070BA] flex items-center justify-center font-bold text-xs text-white">
            SS
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-white truncate">Shaurya Shah</p>
            <p className="text-[10px] text-gray-400 truncate">team@paypal-ai</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar - Always in flex document flow, NEVER overlaps main content */}
      <aside className="hidden lg:flex w-72 flex-col shrink-0 sticky top-0 h-screen border-r border-white/[0.08] bg-[#0A0D14]/95 backdrop-blur-2xl z-40">
        {content}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          <aside className="relative w-72 max-w-[85vw] h-full bg-[#0A0D14] border-r border-white/[0.08] z-50 flex flex-col">
            {content}
          </aside>
        </div>
      )}
    </>
  );
}
