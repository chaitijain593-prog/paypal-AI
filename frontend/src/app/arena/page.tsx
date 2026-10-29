import React from 'react';
import DisputeArena from '@/components/DisputeArena';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dispute Arena — AI Red-Team Testing | PaySentinel',
  description: 'Adversarial red-teaming simulator pitting dishonest buyer attacks against deterministic AI dispute defenses.',
};

export default function ArenaPage() {
  return (
    <div className="space-y-6">
      <DisputeArena />
    </div>
  );
}
