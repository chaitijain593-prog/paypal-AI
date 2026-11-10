'use client';

import React from 'react';

interface DataSourceBadgeProps {
  source?: 'LIVE' | 'SIMULATED' | string;
  className?: string;
}

export default function DataSourceBadge({ source = 'SIMULATED', className = '' }: DataSourceBadgeProps) {
  const isLive = source === 'LIVE';
  return (
    <span
      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border inline-flex items-center gap-1.5 ${
        isLive
          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
          : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
      } ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
      DATA: {source}
    </span>
  );
}
