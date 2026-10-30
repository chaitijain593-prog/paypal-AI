import React from 'react';
import DeviceShowcase3D from '@/components/DeviceShowcase3D';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '3D E-Wallet & Device Studio — PaySentinel AI',
  description: 'Interactive 3D isometric mobile device showcase for PayPal autonomous agent wallets, CE 3.0 dispute rebuttals, and fintech defense.',
};

export default function ShowcasePage() {
  return (
    <div className="space-y-6">
      <DeviceShowcase3D />
    </div>
  );
}
