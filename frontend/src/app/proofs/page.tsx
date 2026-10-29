import React from 'react';
import ProofCard from '@/components/ProofCard';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Proof Vault — Cryptographic Evidence Ledger | PaySentinel',
  description: 'Tamper-evident SHA-256 Merkle proof chain for Visa CE 3.0 dispute rebuttals.',
};

export default function ProofsPage() {
  return (
    <div className="space-y-6">
      <ProofCard />
    </div>
  );
}
