'use client';

import React from 'react';
import { motion, MotionValue, useTransform } from 'framer-motion';
import { CheckCircle2, Lock } from 'lucide-react';
import PhoneScreenContent from '@/components/PhoneScreenContent';

interface CSSPhoneHeroProps {
  progress?: MotionValue<number>;
}

export default function CSSPhoneHero({ progress }: CSSPhoneHeroProps) {
  // If progress is provided, can subtly respond to scroll
  return (
    <div className="relative w-full h-[580px] flex items-center justify-center select-none" style={{ perspective: '1400px' }}>
      <div
        className="relative w-full max-w-sm h-full flex items-center justify-center"
        style={{
          transformStyle: 'preserve-3d',
          transform: 'rotateX(8deg) rotateY(-22deg) rotateZ(3deg)',
        }}
      >
        {/* Main Realistic Phone Frame */}
        <div
          className="relative w-[310px] sm:w-[330px] h-[550px] rounded-[44px] p-[3px] select-none z-20"
          style={{
            background:
              'linear-gradient(135deg, rgba(255, 255, 255, 0.55) 0%, rgba(148, 163, 184, 0.3) 30%, rgba(30, 41, 59, 0.7) 70%, rgba(15, 23, 42, 0.95) 100%)',
            boxShadow: `
              inset 0 1px 1px 0 rgba(255, 255, 255, 0.45),
              24px 34px 55px -10px rgba(0, 0, 0, 0.8),
              10px 16px 28px -5px rgba(0, 0, 0, 0.5),
              0 0 50px 0 rgba(0, 112, 186, 0.18)
            `,
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Fake Thickness Backing Layer (translated -14px on Z) */}
          <div
            className="absolute inset-0 rounded-[44px] pointer-events-none"
            style={{
              transform: 'translateZ(-14px)',
              background:
                'linear-gradient(135deg, rgba(71, 85, 105, 0.5) 0%, rgba(15, 23, 42, 0.98) 100%)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.85)',
            }}
          />

          {/* Inner chassis */}
          <div className="w-full h-full rounded-[41px] bg-slate-950 p-2.5 relative overflow-hidden flex flex-col justify-between">
            {/* Dynamic Island */}
            <div className="absolute top-3.5 left-1/2 -translate-x-1/2 w-24 h-4 bg-black rounded-full z-40 flex items-center justify-between px-2.5">
              <div className="w-2 h-2 rounded-full bg-slate-900 border border-slate-800" />
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </div>

            {/* Glass reflection */}
            <div
              className="absolute inset-0 rounded-[34px] pointer-events-none z-30"
              style={{
                background:
                  'linear-gradient(135deg, rgba(255, 255, 255, 0.14) 0%, rgba(255, 255, 255, 0.04) 35%, transparent 60%)',
              }}
            />

            <PhoneScreenContent />
          </div>
        </div>

        {/* Floating Front Card (+80px on Z) */}
        <div
          style={{
            transform: 'translate3d(-36px, 20px, 80px) rotateY(10deg)',
            boxShadow:
              '-22px 32px 55px -10px rgba(0, 0, 0, 0.8), -8px 14px 22px -5px rgba(0, 0, 0, 0.55)',
          }}
          className="absolute -bottom-4 -left-6 sm:-left-12 w-[240px] rounded-xl bg-[#121826] border border-white/[0.08] p-4 z-30 select-none"
        >
          <div className="text-center space-y-2.5">
            <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 mx-auto flex items-center justify-center text-emerald-400 shadow-inner">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">
                CE 3.0 Rebuttal Won
              </p>
              <h3 className="text-sm font-bold text-white">Payment Confirmed</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Evidence verified by Visa &amp; PayPal
              </p>
            </div>
            <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-left text-[10px] space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Protected Balance:</span>
                <span className="font-semibold text-white tabular-nums">$1,249.99</span>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Back Card (-60px on Z) */}
        <div
          style={{
            transform: 'translate3d(32px, -20px, -60px) rotateY(-16deg)',
            boxShadow: '12px 18px 35px -5px rgba(0, 0, 0, 0.55)',
            opacity: 0.82,
            filter: 'blur(1px)',
          }}
          className="hidden sm:block absolute -top-4 -right-8 sm:-right-14 w-[240px] rounded-xl bg-[#121826] border border-white/[0.08] p-4 z-10 select-none"
        >
          <div className="rounded-lg p-3 bg-white/[0.04] border border-white/[0.06] space-y-1">
            <div className="flex items-center justify-between text-[9px] font-semibold uppercase text-slate-400">
              <span>BUYER AI AGENT</span>
              <span>AGENT #409</span>
            </div>
            <div>
              <p className="text-[10px] text-slate-400">Pre-Authorized Balance</p>
              <p className="text-lg font-bold text-white tabular-nums">$15,236.00</p>
            </div>
          </div>
          <div className="mt-2.5 space-y-1 text-[10px] text-slate-400">
            <div className="flex items-center justify-between p-1.5 rounded bg-white/[0.02]">
              <span>Spending Guard:</span>
              <span className="text-emerald-400 font-medium">Auto-Checkout Settle</span>
            </div>
            <div className="flex items-center justify-between p-1.5 rounded bg-white/[0.02]">
              <span>Catalog Verified:</span>
              <span className="text-[#3B9EFF] font-medium">SHA-256 Valid</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
