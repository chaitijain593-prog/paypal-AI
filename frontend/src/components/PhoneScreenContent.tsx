'use client';

import React, { useState, useEffect } from 'react';
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
  Clock,
  Send,
  Zap,
  Repeat,
  Calendar,
} from 'lucide-react';

export default function PhoneScreenContent() {
  const [activeTab, setActiveTab] = useState<'activity' | 'scheduled' | 'p2p'>('activity');
  const [firewallLocked, setFirewallLocked] = useState(false);
  const [protectedBalance, setProtectedBalance] = useState(18908.0);
  const [dynamicAlert, setDynamicAlert] = useState<{
    title: string;
    sub: string;
  } | null>(null);

  // Dynamic Island micro-alert trigger
  const showAlert = (title: string, sub: string) => {
    setDynamicAlert({ title, sub });
    setTimeout(() => {
      setDynamicAlert(null);
    }, 3200);
  };

  // Demo recurring alert loop (showcases live dispute rebuttal)
  useEffect(() => {
    const timer = setInterval(() => {
      showAlert('Dispute Rebuttal Won', '+$1,249.99 Settle');
    }, 11000);
    return () => clearInterval(timer);
  }, []);

  const handleToggleLock = () => {
    const next = !firewallLocked;
    setFirewallLocked(next);
    if (next) {
      showAlert('Firewall Engaged', '0 Injections Permitted');
    } else {
      showAlert('Firewall Standby', 'Monitoring Stream');
    }
  };

  const handleAddProof = () => {
    showAlert('Merkle Proof Ready', 'SHA-256 Verified');
  };

  const handleP2PSettle = () => {
    setProtectedBalance((prev) => prev + 250);
    showAlert('Agent #409 Transfer', '+$250.00 Settled');
  };

  return (
    <div className="w-full h-full rounded-[34px] bg-[#0F1420] text-white flex flex-col justify-between overflow-hidden relative border border-white/[0.06] pt-3 pb-2 px-3.5 select-none font-sans">
      {/* 1. Status Bar with Integrated Dynamic Island */}
      <div className="relative flex items-center justify-between text-[11px] font-semibold text-slate-400 px-1 pt-0.5 mb-2">
        <span className="w-10 text-left">9:41</span>

        {/* Dynamic Island Centered on Status Bar */}
        <div
          className={`transition-all duration-400 ease-out bg-black border border-white/10 flex items-center justify-between text-white overflow-hidden ${
            dynamicAlert
              ? 'w-[200px] h-6 px-2.5 rounded-full shadow-lg shadow-blue-500/25'
              : 'w-20 h-3.5 px-2 rounded-full'
          }`}
        >
          {dynamicAlert ? (
            <div className="flex items-center justify-between w-full text-[9px]">
              <div className="flex items-center gap-1 font-bold text-emerald-400 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="truncate">{dynamicAlert.title}</span>
              </div>
              <span className="font-mono text-white/90 text-[8px] tabular-nums font-semibold shrink-0 ml-1">
                {dynamicAlert.sub}
              </span>
            </div>
          ) : (
            <div className="w-full flex items-center justify-between">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-900 border border-slate-800" />
              <div className="w-1 h-1 rounded-full bg-emerald-500" />
            </div>
          )}
        </div>

        <div className="w-10 flex items-center justify-end gap-1">
          <span className="text-[10px] text-slate-300 font-mono">5G</span>
          <div className="w-4 h-2 rounded-xs border border-slate-400 p-0.5 flex items-center">
            <div className="w-full h-full bg-emerald-400 rounded-2xs" />
          </div>
        </div>
      </div>

      {/* 2. User Account Header */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#0070BA] flex items-center justify-center font-bold text-xs text-white shadow-sm">
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
          onClick={handleToggleLock}
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

      {/* 3. FINTECH WALLET CARD */}
      <div className="rounded-xl p-3 bg-[#0070BA] text-white relative overflow-hidden mb-2 shadow-md">
        <div className="relative z-10 space-y-0.5">
          <div className="flex items-center justify-between text-[10px] font-semibold text-white/80 uppercase tracking-wider">
            <span>Total Protected Value</span>
            <span className="text-[9px] bg-black/20 px-2 py-0.5 rounded text-white font-medium">
              Orders v2
            </span>
          </div>
          <div className="text-2xl font-extrabold tracking-tight text-white tabular-nums">
            ${protectedBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-300">
            <span>▲ +4.76% (+0.20%) vs last week</span>
          </div>
        </div>
      </div>

      {/* 4. Quick Actions */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        <button
          onClick={handleAddProof}
          className="py-1.5 px-3 rounded-lg bg-[#121826] border border-white/[0.08] hover:border-white/20 text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition-colors"
        >
          <ArrowDownLeft className="w-3.5 h-3.5 text-[#3B9EFF]" />
          <span>Add Proof</span>
        </button>
        <Link
          href="/arena"
          className="py-1.5 px-3 rounded-lg bg-[#0070BA] hover:bg-[#005ea6] text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition-colors"
        >
          <ArrowUpRight className="w-3.5 h-3.5" />
          <span>Arena Test</span>
        </Link>
      </div>

      {/* 5. Duxica-Style Segmented Control */}
      <div className="flex p-0.5 rounded-lg bg-black/40 border border-white/[0.06] mb-1.5 text-[10px] font-semibold text-slate-400">
        <button
          onClick={() => setActiveTab('activity')}
          className={`flex-1 py-1 rounded-md transition-all ${
            activeTab === 'activity'
              ? 'bg-[#121826] text-white shadow-sm font-bold border border-white/[0.08]'
              : 'hover:text-slate-200'
          }`}
        >
          Activity
        </button>
        <button
          onClick={() => setActiveTab('scheduled')}
          className={`flex-1 py-1 rounded-md transition-all ${
            activeTab === 'scheduled'
              ? 'bg-[#121826] text-white shadow-sm font-bold border border-white/[0.08]'
              : 'hover:text-slate-200'
          }`}
        >
          Scheduled
        </button>
        <button
          onClick={() => setActiveTab('p2p')}
          className={`flex-1 py-1 rounded-md transition-all ${
            activeTab === 'p2p'
              ? 'bg-[#121826] text-white shadow-sm font-bold border border-white/[0.08]'
              : 'hover:text-slate-200'
          }`}
        >
          P2P Agent
        </button>
      </div>

      {/* 6. Dynamic View Panels */}
      <div className="space-y-1.5 flex-1 overflow-hidden">
        {/* TAB 1: ACTIVITY */}
        {activeTab === 'activity' && (
          <div className="space-y-1.5 animate-fadeIn">
            <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.05] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-[10px] font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-white leading-tight">Order #PP-7829</p>
                  <p className="text-[8px] text-slate-400 leading-tight">Seller Protection · Dispute Won</p>
                </div>
              </div>
              <span className="text-[10px] font-semibold text-emerald-400 tabular-nums">+$1,249.99</span>
            </div>

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
              <span className="text-[10px] font-semibold text-[#3B9EFF] tabular-nums">+$890 Saved</span>
            </div>
          </div>
        )}

        {/* TAB 2: SCHEDULED */}
        {activeTab === 'scheduled' && (
          <div className="space-y-1.5 animate-fadeIn">
            <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.05] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-[#0070BA]/20 text-[#3B9EFF] flex items-center justify-center text-[10px] font-bold">
                  <Repeat className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-white leading-tight">Runway Auto-Disburse</p>
                  <p className="text-[8px] text-slate-400 leading-tight">Weekly Cycle · In 2d 14h</p>
                </div>
              </div>
              <span className="text-[10px] font-semibold text-emerald-400 tabular-nums">+$4,500.00</span>
            </div>

            <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.05] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-purple-500/20 text-purple-400 flex items-center justify-center text-[10px] font-bold">
                  <Calendar className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-white leading-tight">Vendor Settlement Release</p>
                  <p className="text-[8px] text-slate-400 leading-tight">Orders v2 · Tomorrow 09:00</p>
                </div>
              </div>
              <span className="text-[10px] font-semibold text-slate-300 tabular-nums">-$1,840.00</span>
            </div>

            <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.05] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-amber-500/20 text-amber-400 flex items-center justify-center text-[10px] font-bold">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-white leading-tight">Merkle Proof Snapshot</p>
                  <p className="text-[8px] text-slate-400 leading-tight">Continuous Sync · 42m</p>
                </div>
              </div>
              <span className="text-[9px] font-mono text-emerald-400 font-semibold">Active ✓</span>
            </div>
          </div>
        )}

        {/* TAB 3: P2P AGENT COMMERCE */}
        {activeTab === 'p2p' && (
          <div className="space-y-1.5 animate-fadeIn">
            <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.05] space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-md bg-[#0070BA]/20 text-[#3B9EFF] flex items-center justify-center text-[10px] font-bold">
                    <Zap className="w-3 h-3" />
                  </div>
                  <span className="text-[10px] font-bold text-white">Buyer Agent #409</span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono font-semibold">
                  Pre-Authorized
                </span>
              </div>
              <div className="flex justify-between items-center text-[9px] text-slate-400 pt-0.5">
                <span>Spending Limit:</span>
                <span className="text-white font-mono font-bold tabular-nums">$15,236.00</span>
              </div>
              <button
                onClick={handleP2PSettle}
                className="w-full py-1.5 rounded-md bg-[#0070BA] hover:bg-[#005ea6] text-white text-[10px] font-bold flex items-center justify-center gap-1 transition-colors shadow-sm"
              >
                <Send className="w-3 h-3" />
                <span>Simulate Instant Settle (+$250.00)</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 7. Bottom Nav Dock */}
      <div className="pt-2 border-t border-white/[0.06] flex items-center justify-around text-slate-400">
        <div className="p-1 text-[#3B9EFF]">
          <Smartphone className="w-3.5 h-3.5" />
        </div>
        <div className="p-1 hover:text-white">
          <CreditCard className="w-3.5 h-3.5" />
        </div>
        <div className="w-6 h-6 rounded-lg bg-[#0070BA] text-white flex items-center justify-center font-bold">
          <ShieldCheck className="w-3.5 h-3.5" />
        </div>
        <div className="p-1 hover:text-white">
          <Activity className="w-3.5 h-3.5" />
        </div>
        <div className="p-1 hover:text-white">
          <User className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  );
}
