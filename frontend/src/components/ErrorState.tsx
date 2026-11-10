'use client';

import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message: string;
  paypalDebugId?: string;
  onRetry?: () => void;
}

export default function ErrorState({
  title = 'Backend Connection Error',
  message,
  paypalDebugId,
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="p-6 rounded-2xl bg-red-950/20 border border-red-500/30 text-red-200 my-4 space-y-3">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="text-sm font-bold text-red-100">{title}</h4>
          <p className="text-xs text-red-300/90 mt-1 leading-relaxed">{message}</p>
          {paypalDebugId && (
            <div className="mt-2 text-xs font-mono bg-black/40 p-2 rounded border border-red-500/30 text-amber-300">
              PayPal-Debug-Id: <span className="font-bold">{paypalDebugId}</span>
            </div>
          )}
        </div>
      </div>
      {onRetry && (
        <div className="pt-1 flex justify-end">
          <button
            onClick={onRetry}
            className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry Connection
          </button>
        </div>
      )}
    </div>
  );
}
