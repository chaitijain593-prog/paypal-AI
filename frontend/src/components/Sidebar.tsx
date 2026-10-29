'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Swords,
  ArrowLeftRight,
  ShieldCheck,
  TrendingUp,
  Menu,
  X,
  Zap,
} from 'lucide-react';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/arena', label: 'Dispute Arena', icon: Swords },
  { href: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { href: '/proofs', label: 'Proof Vault', icon: ShieldCheck },
  { href: '/cashflow', label: 'Cash Flow', icon: TrendingUp },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-4 bg-[#0A0E17]/95 backdrop-blur-xl border-b border-white/[0.08]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0070BA] to-[#FFC43A] flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold bg-gradient-to-r from-[#0070BA] to-[#FFC43A] bg-clip-text text-transparent">
            PaySentinel AI
          </span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg hover:bg-white/5 transition-colors"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-[260px]
          bg-[#0A0E17]/95 backdrop-blur-xl
          border-r border-white/[0.08]
          flex flex-col
          transition-transform duration-300 ease-in-out
          lg:translate-x-0
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo */}
        <div className="h-20 flex items-center gap-3 px-6 border-b border-white/[0.06]">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0070BA] to-[#FFC43A] flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              PaySentinel
            </h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#FFC43A] font-semibold">
              AI Platform
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-6 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`
                  group flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
                  transition-all duration-200
                  ${
                    isActive
                      ? 'bg-[#0070BA]/15 text-[#0090E0] border border-[#0070BA]/20 shadow-lg shadow-blue-500/10'
                      : 'text-gray-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
                  }
                `}
              >
                <Icon
                  className={`w-5 h-5 transition-colors ${
                    isActive ? 'text-[#0070BA]' : 'text-gray-500 group-hover:text-gray-300'
                  }`}
                />
                {item.label}
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#0070BA] shadow-lg shadow-blue-500/50" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className="p-4 mx-3 mb-4 rounded-xl bg-gradient-to-br from-[#0070BA]/10 to-[#FFC43A]/5 border border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#0070BA] to-[#0090E0] flex items-center justify-center text-sm font-bold text-white">
              SM
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">Shaurya M.</p>
              <p className="text-xs text-gray-500 truncate">Admin · Pro Plan</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
