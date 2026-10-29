'use client';

import React from 'react';
import { motion } from 'framer-motion';
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
  dispute: { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-400/10' },
  payment: { icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  evidence: { icon: FileText, color: 'text-blue-400', bg: 'bg-blue-400/10' },
  alert: { icon: ShieldAlert, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  resolution: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
};

export default function ActivityFeed() {
  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
        <button className="flex items-center gap-1 text-xs text-[#0070BA] hover:text-[#0090E0] transition-colors font-medium">
          View All <ArrowRight className="w-3 h-3" />
        </button>
      </div>
      <div className="space-y-1">
        {activityData.map((item, index) => {
          const { icon: Icon, color, bg } = iconMap[item.type];
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.08 }}
              className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/[0.02] transition-colors cursor-pointer group"
            >
              <div className={`p-2 rounded-lg ${bg} mt-0.5`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white group-hover:text-[#0090E0] transition-colors">
                  {item.title}
                </p>
                <p className="text-xs text-gray-500 mt-0.5 truncate">{item.description}</p>
              </div>
              <span className="text-[11px] text-gray-600 whitespace-nowrap mt-1">{item.time}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
