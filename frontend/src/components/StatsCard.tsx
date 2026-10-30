'use client';

import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string;
  change: string;
  changeType: 'up' | 'down';
  icon: LucideIcon;
  delay?: number;
}

export default function StatsCard({
  title,
  value,
  change,
  changeType,
  icon: Icon,
}: StatsCardProps) {
  return (
    <div className="p-5 rounded-xl bg-[#121826] border border-white/[0.06] hover:border-white/[0.12] transition-colors">
      <div className="flex items-center justify-between mb-4">
        <div className="p-2.5 rounded-lg bg-white/[0.04] text-[#3B9EFF]">
          <Icon className="w-5 h-5" />
        </div>
        <div
          className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
            changeType === 'up'
              ? 'text-emerald-400 bg-emerald-400/10'
              : 'text-rose-400 bg-rose-400/10'
          }`}
        >
          {changeType === 'up' ? (
            <TrendingUp className="w-3.5 h-3.5" />
          ) : (
            <TrendingDown className="w-3.5 h-3.5" />
          )}
          <span>{change}</span>
        </div>
      </div>

      <p className="text-xs text-slate-400 mb-1">{title}</p>
      <p className="text-2xl font-bold tracking-tight text-white tabular-nums">{value}</p>
    </div>
  );
}
