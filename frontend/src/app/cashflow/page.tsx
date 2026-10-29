'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  ArrowRight,
  Lock,
  FileCheck,
  RefreshCw,
} from 'lucide-react';

interface DisputeItem {
  id: string;
  orderId: string;
  amount: number;
  reason: string;
  heldSince: string;
  proofStrength: number;
  canAutoRecover: boolean;
}

const mockDisputes: DisputeItem[] = [
  { id: 'DSP-4471', orderId: 'PP-7829-MNQR', amount: 1249.99, reason: 'Item Not Received', heldSince: '2 days ago', proofStrength: 98, canAutoRecover: true },
  { id: 'DSP-4472', orderId: 'PP-7835-UVWX', amount: 72.49, reason: 'Unauthorized Transaction', heldSince: '4 days ago', proofStrength: 94, canAutoRecover: true },
  { id: 'DSP-4473', orderId: 'PP-7839-KLMN', amount: 549.00, reason: 'Significantly Not as Described', heldSince: '5 days ago', proofStrength: 89, canAutoRecover: true },
  { id: 'DSP-4474', orderId: 'PP-7844-ZZXA', amount: 890.00, reason: 'Item Not Received', heldSince: '6 days ago', proofStrength: 97, canAutoRecover: true },
  { id: 'DSP-4475', orderId: 'PP-7850-BCDF', amount: 320.00, reason: 'Duplicate Charge', heldSince: '1 week ago', proofStrength: 92, canAutoRecover: true },
  { id: 'DSP-4476', orderId: 'PP-7858-POIU', amount: 480.00, reason: 'Item Not Received', heldSince: '1 week ago', proofStrength: 96, canAutoRecover: true },
  { id: 'DSP-4477', orderId: 'PP-7861-LKJH', amount: 278.52, reason: 'Item Not Received', heldSince: '9 days ago', proofStrength: 91, canAutoRecover: true },
];

export default function CashFlowPage() {
  const [disputesResolved, setDisputesResolved] = useState(true);
  const [invoicesCollected, setInvoicesCollected] = useState(false);
  const [recoveredDisputeIds, setRecoveredDisputeIds] = useState<string[]>([]);

  // Baseline 41 days.
  const additionalDays =
    (disputesResolved ? 12 : 0) + (invoicesCollected ? 14 : 0);
  const currentRunway = 41 + additionalDays;
  const capitalRecovered =
    (disputesResolved ? 3840 : 0) + (invoicesCollected ? 8400 : 0);

  const toggleDisputeRecovery = (id: string) => {
    if (recoveredDisputeIds.includes(id)) {
      setRecoveredDisputeIds(recoveredDisputeIds.filter((d) => d !== id));
    } else {
      setRecoveredDisputeIds([...recoveredDisputeIds, id]);
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#FFC43A]/15 text-[#FFC43A] border border-[#FFC43A]/30 flex items-center gap-1.5 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#FFC43A] animate-pulse" />
              Cash-Flow Runway Guardian Active
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#0070BA]/20 text-[#0090E0] border border-[#0070BA]/30">
              PayPal Balances Synced
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Cash-Flow Runway Guardian
          </h1>
          <p className="text-sm text-gray-400 mt-1 max-w-2xl">
            Real-time financial liquidity modeling: see exactly how open chargebacks and delayed receivables impact your operating runway.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-right">
            <p className="text-xs text-gray-400">Current Runway</p>
            <p className="text-xl font-bold text-white flex items-center gap-2">
              <span>{currentRunway} Days</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                +{additionalDays}d
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Main Runway Hero Gauge Card */}
      <div className="rounded-3xl p-6 lg:p-8 bg-gradient-to-br from-[#0E131F]/90 via-[#0A0D14]/90 to-[#121926]/90 border border-white/[0.08] shadow-2xl relative overflow-hidden backdrop-blur-xl">
        {/* Glow backdrop */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#FFC43A]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#0070BA]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left: Gauge & Score */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#FFC43A]">
                <Clock className="w-4 h-4" /> Operational Runway Score
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30">
                Healthy Trajectory
              </span>
            </div>

            <div className="flex items-baseline gap-4">
              <span className="text-6xl sm:text-7xl font-black tracking-tight text-white">
                {currentRunway}
              </span>
              <div>
                <span className="text-2xl font-bold text-gray-400">Days</span>
                <p className="text-xs text-gray-500">at current burn rate of $1,567/day</p>
              </div>

              {additionalDays > 0 && (
                <div className="ml-auto px-3.5 py-1.5 rounded-full text-sm font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                  <ArrowUpRight className="w-4 h-4" />
                  +{additionalDays} days unlocked
                </div>
              )}
            </div>

            {/* Glowing progress bar */}
            <div className="space-y-2">
              <div className="w-full h-4 rounded-full bg-black/60 border border-white/10 overflow-hidden p-0.5 relative">
                <motion.div
                  initial={{ width: '40%' }}
                  animate={{ width: `${Math.min(100, (currentRunway / 80) * 100)}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 via-[#FFC43A] to-emerald-400 shadow-[0_0_20px_rgba(255,196,58,0.5)]"
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400 font-medium">
                <span className="text-rose-400">Critical (&lt; 20 Days)</span>
                <span className="text-amber-400">Caution (20 - 45 Days)</span>
                <span className="text-emerald-400">Optimal (45+ Days)</span>
              </div>
            </div>
          </div>

          {/* Right: AI Recommendation Glass Box */}
          <div className="lg:col-span-5 p-6 rounded-2xl bg-[#070A10]/80 border border-[#FFC43A]/30 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-xs font-bold text-[#FFC43A]">
              <Sparkles className="w-4 h-4 text-[#FFC43A]" /> PaySentinel Intelligence
            </div>
            <p className="text-sm text-gray-200 leading-relaxed font-normal">
              &ldquo;Your operational runway is being restricted by <strong className="text-rose-400 font-bold">$3,840 held across 7 PayPal disputes</strong>. Submitting proof using our Visa CE 3.0 engine will immediately restore capital.&rdquo;
            </p>
            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
              <span className="text-gray-400">Restorable Capital:</span>
              <span className="text-base font-extrabold text-emerald-400">
                +${capitalRecovered.toLocaleString()} USD
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Financial Liquidity Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-[#0E131F]/70 border border-white/[0.08] hover:border-white/20 transition-all shadow-lg">
          <div className="flex items-center justify-between text-gray-400 text-xs font-medium mb-3">
            <span>Liquid Cash Balance</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-[#0090E0]">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white">$64,250.00</p>
          <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            PayPal Balance + Linked Wells Fargo
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-rose-500/[0.04] border border-rose-500/25 hover:border-rose-500/40 transition-all shadow-lg">
          <div className="flex items-center justify-between text-rose-300 text-xs font-medium mb-3">
            <span>Held in PayPal Disputes</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-400">$3,840.00</p>
          <p className="text-[11px] text-rose-300/70 mt-1">
            7 active claims frozen by PayPal
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-[#0E131F]/70 border border-white/[0.08] hover:border-white/20 transition-all shadow-lg">
          <div className="flex items-center justify-between text-gray-400 text-xs font-medium mb-3">
            <span>Overdue Invoices (30d+)</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-[#FFC43A]">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-[#FFC43A]">$14,200.00</p>
          <p className="text-[11px] text-gray-400 mt-1">
            3 enterprise accounts pending payment
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-[#0E131F]/70 border border-white/[0.08] hover:border-white/20 transition-all shadow-lg">
          <div className="flex items-center justify-between text-gray-400 text-xs font-medium mb-3">
            <span>Daily Net Burn Rate</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white">$1,567.00</p>
          <p className="text-[11px] text-gray-400 mt-1">
            Logistics, hosting, team &amp; merchant fees
          </p>
        </div>
      </div>

      {/* Interactive Capital Recovery Simulator */}
      <div className="rounded-2xl p-6 bg-[#0E131F]/60 border border-white/[0.08] shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-[#FFC43A]" /> Capital Recovery What-If Simulator
            </h3>
            <p className="text-xs text-gray-400">
              Toggle automated actions to see immediate expansion in operational cash runway
            </p>
          </div>
          <span className="text-xs px-3 py-1 rounded-full bg-[#0070BA]/20 text-[#0090E0] border border-[#0070BA]/30 font-bold self-start">
            Interactive Model
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Action 1 */}
          <div
            onClick={() => setDisputesResolved(!disputesResolved)}
            className={`p-5 rounded-2xl border cursor-pointer transition-all flex items-start gap-4 ${
              disputesResolved
                ? 'bg-[#0070BA]/15 border-[#0070BA]/50 shadow-[0_0_20px_rgba(0,112,186,0.15)]'
                : 'bg-black/30 border-white/[0.06] hover:border-white/20'
            }`}
          >
            <div className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center border ${
              disputesResolved ? 'bg-[#0070BA] border-[#0070BA] text-white' : 'border-white/20 bg-white/5'
            }`}>
              {disputesResolved && <CheckCircle2 className="w-4 h-4" />}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-white">
                  Automate Visa CE 3.0 Defense for 7 Disputes
                </p>
                <span className="text-xs font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                  +12 Days
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Synthesizes delivery hashes, GPS matches and buyer IP logs to contest chargebacks.
              </p>
              <p className="text-xs font-semibold text-emerald-400 mt-2">
                Restores: +$3,840.00 to balance
              </p>
            </div>
          </div>

          {/* Action 2 */}
          <div
            onClick={() => setInvoicesCollected(!invoicesCollected)}
            className={`p-5 rounded-2xl border cursor-pointer transition-all flex items-start gap-4 ${
              invoicesCollected
                ? 'bg-[#FFC43A]/15 border-[#FFC43A]/50 shadow-[0_0_20px_rgba(255,196,58,0.15)]'
                : 'bg-black/30 border-white/[0.06] hover:border-white/20'
            }`}
          >
            <div className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center border ${
              invoicesCollected ? 'bg-[#FFC43A] border-[#FFC43A] text-black' : 'border-white/20 bg-white/5'
            }`}>
              {invoicesCollected && <CheckCircle2 className="w-4 h-4" />}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-white">
                  Trigger Smart Collection Chaser on Overdue Invoices
                </p>
                <span className="text-xs font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                  +14 Days
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Dispatches risk-calibrated polite notifications with 1-click PayPal settlement.
              </p>
              <p className="text-xs font-semibold text-emerald-400 mt-2">
                Restores: +$8,400.00 to balance
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Dispute Capital Recovery Table */}
      <div className="rounded-2xl p-6 bg-[#0E131F]/60 border border-white/[0.08] shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">
              Disputed Capital Breakdown (7 Open Cases)
            </h3>
            <p className="text-xs text-gray-400">
              Recoverable funds currently withheld by PayPal awaiting compelling evidence
            </p>
          </div>
          <span className="text-xs font-semibold text-gray-400">
            Total Frozen: <strong className="text-rose-400">$3,840.00</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.08] text-gray-400">
                <th className="pb-3 font-semibold">Dispute ID</th>
                <th className="pb-3 font-semibold">Order ID</th>
                <th className="pb-3 font-semibold">Reason</th>
                <th className="pb-3 font-semibold">Amount Frozen</th>
                <th className="pb-3 font-semibold">Proof Strength</th>
                <th className="pb-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {mockDisputes.map((dispute) => {
                const isRecovered = recoveredDisputeIds.includes(dispute.id);
                return (
                  <tr key={dispute.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 font-mono font-bold text-[#0090E0]">{dispute.id}</td>
                    <td className="py-3.5 text-gray-300 font-mono">{dispute.orderId}</td>
                    <td className="py-3.5 text-gray-300">{dispute.reason}</td>
                    <td className="py-3.5 font-bold text-rose-400">
                      ${dispute.amount.toFixed(2)}
                    </td>
                    <td className="py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-black/60 overflow-hidden">
                          <div
                            className="h-full bg-emerald-400 rounded-full"
                            style={{ width: `${dispute.proofStrength}%` }}
                          />
                        </div>
                        <span className="text-emerald-400 font-semibold">{dispute.proofStrength}%</span>
                      </div>
                    </td>
                    <td className="py-3.5 text-right">
                      <button
                        onClick={() => toggleDisputeRecovery(dispute.id)}
                        className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-all ${
                          isRecovered
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-[#0070BA] hover:bg-[#005ea6] text-white shadow-md shadow-blue-500/20'
                        }`}
                      >
                        {isRecovered ? 'Evidence Submitted ✓' : 'Auto-Contest'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
