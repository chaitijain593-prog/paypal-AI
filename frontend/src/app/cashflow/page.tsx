'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  AlertCircle,
  DollarSign,
  ShieldAlert,
  ArrowUpRight,
  Sparkles,
  CheckCircle2,
  Calendar,
  Wallet,
  Clock,
  Zap,
} from 'lucide-react';

export default function CashFlowPage() {
  const [disputesResolved, setDisputesResolved] = useState(true);
  const [invoicesCollected, setInvoicesCollected] = useState(false);

  // Baseline 41 days. Each dispute resolution adds 6 days, invoices add 14 days
  const additionalDays =
    (disputesResolved ? 12 : 0) + (invoicesCollected ? 14 : 0);
  const currentRunway = 41 + additionalDays;
  const capitalRecovered =
    (disputesResolved ? 3840 : 0) + (invoicesCollected ? 8400 : 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FFC43A]/10 text-[#FFC43A] border border-[#FFC43A]/20">
              Runway Guardian Active
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Cash-Flow Runway Guardian
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Real-time liquidity impact modeling: see exactly how disputes and delayed payments bleed working capital.
          </p>
        </div>
      </div>

      {/* Runway Hero Gauge */}
      <div className="glass-card p-8 border border-white/[0.08] relative overflow-hidden gradient-gold">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#FFC43A]">
              <Clock className="w-4 h-4" /> Operational Runway Score
            </div>
            <div className="flex items-baseline gap-4">
              <span className="text-6xl font-black tracking-tight text-white">
                {currentRunway}
              </span>
              <span className="text-2xl font-bold text-gray-400">Days of Runway</span>
              {additionalDays > 0 && (
                <span className="px-3 py-1 rounded-full text-sm font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  +{additionalDays} days restored!
                </span>
              )}
            </div>

            {/* Gauge Progress Bar */}
            <div className="space-y-2">
              <div className="w-full h-4 rounded-full bg-black/50 border border-white/10 overflow-hidden p-0.5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (currentRunway / 90) * 100)}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 via-[#FFC43A] to-emerald-400"
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>Critical (&lt; 20d)</span>
                <span>Moderate (30-60d)</span>
                <span>Healthy (90d+)</span>
              </div>
            </div>
          </div>

          {/* AI Quick Impact Box */}
          <div className="p-5 rounded-2xl bg-black/60 border border-[#FFC43A]/30 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[#FFC43A]">
              <Sparkles className="w-4 h-4" /> PaySentinel AI Recommendation
            </div>
            <p className="text-sm text-gray-200 leading-relaxed">
              &ldquo;Your working capital is under pressure from <strong>$3,840 locked in 7 PayPal disputes</strong>. Submitting proof for 2 cases will immediately unlock cash and extend runway by 12 days.&rdquo;
            </p>
            <div className="pt-2 border-t border-white/10 text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              Potential Capital Unlocked: ${capitalRecovered.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Balance Breakdown Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5 border border-white/[0.08]">
          <div className="flex items-center justify-between text-gray-400 text-xs font-medium mb-2">
            <span>Liquid Cash Balance</span>
            <Wallet className="w-4 h-4 text-[#0090E0]" />
          </div>
          <p className="text-2xl font-bold text-white">$64,250.00</p>
          <p className="text-[11px] text-gray-400 mt-1">PayPal + Linked Bank Accounts</p>
        </div>

        <div className="glass-card p-5 border border-rose-500/20 bg-rose-500/[0.03]">
          <div className="flex items-center justify-between text-rose-300 text-xs font-medium mb-2">
            <span>Locked in Disputes</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-bold text-rose-400">$3,840.00</p>
          <p className="text-[11px] text-gray-400 mt-1">7 open buyer claims held</p>
        </div>

        <div className="glass-card p-5 border border-white/[0.08]">
          <div className="flex items-center justify-between text-gray-400 text-xs font-medium mb-2">
            <span>Overdue Invoices (30d+)</span>
            <AlertCircle className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-[#FFC43A]">$14,200.00</p>
          <p className="text-[11px] text-gray-400 mt-1">3 unpaid client invoices</p>
        </div>

        <div className="glass-card p-5 border border-white/[0.08]">
          <div className="flex items-center justify-between text-gray-400 text-xs font-medium mb-2">
            <span>Daily Net Burn</span>
            <TrendingUp className="w-4 h-4 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-gray-200">$1,567 / day</p>
          <p className="text-[11px] text-gray-400 mt-1">Payroll, hosting & logistics</p>
        </div>
      </div>

      {/* Interactive Simulator Card */}
      <div className="glass-card p-6 border border-white/[0.08]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-white">
              Interactive Capital Recovery Simulator
            </h3>
            <p className="text-xs text-gray-400">
              Toggle automated actions to see real-time impact on your cash runway
            </p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-md bg-[#0070BA]/20 text-[#0090E0] border border-[#0070BA]/30 font-medium">
            Live Simulation
          </span>
        </div>

        <div className="space-y-4 pt-2">
          {/* Toggle 1: Auto-Defense */}
          <div
            onClick={() => setDisputesResolved(!disputesResolved)}
            className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
              disputesResolved
                ? 'bg-[#0070BA]/10 border-[#0070BA]/40'
                : 'bg-black/30 border-white/[0.06] hover:border-white/20'
            }`}
          >
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={disputesResolved}
                onChange={() => {}}
                className="w-5 h-5 rounded text-[#0070BA] focus:ring-0 cursor-pointer"
              />
              <div>
                <p className="text-sm font-semibold text-white">
                  Execute Visa CE 3.0 Automated Rebuttal on 2 High-Value Disputes
                </p>
                <p className="text-xs text-gray-400">
                  Submits verified USPS tracking and buyer IP match for MacBook &amp; iPad sales
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">
                +12 Days Runway (+$3,840)
              </span>
            </div>
          </div>

          {/* Toggle 2: Collections */}
          <div
            onClick={() => setInvoicesCollected(!invoicesCollected)}
            className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
              invoicesCollected
                ? 'bg-[#FFC43A]/10 border-[#FFC43A]/40'
                : 'bg-black/30 border-white/[0.06] hover:border-white/20'
            }`}
          >
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={invoicesCollected}
                onChange={() => {}}
                className="w-5 h-5 rounded text-[#FFC43A] focus:ring-0 cursor-pointer"
              />
              <div>
                <p className="text-sm font-semibold text-white">
                  Dispatch Smart Autonomous Reminders for 3 Overdue Invoices
                </p>
                <p className="text-xs text-gray-400">
                  Polite risk-adjusted notification with instant 1-click PayPal payment links
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">
                +14 Days Runway (+$8,400)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
