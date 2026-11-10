'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
}

export default function LoadingState({ message = 'Loading live data from FastAPI backend...' }: LoadingStateProps) {
  return (
    <div className="p-12 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex flex-col items-center justify-center text-center space-y-3">
      <Loader2 className="w-8 h-8 text-[#0070BA] animate-spin" />
      <p className="text-xs font-mono text-slate-400">{message}</p>
    </div>
  );
}
