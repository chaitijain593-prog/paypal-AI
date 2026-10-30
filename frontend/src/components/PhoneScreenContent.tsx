'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Lock,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  CreditCard,
  Smartphone,
  Activity,
  User,
} from 'lucide-react';

export default function PhoneScreenContent() {
  const [firewallLocked, setFirewallLocked] = useState(false);
  const [evidenceSubmitted, setEvidenceSubmitted] = useState(false);

  return (
    <div className="w-full h-full rounded-[34px] bg-[#0F1420] text-white flex flex-col justify-between overflow-hidden relative border border-white/[0.06] pt-6 pb-2.5 px-3.5 select-none font-sans">
      {/* Status Bar */}
      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 px-1 pt-1 mb-2">
        <span>9:41</span>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-300 font-mono">5G</span>
          <div className="w-5 h-2.5 rounded-sm border border-slate-400 p-0.5 flex items-center">
            <div className="w-full h-full bg-emerald-400 rounded-xs" />
          </div>
        </div>
      </div>

      {/* User Header */}
      <div className="flex items-center justify-between mb-2.5 px-1">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#0070BA] flex items-center justify-center font-bold text-xs text-white">
            SS
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-medium">Merchant Account</p>
            <p className="text-xs font-bold text-white flex items-center gap-1">
              PaySentinel Admin <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            </p>
          </div>
        </div>
        <button
          onClick={() => setFirewallLocked(!firewallLocked)}
          className={`p-1.5 rounded-lg border transition-colors ${
            firewallLocked
              ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
              : 'bg-white/[0.05] text-slate-300 border-white/[0.08]'
          }`}
          title="Toggle Untrusted Input Firewall"
        >
          <Lock className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* FINTECH WALLET CARD: PayPal Blue Accent */}
      <div className="rounded-xl p-4 bg-[#0070BA] text-white relative overflow-hidden mb-2.5 shadow-md">
        <div className="relative z-10 space-y-1">
          <div className="flex items-center justify-between text-[10px] font-semibold text-white/80 uppercase tracking-wider">
            <span>Total Protected Value</span>
            <span className="text-[9px] bg-black/20 px-2 py-0.5 rounded text-white font-medium">
              Orders v2
            </span>
          </div>
          <div className="text-2xl font-extrabold tracking-tight text-white tabular-nums">
            $18,908.00
          </div>
          <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-300">
            <span>▲ +4.76% (+0.20%) vs last week</span>
          </div>
        </div>
      </div>

      {/* Quick Action Pills */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        <button
          onClick={() => setEvidenceSubmitted(!evidenceSubmitted)}
          className="py-2 px-3 rounded-lg bg-[#121826] border border-white/[0.08] hover:border-white/20 text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition-colors"
        >
          <ArrowDownLeft className="w-3.5 h-3.5 text-[#3B9EFF]" />
          <span>{evidenceSubmitted ? 'Proof Ready ✓' : 'Add Proof'}</span>
        </button>
        <Link
          href="/arena"
          className="py-2 px-3 rounded-lg bg-[#0070BA] hover:bg-[#005ea6] text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition-colors"
        >
          <ArrowUpRight className="w-3.5 h-3.5" />
          <span>Arena Test</span>
        </Link>
      </div>

      {/* Dispute Rows */}
      <div className="space-y-1.5 flex-1 overflow-hidden">
        <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 mb-0.5">
          <span>Recent Claims &amp; Proofs</span>
          <Link href="/transactions" className="text-[#3B9EFF] hover:underline text-[9px]">
            View all ↗
          </Link>
        </div>

        {/* Row 1: Order PP-7829 */}
        <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.05] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-[10px] font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-white leading-tight">Order #PP-7829</p>
              <p className="text-[8px] text-slate-400 leading-tight">Visa CE 3.0 · Dispute Won</p>
            </div>
          </div>
          <span className="text-[10px] font-semibold text-emerald-400 tabular-nums">+$1,249.99</span>
        </div>

        {/* Row 2: Order PP-7835 */}
        <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.05] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[#0070BA]/20 text-[#3B9EFF] flex items-center justify-center text-[10px] font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-white leading-tight">Order #PP-7835</p>
              <p className="text-[8px] text-slate-400 leading-tight">Carrier GPS Match Verified</p>
            </div>
          </div>
          <span className="text-[10px] font-semibold text-emerald-400 tabular-nums">+$72.49</span>
        </div>

        {/* Row 3: Order PP-7844 */}
        <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.05] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-rose-500/10 text-rose-400 flex items-center justify-center text-[10px] font-bold">
              <Lock className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-white leading-tight">Order #PP-7844</p>
              <p className="text-[8px] text-slate-400 leading-tight">Prompt Injection Blocked</p>
            </div>
          </div>
          <span className="text-[10px] font-semibold text-[#3B9EFF] tabular-nums">+$890.00 Saved</span>
        </div>
      </div>

      {/* Bottom Nav Dock */}
      <div className="pt-2 border-t border-white/[0.06] flex items-center justify-around text-slate-400">
        <div className="p-1 text-[#3B9EFF]">
          <Smartphone className="w-4 h-4" />
        </div>
        <div className="p-1 hover:text-white">
          <CreditCard className="w-4 h-4" />
        </div>
        <div className="w-6 h-6 rounded-lg bg-[#0070BA] text-white flex items-center justify-center font-bold">
          <ShieldCheck className="w-3.5 h-3.5" />
        </div>
        <div className="p-1 hover:text-white">
          <Activity className="w-4 h-4" />
        </div>
        <div className="p-1 hover:text-white">
          <User className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}
