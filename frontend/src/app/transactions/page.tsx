import React from 'react';
import TransactionTable from '@/components/TransactionTable';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Transactions & Dispute Ledger | PaySentinel',
  description: 'High-frequency PayPal transaction ledger with interactive dispute inspection and proof drill-down.',
};

export default function TransactionsPage() {
  return (
    <div className="space-y-6">
      <TransactionTable />
    </div>
  );
}
