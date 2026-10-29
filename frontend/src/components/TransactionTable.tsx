'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Copy,
} from 'lucide-react';

interface Transaction {
  id: string;
  date: string;
  buyer: string;
  buyerEmail: string;
  amount: number;
  status: 'Completed' | 'Pending' | 'Disputed' | 'Refunded';
  type: string;
  description: string;
  paymentMethod: string;
}

const transactions: Transaction[] = [
  { id: 'PP-7829-MNQR', date: '2026-10-28', buyer: 'Carlos Martinez', buyerEmail: 'carlos.m@email.com', amount: 1249.99, status: 'Disputed', type: 'Product Sale', description: 'MacBook Pro M4 - Space Black', paymentMethod: 'PayPal Balance' },
  { id: 'PP-7830-ABCD', date: '2026-10-28', buyer: 'Sarah Johnson', buyerEmail: 'sarah.j@email.com', amount: 89.50, status: 'Completed', type: 'Service', description: 'Monthly SaaS Subscription - Enterprise', paymentMethod: 'Credit Card' },
  { id: 'PP-7831-EFGH', date: '2026-10-27', buyer: 'Acme Corporation', buyerEmail: 'billing@acme.com', amount: 2450.00, status: 'Completed', type: 'Invoice', description: 'Consulting Services - October 2026', paymentMethod: 'Bank Transfer' },
  { id: 'PP-7832-IJKL', date: '2026-10-27', buyer: 'Mike Chen', buyerEmail: 'mike.c@email.com', amount: 349.00, status: 'Pending', type: 'Product Sale', description: 'Sony WH-1000XM6 Headphones', paymentMethod: 'PayPal Credit' },
  { id: 'PP-7833-MNOP', date: '2026-10-26', buyer: 'Emily Watson', buyerEmail: 'emily.w@email.com', amount: 189.99, status: 'Refunded', type: 'Product Sale', description: 'Wireless Keyboard Bundle', paymentMethod: 'Debit Card' },
  { id: 'PP-7834-QRST', date: '2026-10-26', buyer: 'TechStart Inc.', buyerEmail: 'pay@techstart.io', amount: 5200.00, status: 'Completed', type: 'Invoice', description: 'API Integration Project - Phase 2', paymentMethod: 'PayPal Balance' },
  { id: 'PP-7835-UVWX', date: '2026-10-25', buyer: 'James Lee', buyerEmail: 'james.l@email.com', amount: 72.49, status: 'Disputed', type: 'Product Sale', description: 'USB-C Hub Adapter', paymentMethod: 'Credit Card' },
  { id: 'PP-7836-YZAB', date: '2026-10-25', buyer: 'Nina Patel', buyerEmail: 'nina.p@email.com', amount: 420.00, status: 'Completed', type: 'Service', description: 'Design Consultation - 3 Hours', paymentMethod: 'PayPal Balance' },
  { id: 'PP-7837-CDEF', date: '2026-10-24', buyer: 'Global Trade LLC', buyerEmail: 'ap@globaltrade.com', amount: 8750.00, status: 'Pending', type: 'Invoice', description: 'Bulk Order - Q4 Inventory', paymentMethod: 'Bank Transfer' },
  { id: 'PP-7838-GHIJ', date: '2026-10-24', buyer: 'Alex Rivera', buyerEmail: 'alex.r@email.com', amount: 159.99, status: 'Completed', type: 'Product Sale', description: 'Smart Home Starter Kit', paymentMethod: 'PayPal Credit' },
  { id: 'PP-7839-KLMN', date: '2026-10-23', buyer: 'Diana Foster', buyerEmail: 'diana.f@email.com', amount: 549.00, status: 'Disputed', type: 'Product Sale', description: 'iPad Air M3 - Blue', paymentMethod: 'Credit Card' },
  { id: 'PP-7840-OPQR', date: '2026-10-23', buyer: 'BuildRight Co.', buyerEmail: 'invoices@buildright.com', amount: 3200.00, status: 'Completed', type: 'Invoice', description: 'Construction Materials - Site B', paymentMethod: 'Bank Transfer' },
];

const statusConfig = {
  Completed: { color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' },
  Pending: { color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20' },
  Disputed: { color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20' },
  Refunded: { color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20' },
};

export default function TransactionTable() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [sortField, setSortField] = useState<'date' | 'amount'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const filtered = transactions
    .filter((t) => {
      const matchesSearch =
        t.id.toLowerCase().includes(search.toLowerCase()) ||
        t.buyer.toLowerCase().includes(search.toLowerCase()) ||
        t.description.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortField === 'date') {
        return sortDir === 'desc' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date);
      }
      return sortDir === 'desc' ? b.amount - a.amount : a.amount - b.amount;
    });

  const toggleSort = (field: 'date' | 'amount') => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search transactions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#0070BA]/50 focus:ring-1 focus:ring-[#0070BA]/20 transition-all"
          />
        </div>
        <div className="flex gap-2">
          {['All', 'Completed', 'Pending', 'Disputed', 'Refunded'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                statusFilter === status
                  ? 'bg-[#0070BA]/15 text-[#0090E0] border-[#0070BA]/30'
                  : 'bg-white/[0.03] text-gray-500 border-white/[0.06] hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              <Filter className="w-3 h-3 inline mr-1" />
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">Transaction ID</th>
                <th
                  className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4 cursor-pointer hover:text-gray-300 transition-colors"
                  onClick={() => toggleSort('date')}
                >
                  <span className="flex items-center gap-1">
                    Date
                    {sortField === 'date' && (sortDir === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />)}
                  </span>
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">Buyer</th>
                <th
                  className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4 cursor-pointer hover:text-gray-300 transition-colors"
                  onClick={() => toggleSort('amount')}
                >
                  <span className="flex items-center gap-1 justify-end">
                    Amount
                    {sortField === 'amount' && (sortDir === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />)}
                  </span>
                </th>
                <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">Status</th>
                <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">Details</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((tx) => {
                const sc = statusConfig[tx.status];
                const isExpanded = expandedRow === tx.id;
                return (
                  <React.Fragment key={tx.id}>
                    <tr
                      className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors cursor-pointer"
                      onClick={() => setExpandedRow(isExpanded ? null : tx.id)}
                    >
                      <td className="px-6 py-4">
                        <span className="text-sm font-mono text-[#0090E0]">{tx.id}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">{tx.date}</td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-white">{tx.buyer}</p>
                        <p className="text-xs text-gray-600">{tx.buyerEmail}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-semibold text-white">
                          ${tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`badge ${sc.color} ${sc.bg} border ${sc.border}`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-gray-500 mx-auto" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-500 mx-auto" />
                        )}
                      </td>
                    </tr>
                    <AnimatePresence>
                      {isExpanded && (
                        <tr>
                          <td colSpan={6}>
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="px-6 py-4 bg-white/[0.02] border-b border-white/[0.06]">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                  <div>
                                    <p className="text-xs text-gray-500 mb-1">Description</p>
                                    <p className="text-sm text-white">{tx.description}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500 mb-1">Type</p>
                                    <p className="text-sm text-white">{tx.type}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500 mb-1">Payment Method</p>
                                    <p className="text-sm text-white">{tx.paymentMethod}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button className="flex items-center gap-1 text-xs text-[#0070BA] hover:text-[#0090E0] transition-colors">
                                      <ExternalLink className="w-3 h-3" /> View in PayPal
                                    </button>
                                    <button className="flex items-center gap-1 text-xs text-gray-500 hover:text-white transition-colors">
                                      <Copy className="w-3 h-3" /> Copy ID
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          </td>
                        </tr>
                      )}
                    </AnimatePresence>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
