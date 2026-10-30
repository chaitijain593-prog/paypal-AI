'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  AlertCircle,
  ShieldAlert,
  ArrowUpRight,
  Sparkles,
  CheckCircle2,
  Wallet,
  Clock,
  Zap,
} from 'lucide-react';
import { api, ApiCashFlowRunway } from '@/lib/api';

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
  const [liveRunway, setLiveRunway] = useState<ApiCashFlowRunway | null>(null);

  useEffect(() => {
    let mounted = true;
    api.getCashFlowRunway().then((res) => {
      if (mounted && res) {
        setLiveRunway(res);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Baseline 41 days or live runway calculation
  const baseDays = liveRunway ? Math.round(liveRunway.runway_months * 30) : 41;
  const additionalDays =
    (disputesResolved ? 12 : 0) + (invoicesCollected ? 14 : 0);
  const currentRunway = baseDays + additionalDays;
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
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b border-white/[0.06]">
        <div>
          {/* Exactly ONE status badge per page header */}
          <div className="mb-3">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#0070BA]/15 text-[#3B9EFF] border border-[#0070BA]/30 inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Cash-Flow Runway Guardian Synced
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white leading-tight">
            Cash-Flow Runway Guardian
          </h1>
          <p className="text-sm text-slate-400 mt-2 leading-relaxed max-w-2xl">
            Real-time financial liquidity modeling: see how open chargebacks and delayed receivables impact your operating runway.
          </p>
        </div>
      </div>

      {/* Main Runway Hero Gauge Card (p-6, rounded-xl, no glow blur) */}
      <div className="p-6 lg:p-8 rounded-xl bg-[#121826] border border-white/[0.06]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left: Gauge & Score */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#3B9EFF]">
                <Clock className="w-4 h-4" /> Operational Runway Score
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                Healthy Trajectory
              </span>
            </div>

            <div className="flex items-baseline gap-4">
              <span className="text-6xl sm:text-7xl font-extrabold tracking-tight text-white tabular-nums">
                {currentRunway}
              </span>
              <div>
                <span className="text-2xl font-bold text-slate-400">Days</span>
                <p className="text-xs text-slate-500">at current burn rate of $1,567/day</p>
              </div>

              {additionalDays > 0 && (
                <div className="ml-auto px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                  <ArrowUpRight className="w-4 h-4" />
                  +{additionalDays} days unlocked
                </div>
              )}
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
              <div className="w-full h-3 rounded-full bg-white/[0.04] border border-white/[0.08] overflow-hidden p-0.5">
                <motion.div
                  initial={{ width: '40%' }}
                  animate={{ width: `${Math.min(100, (currentRunway / 80) * 100)}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className="h-full rounded-full bg-[#0070BA]"
                />
              </div>
              <div className="flex justify-between text-xs text-slate-400 font-medium">
                <span className="text-rose-400">Critical (&lt; 20 Days)</span>
                <span className="text-amber-400">Caution (20 - 45 Days)</span>
                <span className="text-emerald-400">Optimal (45+ Days)</span>
              </div>
            </div>
          </div>

          {/* Right: AI Recommendation Box */}
          <div className="lg:col-span-5 p-5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-[#3B9EFF]">
              <Sparkles className="w-4 h-4" /> PaySentinel Intelligence
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              Your operational runway is being restricted by <strong className="text-rose-400 font-semibold">$3,840 held across 7 PayPal disputes</strong>. Submitting proof using our Visa CE 3.0 engine restores working capital immediately.
            </p>
            <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
              <span className="text-slate-400">Restorable Capital:</span>
              <span className="text-base font-bold text-emerald-400 tabular-nums">
                +${capitalRecovered.toLocaleString()} USD
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Financial Liquidity Cards (gap-4, rounded-xl, p-5) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-[#121826] border border-white/[0.06]">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-3">
            <span>Liquid Cash Balance</span>
            <div className="p-2 rounded-lg bg-[#0070BA]/15 text-[#3B9EFF]">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white tabular-nums">$64,250.00</p>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            PayPal Balance + Linked Bank
          </p>
        </div>

        <div className="p-5 rounded-xl bg-[#121826] border border-white/[0.06]">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-3">
            <span>Held in PayPal Disputes</span>
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-rose-400 tabular-nums">$3,840.00</p>
          <p className="text-[11px] text-slate-400 mt-1">
            7 active claims frozen by PayPal
          </p>
        </div>

        <div className="p-5 rounded-xl bg-[#121826] border border-white/[0.06]">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-3">
            <span>Overdue Invoices (30d+)</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-amber-400 tabular-nums">$14,200.00</p>
          <p className="text-[11px] text-slate-400 mt-1">
            3 enterprise accounts pending payment
          </p>
        </div>

        <div className="p-5 rounded-xl bg-[#121826] border border-white/[0.06]">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-3">
            <span>Daily Net Burn Rate</span>
            <div className="p-2 rounded-lg bg-white/[0.05] text-slate-300">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white tabular-nums">$1,567.00</p>
          <p className="text-[11px] text-slate-400 mt-1">
            Logistics, hosting, and fees
          </p>
        </div>
      </div>

      {/* Interactive Capital Recovery Simulator (p-6, rounded-xl) */}
      <div className="p-6 rounded-xl bg-[#121826] border border-white/[0.06] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#3B9EFF]" /> Capital Recovery Simulator
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Toggle automated actions to see immediate expansion in operational cash runway
            </p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-[#0070BA]/15 text-[#3B9EFF] border border-[#0070BA]/30 font-medium self-start">
            Interactive Model
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Action 1 */}
          <div
            onClick={() => setDisputesResolved(!disputesResolved)}
            className={`p-5 rounded-xl border cursor-pointer transition-colors flex items-start gap-4 ${
              disputesResolved
                ? 'bg-[#0070BA]/10 border-[#0070BA]/40'
                : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12]'
            }`}
          >
            <div className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center border shrink-0 ${
              disputesResolved ? 'bg-[#0070BA] border-[#0070BA] text-white' : 'border-white/20 bg-white/5'
            }`}>
              {disputesResolved && <CheckCircle2 className="w-3.5 h-3.5" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-white truncate">
                  Automate Visa CE 3.0 Defense for 7 Disputes
                </p>
                <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded shrink-0">
                  +12 Days
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Synthesizes delivery hashes, GPS matches and buyer IP logs to contest chargebacks.
              </p>
              <p className="text-xs font-semibold text-emerald-400 mt-2 tabular-nums">
                Restores: +$3,840.00 to balance
              </p>
            </div>
          </div>

          {/* Action 2 */}
          <div
            onClick={() => setInvoicesCollected(!invoicesCollected)}
            className={`p-5 rounded-xl border cursor-pointer transition-colors flex items-start gap-4 ${
              invoicesCollected
                ? 'bg-[#0070BA]/10 border-[#0070BA]/40'
                : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12]'
            }`}
          >
            <div className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center border shrink-0 ${
              invoicesCollected ? 'bg-[#0070BA] border-[#0070BA] text-white' : 'border-white/20 bg-white/5'
            }`}>
              {invoicesCollected && <CheckCircle2 className="w-3.5 h-3.5" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-white truncate">
                  Trigger Smart Collection Chaser on Invoices
                </p>
                <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded shrink-0">
                  +14 Days
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Dispatches risk-calibrated polite notifications with 1-click PayPal settlement.
              </p>
              <p className="text-xs font-semibold text-emerald-400 mt-2 tabular-nums">
                Restores: +$8,400.00 to balance
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Dispute Capital Recovery Table */}
      <div className="p-6 rounded-xl bg-[#121826] border border-white/[0.06] space-y-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-base font-bold text-white">
              Disputed Capital Breakdown
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Recoverable funds currently withheld by PayPal awaiting compelling evidence
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.06] text-slate-400">
                <th className="pb-3 font-semibold">Dispute ID</th>
                <th className="pb-3 font-semibold">Order ID</th>
                <th className="pb-3 font-semibold">Reason</th>
                <th className="pb-3 font-semibold text-right">Amount Frozen</th>
                <th className="pb-3 font-semibold text-center">Proof Strength</th>
                <th className="pb-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {mockDisputes.map((dispute) => {
                const isRecovered = recoveredDisputeIds.includes(dispute.id);
                return (
                  <tr key={dispute.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 font-mono font-semibold text-[#3B9EFF]">{dispute.id}</td>
                    <td className="py-3.5 text-slate-300 font-mono">{dispute.orderId}</td>
                    <td className="py-3.5 text-slate-300">{dispute.reason}</td>
                    <td className="py-3.5 font-semibold text-rose-400 text-right tabular-nums">
                      ${dispute.amount.toFixed(2)}
                    </td>
                    <td className="py-3.5">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                          <div
                            className="h-full bg-emerald-400 rounded-full"
                            style={{ width: `${dispute.proofStrength}%` }}
                          />
                        </div>
                        <span className="text-emerald-400 font-semibold tabular-nums">{dispute.proofStrength}%</span>
                      </div>
                    </td>
                    <td className="py-3.5 text-right">
                      <button
                        onClick={() => toggleDisputeRecovery(dispute.id)}
                        className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors ${
                          isRecovered
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-[#0070BA] hover:bg-[#005ea6] text-white'
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
