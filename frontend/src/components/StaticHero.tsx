'use client';

import React from 'react';
import { ShieldCheck, Lock, CheckCircle2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function StaticHero() {
  return (
    <div className="relative w-full max-w-lg mx-auto">
      {/* Ambient Glow */}
      <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-[#0070BA]/30 to-[#00CF92]/20 blur-xl opacity-75 pointer-events-none" />

      {/* Main Glass Card */}
      <div className="relative rounded-2xl border border-white/10 bg-[#0B0F17]/90 backdrop-blur-xl p-6 shadow-2xl space-y-5">
        {/* Card Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0070BA]/20 border border-[#0070BA]/40 flex items-center justify-center text-[#00CF92]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-slate-400">DISPUTE-PP-9082</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  PENDING REVIEW
                </span>
              </div>
              <h4 className="text-sm font-semibold text-white mt-0.5">Autonomous Dispute Defense</h4>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400">At Risk</div>
            <div className="text-base font-bold text-white">$249.99</div>
          </div>
        </div>

        {/* Claim & Evidence Verification Summary */}
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-black/40 border border-white/5">
            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">Buyer Claim</div>
            <p className="text-xs text-slate-200">
              &quot;Tracking number shows delivered, but package was never left at my doorstep.&quot;
            </p>
          </div>

          <div className="p-3 rounded-xl bg-[#0070BA]/10 border border-[#0070BA]/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#00CF92] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Raw Evidence Merkle Audit Verified
              </span>
              <span className="text-[10px] font-mono text-slate-400">Ed25519 Signed</span>
            </div>
            <div className="text-xs text-slate-300 space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Carrier GPS Match:</span>
                <span className="font-mono text-slate-200">37.7749° N, -122.4194° W</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Adult Signature:</span>
                <span className="font-mono text-emerald-400">VERIFIED (J. DOE)</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Untrusted Input Firewall:</span>
                <span className="font-mono text-emerald-400">PASSED (0 threats)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Row */}
        <div className="pt-2 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Lock className="w-3.5 h-3.5 text-slate-500" />
            <span>Maker-Checker Protected</span>
          </div>
          <Link
            href="/approval-queue"
            className="px-3 py-1.5 rounded-lg bg-[#0070BA] hover:bg-[#005ea6] text-white font-medium flex items-center gap-1 transition-all"
          >
            <span>Review Queue</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
