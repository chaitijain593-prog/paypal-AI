'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  Download,
  ExternalLink,
  Copy,
  Table as TableIcon,
  ShieldAlert,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { AgGridReact } from 'ag-grid-react';
import {
  AllCommunityModule,
  ColDef,
  GridApi,
  GridReadyEvent,
  ModuleRegistry,
  themeQuartz,
} from 'ag-grid-community';
import { api, ApiTransaction } from '@/lib/api';

// Register all Community features for AG Grid v36
ModuleRegistry.registerModules([AllCommunityModule]);

// Dark Fintech AG Grid Custom Theme
const fintechDarkTheme = themeQuartz.withParams({
  backgroundColor: '#0E1726',
  browserColorScheme: 'dark',
  foregroundColor: '#F8FAFC',
  headerTextColor: '#94A3B8',
  headerBackgroundColor: '#0A101D',
  headerFontSize: 12,
  rowBorder: { color: 'rgba(148, 163, 184, 0.08)' },
  borderColor: 'rgba(148, 163, 184, 0.12)',
  accentColor: '#0070BA',
});

export interface GridTransaction {
  id: string;
  date: string;
  buyer: string;
  buyerEmail: string;
  amount: number;
  status: 'Completed' | 'Pending' | 'Disputed' | 'Refunded';
  type: string;
  description: string;
  paymentMethod: string;
  hasDispute: boolean;
  disputeId?: string | null;
}

const defaultTransactions: GridTransaction[] = [
  { id: 'PP-7829-MNQR', date: '2026-10-28', buyer: 'Carlos Martinez', buyerEmail: 'carlos.m@email.com', amount: 1249.99, status: 'Disputed', type: 'Product Sale', description: 'MacBook Pro M4 - Space Black', paymentMethod: 'PayPal Balance', hasDispute: true, disputeId: 'PP-D-80001' },
  { id: 'PP-7830-ABCD', date: '2026-10-28', buyer: 'Sarah Johnson', buyerEmail: 'sarah.j@email.com', amount: 89.50, status: 'Completed', type: 'Service', description: 'Monthly SaaS Subscription - Enterprise', paymentMethod: 'Credit Card', hasDispute: false },
  { id: 'PP-7831-EFGH', date: '2026-10-27', buyer: 'Acme Corporation', buyerEmail: 'billing@acme.com', amount: 2450.00, status: 'Completed', type: 'Invoice', description: 'Consulting Services - October 2026', paymentMethod: 'Bank Transfer', hasDispute: false },
  { id: 'PP-7832-IJKL', date: '2026-10-27', buyer: 'Mike Chen', buyerEmail: 'mike.c@email.com', amount: 349.00, status: 'Pending', type: 'Product Sale', description: 'Sony WH-1000XM6 Headphones', paymentMethod: 'PayPal Credit', hasDispute: false },
  { id: 'PP-7833-MNOP', date: '2026-10-26', buyer: 'Emily Watson', buyerEmail: 'emily.w@email.com', amount: 189.99, status: 'Refunded', type: 'Product Sale', description: 'Wireless Keyboard Bundle', paymentMethod: 'Debit Card', hasDispute: false },
  { id: 'PP-7834-QRST', date: '2026-10-26', buyer: 'TechStart Inc.', buyerEmail: 'pay@techstart.io', amount: 5200.00, status: 'Completed', type: 'Invoice', description: 'API Integration Project - Phase 2', paymentMethod: 'PayPal Balance', hasDispute: false },
  { id: 'PP-7835-UVWX', date: '2026-10-25', buyer: 'James Lee', buyerEmail: 'james.l@email.com', amount: 72.49, status: 'Disputed', type: 'Product Sale', description: 'USB-C Hub Adapter', paymentMethod: 'Credit Card', hasDispute: true, disputeId: 'PP-D-80002' },
  { id: 'PP-7836-YZAB', date: '2026-10-25', buyer: 'Nina Patel', buyerEmail: 'nina.p@email.com', amount: 420.00, status: 'Completed', type: 'Service', description: 'Design Consultation - 3 Hours', paymentMethod: 'PayPal Balance', hasDispute: false },
  { id: 'PP-7837-CDEF', date: '2026-10-24', buyer: 'Global Trade LLC', buyerEmail: 'ap@globaltrade.com', amount: 8750.00, status: 'Pending', type: 'Invoice', description: 'Bulk Order - Q4 Inventory', paymentMethod: 'Bank Transfer', hasDispute: false },
  { id: 'PP-7838-GHIJ', date: '2026-10-24', buyer: 'Alex Rivera', buyerEmail: 'alex.r@email.com', amount: 159.99, status: 'Completed', type: 'Product Sale', description: 'Smart Home Starter Kit', paymentMethod: 'PayPal Credit', hasDispute: false },
  { id: 'PP-7839-KLMN', date: '2026-10-23', buyer: 'Diana Foster', buyerEmail: 'diana.f@email.com', amount: 549.00, status: 'Disputed', type: 'Product Sale', description: 'iPad Air M3 - Blue', paymentMethod: 'Credit Card', hasDispute: true, disputeId: 'PP-D-80003' },
  { id: 'PP-7840-OPQR', date: '2026-10-23', buyer: 'BuildRight Co.', buyerEmail: 'invoices@buildright.com', amount: 3200.00, status: 'Completed', type: 'Invoice', description: 'Construction Materials - Site B', paymentMethod: 'Bank Transfer', hasDispute: false },
];

const statusStyles: Record<string, { color: string; bg: string; border: string }> = {
  Completed: { color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' },
  Pending: { color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20' },
  Disputed: { color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20' },
  Refunded: { color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20' },
};

function normalizeStatus(raw: string): 'Completed' | 'Pending' | 'Disputed' | 'Refunded' {
  const upper = raw.toUpperCase();
  if (upper === 'COMPLETED') return 'Completed';
  if (upper === 'PENDING') return 'Pending';
  if (upper === 'DISPUTED') return 'Disputed';
  if (upper === 'REFUNDED') return 'Refunded';
  return 'Completed';
}

export default function TransactionTable() {
  const [rowData, setRowData] = useState<GridTransaction[]>(defaultTransactions);
  const [quickFilter, setQuickFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [backendSynced, setBackendSynced] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const gridApiRef = useRef<GridApi<GridTransaction> | null>(null);

  // Sync with live FastAPI backend
  useEffect(() => {
    let mounted = true;
    api.getTransactions().then((res) => {
      if (mounted && res && res.transactions && res.transactions.length > 0) {
        setBackendSynced(true);
        const mapped: GridTransaction[] = res.transactions.map((t: ApiTransaction) => ({
          id: t.id,
          date: t.created_at ? t.created_at.slice(0, 10) : '2026-10-28',
          buyer: t.buyer?.name || 'Buyer',
          buyerEmail: t.buyer?.email || 'buyer@example.com',
          amount: t.amount,
          status: normalizeStatus(t.status),
          type: t.type || 'Product Sale',
          description: t.description || 'PayPal Payment',
          paymentMethod: t.payment_method || 'PayPal',
          hasDispute: t.has_dispute || false,
          disputeId: t.dispute_id,
        }));
        setRowData(mapped);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const onGridReady = (params: GridReadyEvent<GridTransaction>) => {
    gridApiRef.current = params.api;
  };

  const onQuickFilterChanged = (val: string) => {
    setQuickFilter(val);
    if (gridApiRef.current) {
      gridApiRef.current.setGridOption('quickFilterText', val);
    }
  };

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
    if (status === 'All') {
      onQuickFilterChanged('');
    } else {
      onQuickFilterChanged(status);
    }
  };

  const handleExportCsv = () => {
    if (gridApiRef.current) {
      gridApiRef.current.exportDataAsCsv({
        fileName: `PaySentinel_Ledger_${new Date().toISOString().slice(0, 10)}.csv`,
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // AG Grid Column Definitions
  const colDefs = useMemo<ColDef<GridTransaction>[]>(() => {
    return [
      {
        field: 'id',
        headerName: 'Transaction ID',
        minWidth: 190,
        pinned: 'left',
        cellRenderer: (params: any) => {
          const val = params.value;
          return (
            <div className="flex items-center gap-1.5 h-full">
              <span className="font-mono text-xs text-[#0090E0] font-semibold">{val}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  copyToClipboard(val);
                }}
                className="p-1 hover:text-white text-gray-500 rounded transition-colors"
                title="Copy ID"
              >
                {copiedId === val ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>
          );
        },
      },
      {
        field: 'date',
        headerName: 'Date',
        width: 120,
        sortable: true,
        filter: true,
      },
      {
        field: 'buyer',
        headerName: 'Buyer Info',
        minWidth: 200,
        cellRenderer: (params: any) => {
          const row: GridTransaction = params.data;
          return (
            <div className="flex flex-col justify-center h-full">
              <p className="text-xs font-semibold text-white leading-tight">{row.buyer}</p>
              <p className="text-[11px] text-gray-500 leading-tight">{row.buyerEmail}</p>
            </div>
          );
        },
      },
      {
        field: 'description',
        headerName: 'Item Description',
        minWidth: 240,
        flex: 1,
      },
      {
        field: 'amount',
        headerName: 'Amount',
        width: 130,
        sortable: true,
        cellRenderer: (params: any) => {
          return (
            <span className="font-semibold text-white">
              ${Number(params.value).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          );
        },
      },
      {
        field: 'status',
        headerName: 'Dispute Status',
        width: 150,
        cellRenderer: (params: any) => {
          const val = params.value as string;
          const style = statusStyles[val] || statusStyles.Completed;
          const hasDispute = params.data?.hasDispute;
          return (
            <div className="flex items-center gap-1.5 h-full">
              <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${style.color} ${style.bg} ${style.border}`}>
                {val}
              </span>
              {hasDispute && (
                <span title="Active Chargeback Risk">
                  <ShieldAlert className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                </span>
              )}
            </div>
          );
        },
      },
      {
        field: 'paymentMethod',
        headerName: 'Payment Method',
        width: 150,
      },
      {
        headerName: 'Actions',
        width: 140,
        sortable: false,
        filter: false,
        cellRenderer: (params: any) => {
          return (
            <div className="flex items-center gap-2 h-full">
              <button
                onClick={() => window.open('https://sandbox.paypal.com', '_blank')}
                className="flex items-center gap-1 text-[11px] text-[#0070BA] hover:text-[#0090E0] font-semibold transition-colors"
              >
                <ExternalLink className="w-3 h-3" /> PayPal
              </button>
            </div>
          );
        },
      },
    ];
  }, [copiedId]);

  return (
    <div className="space-y-4">
      {/* Top Header & Sponsor Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              backendSynced ? 'bg-emerald-400 animate-pulse' : 'bg-cyan-400'
            }`}
          />
          <span className="text-xs text-slate-400 font-medium">
            {backendSynced
              ? 'FastAPI Live Ledger Synced (:8000/api/transactions)'
              : 'Standby / Live Ledger Ready'}
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FF6900]/15 text-[#FF6900] border border-[#FF6900]/30 flex items-center gap-1">
            <TableIcon className="w-2.5 h-2.5" /> AG Grid v36 Enterprise Grade
          </span>
        </div>

        {/* Export Button */}
        <button
          onClick={handleExportCsv}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-semibold text-slate-300 hover:text-white transition-all shadow-sm"
        >
          <Download className="w-3.5 h-3.5 text-[#0090E0]" /> Export CSV
        </button>
      </div>

      {/* Filter & Quick Search Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Quick search across all columns (buyer, amount, status, ID)..."
            value={quickFilter}
            onChange={(e) => onQuickFilterChanged(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#0070BA]/50 focus:ring-1 focus:ring-[#0070BA]/20 transition-all"
          />
        </div>
        <div className="flex gap-2">
          {['All', 'Completed', 'Pending', 'Disputed', 'Refunded'].map((status) => (
            <button
              key={status}
              onClick={() => handleStatusFilter(status)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                statusFilter === status
                  ? 'bg-[#0070BA]/15 text-[#0090E0] border-[#0070BA]/30 font-bold'
                  : 'bg-white/[0.03] text-gray-500 border-white/[0.06] hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              <Filter className="w-3 h-3 inline mr-1" />
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* AG Grid Container */}
      <div className="glass-card overflow-hidden p-2">
        <div style={{ height: 560, width: '100%' }}>
          <AgGridReact<GridTransaction>
            theme={fintechDarkTheme}
            rowData={rowData}
            columnDefs={colDefs}
            onGridReady={onGridReady}
            pagination={true}
            paginationPageSize={10}
            animateRows={true}
            defaultColDef={{
              sortable: true,
              filter: true,
              resizable: true,
            }}
          />
        </div>
      </div>
    </div>
  );
}
