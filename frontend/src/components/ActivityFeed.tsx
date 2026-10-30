'use client';

import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  DollarSign,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'dispute' | 'payment' | 'evidence' | 'alert' | 'resolution';
  title: string;
  description: string;
  time: string;
}

const activityData: ActivityItem[] = [
  {
    id: '1',
    type: 'dispute',
    title: 'New Dispute Filed',
    description: 'Buyer @carlos_m claims item not received for order #PP-7829',
    time: '2 min ago',
  },
  {
    id: '2',
    type: 'payment',
    title: 'Payment Received',
    description: '$2,450.00 from Acme Corp — Invoice #INV-0892',
    time: '18 min ago',
  },
  {
    id: '3',
    type: 'evidence',
    title: 'Evidence Submitted',
    description: 'Delivery confirmation uploaded for dispute #DSP-4471',
    time: '1 hr ago',
  },
  {
    id: '4',
    type: 'resolution',
    title: 'Dispute Resolved',
    description: 'Case #DSP-4392 closed in seller favor — evidence verified',
    time: '3 hr ago',
  },
  {
    id: '5',
    type: 'alert',
    title: 'Prompt Injection Detected',
    description: 'Arena defender blocked malicious input on simulation #SIM-0087',
    time: '5 hr ago',
  },
  {
    id: '6',
    type: 'payment',
    title: 'Refund Processed',
    description: '$189.99 refund issued for order #PP-6104',
    time: '8 hr ago',
  },
];

const iconMap = {
  dispute: { icon: AlertTriangle, color: 'text-rose-400', bg: 'bg-rose-400/10' },
  payment: { icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  evidence: { icon: FileText, color: 'text-[#3B9EFF]', bg: 'bg-[#0070BA]/10' },
  alert: { icon: ShieldAlert, color: 'text-amber-400', bg: 'bg-amber-400/10' },
  resolution: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
};

export default function ActivityFeed() {
  return (
    <div className="p-5 rounded-xl bg-[#121826] border border-white/[0.06]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-white">Recent Activity</h3>
        <button className="flex items-center gap-1 text-xs text-[#3B9EFF] hover:underline font-medium">
          View All <ArrowRight className="w-3 h-3" />
        </button>
      </div>
      <div className="space-y-1">
        {activityData.map((item) => {
          const { icon: Icon, color, bg } = iconMap[item.type];
          return (
            <div
              key={item.id}
              className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/[0.03] transition-colors cursor-pointer group"
            >
              <div className={`p-2 rounded-lg ${bg} mt-0.5 shrink-0`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white group-hover:text-[#3B9EFF] transition-colors truncate">
                  {item.title}
                </p>
                <p className="text-xs text-slate-400 truncate mt-0.5">
                  {item.description}
                </p>
              </div>
              <span className="text-[11px] text-slate-500 whitespace-nowrap tabular-nums">
                {item.time}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
