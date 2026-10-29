'use client';

import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { motion } from 'framer-motion';

interface StatsCardProps {
  title: string;
  value: string;
  change: string;
  changeType: 'up' | 'down';
  icon: LucideIcon;
  gradient: string;
  glowColor: string;
  delay?: number;
}

export default function StatsCard({
  title,
  value,
  change,
  changeType,
  icon: Icon,
  gradient,
  glowColor,
  delay = 0,
}: StatsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={`glass-card p-6 relative overflow-hidden group cursor-default ${gradient}`}
    >
      {/* Background glow */}
      <div
        className={`absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl opacity-20 group-hover:opacity-30 transition-opacity ${glowColor}`}
      />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="p-2.5 rounded-xl bg-white/[0.05] border border-white/[0.06]">
            <Icon className="w-5 h-5 text-gray-400" />
          </div>
          <div
            className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
              changeType === 'up'
                ? 'text-emerald-400 bg-emerald-400/10'
                : 'text-red-400 bg-red-400/10'
            }`}
          >
            {changeType === 'up' ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {change}
          </div>
        </div>

        <p className="text-sm text-gray-400 mb-1">{title}</p>
        <p className="text-2xl font-bold tracking-tight text-white">{value}</p>
      </div>
    </motion.div>
  );
}
