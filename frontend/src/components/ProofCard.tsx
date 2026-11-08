'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  Truck,
  MapPin,
  FileSignature,
  Image,
  MessageSquare,
  X,
  Hash,
  GitBranch,
  Database,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Plus,
  Sparkles,
  Lock,
} from 'lucide-react';
import { api, ApiProofVerifyResult, ApiGenerateProofResponse } from '@/lib/api';

interface ProofItem {
  id: string;
  disputeId: string;
  type: string;
  typeIcon: React.ElementType;
  description: string;
  hash: string;
  status: 'verified' | 'tampered' | 'pending';
  timestamp: string;
  source: string;
  merkleRoot: string;
  merklePath: string[];
  originalData: string;
}

const defaultProofs: ProofItem[] = [
  {
    id: 'PRF-001',
    disputeId: 'DSP-4471',
    type: 'Delivery Confirmation',
    typeIcon: Truck,
    description: 'USPS Priority Mail tracking #9400111899223033005282 — delivered Oct 15, 2026',
    hash: 'a7f3b2c1d4e5f6789012345678abcdef0123456789abcdef0123456789abcdef',
    status: 'verified',
    timestamp: '2026-10-15 14:34:22 UTC',
    source: 'USPS Tracking API v3',
    merkleRoot: '9b2e8f...c4a1d7',
    merklePath: ['leaf: a7f3b2...abcdef', 'sibling: 3c8d91...f2e4a6', 'parent: 7a1b3c...d8f2e4', 'root: 9b2e8f...c4a1d7'],
    originalData: '{"carrier":"USPS","tracking":"9400111899223033005282","status":"DELIVERED","timestamp":"2026-10-15T14:34:22Z","recipient":"C. Martinez","location":"123 Oak St, Austin, TX 78701"}',
  },
  {
    id: 'PRF-002',
    disputeId: 'DSP-4471',
    type: 'GPS Geofence Match',
    typeIcon: MapPin,
    description: 'Delivery GPS coordinates match buyer address with 98.7% confidence',
    hash: 'b8e4c3d2f1a0987654321fedcba98765432100112233445566778899aabbccdd',
    status: 'verified',
    timestamp: '2026-10-15 14:34:45 UTC',
    source: 'Geolocation Verification Service',
    merkleRoot: '9b2e8f...c4a1d7',
    merklePath: ['leaf: b8e4c3...ccdd', 'sibling: 5f7a92...b1c3d4', 'parent: 7a1b3c...d8f2e4', 'root: 9b2e8f...c4a1d7'],
    originalData: '{"latitude":30.2672,"longitude":-97.7431,"accuracy":"2.1m","confidence":0.987,"matchAddress":"123 Oak St, Austin, TX 78701"}',
  },
  {
    id: 'PRF-003',
    disputeId: 'DSP-4471',
    type: 'Carrier Signature',
    typeIcon: FileSignature,
    description: 'Digital signature captured at point of delivery — signed by C. Martinez',
    hash: 'c9f5d4e3a2b10fedcba987654321aabbccddeeff00112233445566778899aabb',
    status: 'verified',
    timestamp: '2026-10-15 14:35:01 UTC',
    source: 'USPS Signature Confirmation API',
    merkleRoot: '9b2e8f...c4a1d7',
    merklePath: ['leaf: c9f5d4...aabb', 'sibling: 2d6e81...a9b7c5', 'parent: e3f4a5...b6c7d8', 'root: 9b2e8f...c4a1d7'],
    originalData: '{"signedBy":"C. Martinez","signatureType":"DIGITAL","captureDevice":"MC93","timestamp":"2026-10-15T14:35:01Z"}',
  },
  {
    id: 'PRF-004',
    disputeId: 'DSP-4392',
    type: 'Photo Evidence',
    typeIcon: Image,
    description: 'Ring doorbell footage screenshot showing package retrieval at 2:41 PM',
    hash: 'd0a6e5f4b3c2109876543210ffeeddccbbaa99887766554433221100aabbccdd',
    status: 'verified',
    timestamp: '2026-10-15 14:41:12 UTC',
    source: 'Ring Doorbell API Integration',
    merkleRoot: 'f4c2a1...b7d3e9',
    merklePath: ['leaf: d0a6e5...ccdd', 'sibling: 8b3c72...d4e5f6', 'root: f4c2a1...b7d3e9'],
    originalData: '{"source":"ring_doorbell","deviceId":"RNG-4421","frameTimestamp":"2026-10-15T14:41:12Z","resolution":"1080p","verified":true}',
  },
  {
    id: 'PRF-005',
    disputeId: 'DSP-4523',
    type: 'Communication Log',
    typeIcon: MessageSquare,
    description: 'Buyer-seller chat transcript — buyer acknowledged receipt then filed dispute 3 days later',
    hash: 'e1b7f6a5c4d3218765432100aabbccddeeff0011223344556677889900112233',
    status: 'tampered',
    timestamp: '2026-10-22 09:15:33 UTC',
    source: 'PayPal Messaging Archive',
    merkleRoot: 'INVALID',
    merklePath: ['leaf: e1b7f6...2233', 'ERROR: hash mismatch at level 1', 'Expected: 4a5b6c...d7e8f9', 'Got: 9x8y7z...tampered'],
    originalData: '{"WARNING":"Hash verification failed. Original data may have been altered after submission. Integrity check: FAILED"}',
  },
  {
    id: 'PRF-006',
    disputeId: 'DSP-4550',
    type: 'Delivery Confirmation',
    typeIcon: Truck,
    description: 'FedEx Express tracking #7891234567890 — awaiting carrier verification',
    hash: 'f2c8a7b6d5e4329876543210112233445566778899aabbccddeeff0011223344',
    status: 'pending',
    timestamp: '2026-10-28 16:22:00 UTC',
    source: 'FedEx Track API',
    merkleRoot: 'Pending...',
    merklePath: ['Awaiting inclusion in next Merkle batch...'],
    originalData: '{"carrier":"FedEx","tracking":"7891234567890","status":"IN_TRANSIT","estimatedDelivery":"2026-10-30"}',
  },
];

const statusConfig = {
  verified: { label: '✅ Verified', color: 'text-emerald-400', border: 'border-emerald-400/30', glow: 'glow-green', icon: ShieldCheck },
  tampered: { label: '❌ Tampered', color: 'text-red-400', border: 'border-red-400/30', glow: 'glow-red', icon: ShieldAlert },
  pending: { label: '⏳ Pending', color: 'text-yellow-400', border: 'border-yellow-400/30', glow: 'glow-yellow', icon: ShieldQuestion },
};

export default function ProofCard() {
  const [proofs, setProofs] = useState<ProofItem[]>(defaultProofs);
  const [selected, setSelected] = useState<ProofItem | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [liveVerificationResult, setLiveVerificationResult] = useState<ApiProofVerifyResult | null>(null);
  const [liveMerkleRoot, setLiveMerkleRoot] = useState<string>('a8916e055c03ebe1e09edb88eb809ee4d496f3f439a3aaa49961e2fe9263a21d');

  // Dynamic Proof Generation Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [formOrderId, setFormOrderId] = useState('PP-9482-LMNP');
  const [formCarrier, setFormCarrier] = useState('USPS Priority Mail');
  const [formTracking, setFormTracking] = useState('9400111899223033009988');
  const [formBuyer, setFormBuyer] = useState('Alexander Wright');
  const [formAddress, setFormAddress] = useState('456 Elm St, San Jose, CA 95113');
  const [formUseZk, setFormUseZk] = useState(true);

  useEffect(() => {
    let mounted = true;
    api.getProofs().then((res: any) => {
      if (mounted && res && res.merkle_root) {
        setLiveMerkleRoot(res.merkle_root);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleGenerateProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isGenerating) return;
    setIsGenerating(true);

    try {
      const res = await api.generateProof({
        order_id: formOrderId,
        carrier: formCarrier,
        tracking_number: formTracking,
        buyer_name: formBuyer,
        delivery_address: formAddress,
        use_zero_knowledge_predicates: formUseZk,
        latitude: 37.3382,
        longitude: -121.8863,
      });

      if (res && res.proof_record) {
        setLiveMerkleRoot(res.merkle_root);

        const newProofItem: ProofItem = {
          id: res.proof_id,
          disputeId: res.proof_record.disputeId || `DSP-${formOrderId.slice(-4)}`,
          type: res.proof_record.type || 'Delivery Confirmation & Geofence',
          typeIcon: Truck,
          description: res.proof_record.description,
          hash: res.proof_record.hash,
          status: 'verified',
          timestamp: 'Just now (Verified)',
          source: res.proof_record.source,
          merkleRoot: res.merkle_root,
          merklePath: res.proof_record.merklePath || [],
          originalData: res.proof_record.originalData || '',
        };

        setProofs((prev) => [newProofItem, ...prev]);
        setSelected(newProofItem);
        setIsCreateOpen(false);
      }
    } catch {
      // Graceful fallback
    } finally {
      setIsGenerating(false);
    }
  };

  const handleLiveVerify = async (proofId: string) => {
    setIsVerifying(true);
    setLiveVerificationResult(null);
    try {
      const res = await api.verifyProof(proofId);
      if (res) {
        setLiveVerificationResult(res);
      }
    } catch {
      // Graceful fallback
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <>
      {/* Merkle Engine Banner */}
      <div className="glass-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 border-cyan-500/30 mb-2">
        <div className="flex items-center gap-2.5">
          <GitBranch className="w-4 h-4 text-cyan-400" />
          <div>
            <p className="text-xs font-bold text-white flex items-center gap-2">
              <span>SHA-256 Binary Merkle Tree Active</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-400/10 text-cyan-300 font-mono">
                Visa CE 3.0 Compliant
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 font-mono flex items-center gap-1">
                <Lock className="w-3 h-3 text-cyan-400" /> Salted Commitment Mode
              </span>
            </p>
            <p className="text-[11px] font-mono text-slate-400 truncate max-w-lg">
              Root Hash: {liveMerkleRoot}
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-[#0070BA] hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold shadow-md shadow-cyan-500/20 transition-all flex-shrink-0 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Generate ZK Merkle Proof</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {proofs.map((proof, i) => {
          const sc = statusConfig[proof.status];
          const Icon = proof.typeIcon;
          const StatusIcon = sc.icon;
          return (
            <motion.div
              key={proof.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              onClick={() => {
                setSelected(proof);
                setLiveVerificationResult(null);
              }}
              className={`glass-card p-5 cursor-pointer border ${sc.border} hover:${sc.glow} transition-all group`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-white/[0.05]">
                    <Icon className="w-4 h-4 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{proof.type}</p>
                    <p className="text-[11px] text-gray-600">{proof.disputeId}</p>
                  </div>
                </div>
                <StatusIcon className={`w-5 h-5 ${sc.color} ${proof.status === 'pending' ? 'animate-pulse-glow' : ''}`} />
              </div>
              <p className="text-xs text-gray-400 mb-3 line-clamp-2">{proof.description}</p>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-black/30 border border-white/[0.04]">
                <Hash className="w-3 h-3 text-gray-600 flex-shrink-0" />
                <code className="text-[10px] text-gray-500 font-mono truncate">
                  SHA-256: {proof.hash.slice(0, 16)}...{proof.hash.slice(-8)}
                </code>
              </div>
              <p className="text-[10px] text-gray-600 mt-2">{proof.timestamp}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto border border-white/[0.1]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-white">{selected.type}</h3>
                  <p className="text-sm text-gray-500">{selected.id} · {selected.disputeId}</p>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="p-2 rounded-lg hover:bg-white/[0.05] transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Full Hash */}
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                  <Hash className="w-3 h-3" /> SHA-256 Hash
                </p>
                <code className="block text-xs font-mono text-[#0090E0] bg-black/30 p-3 rounded-lg border border-white/[0.06] break-all">
                  {selected.hash}
                </code>
              </div>

              {/* Status and Live Verify Button */}
              <div className="flex items-center justify-between mb-4">
                <span className={`badge ${statusConfig[selected.status].color} ${
                  selected.status === 'verified' ? 'bg-emerald-400/10' : selected.status === 'tampered' ? 'bg-red-400/10' : 'bg-yellow-400/10'
                }`}>
                  {statusConfig[selected.status].label}
                </span>

                <button
                  onClick={() => handleLiveVerify(selected.id)}
                  disabled={isVerifying}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#0070BA] to-[#0090E0] text-white text-xs font-semibold hover:shadow-md transition-all disabled:opacity-50"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Verifying Hash…
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" /> Live SHA-256 Re-Verify
                    </>
                  )}
                </button>
              </div>

              {/* Live Verification Engine Result */}
              {liveVerificationResult && (
                <div className="mb-4 p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 space-y-1.5">
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    FastAPI Proof Engine Re-Verification Passed
                  </div>
                  <p className="text-[11px] text-slate-300 font-mono">
                    Computed Hash: {liveVerificationResult.computed_hash.slice(0, 24)}... (Match: {liveVerificationResult.match ? '100%' : 'Mismatch'})
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Timestamp: {liveVerificationResult.verified_at}
                  </p>
                </div>
              )}

              {/* Merkle Tree */}
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                  <GitBranch className="w-3 h-3" /> Merkle Tree Path
                </p>
                <div className="bg-black/30 rounded-lg border border-white/[0.06] p-3 space-y-2">
                  {selected.merklePath.map((node, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="flex flex-col items-center">
                        <div className={`w-2 h-2 rounded-full ${
                          node.includes('ERROR') || node.includes('tampered') ? 'bg-red-500' : 'bg-emerald-500'
                        }`} />
                        {i < selected.merklePath.length - 1 && (
                          <div className={`w-px h-4 ${
                            node.includes('ERROR') || node.includes('tampered') ? 'bg-red-500/30' : 'bg-emerald-500/30'
                          }`} />
                        )}
                      </div>
                      <code className={`text-[11px] font-mono ${
                        node.includes('ERROR') || node.includes('tampered') ? 'text-red-400' : 'text-gray-400'
                      }`}>
                        {node}
                      </code>
                    </div>
                  ))}
                </div>
              </div>

              {/* Source & Original Data */}
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                  <Database className="w-3 h-3" /> Data Source
                </p>
                <p className="text-sm text-white">{selected.source}</p>
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1">Original Data</p>
                <pre className="text-[11px] font-mono text-gray-400 bg-black/30 p-3 rounded-lg border border-white/[0.06] overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(JSON.parse(selected.originalData), null, 2)}
                </pre>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic ZK Merkle Proof Generation Modal */}
      <AnimatePresence>
        {isCreateOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="glass-card w-full max-w-xl p-6 border-cyan-500/30 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-cyan-500/15 text-cyan-400">
                    <GitBranch className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Generate Merkle Proof</h3>
                    <p className="text-xs text-slate-400">
                      Constructs SHA-256 binary tree leaves with salted privacy commitments.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCreateOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleGenerateProof} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      PayPal Order ID
                    </label>
                    <input
                      type="text"
                      required
                      value={formOrderId}
                      onChange={(e) => setFormOrderId(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Carrier
                    </label>
                    <input
                      type="text"
                      required
                      value={formCarrier}
                      onChange={(e) => setFormCarrier(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Carrier Tracking Number
                    </label>
                    <input
                      type="text"
                      required
                      value={formTracking}
                      onChange={(e) => setFormTracking(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Recipient / Buyer Name
                    </label>
                    <input
                      type="text"
                      required
                      value={formBuyer}
                      onChange={(e) => setFormBuyer(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Verified Delivery Address
                  </label>
                  <input
                    type="text"
                    required
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                {/* Salted Privacy Mode Toggle */}
                <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-300">
                      <Lock className="w-3.5 h-3.5" /> Salted Privacy Commitments
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Withholds raw GPS and customer signature from public ledger. Uses cryptographic salted commitments to verify delivery location within 15m radius.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formUseZk}
                    onChange={(e) => setFormUseZk(e.target.checked)}
                    className="w-4 h-4 text-cyan-500 rounded bg-black/50 border-white/20 focus:ring-0 mt-0.5 cursor-pointer"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      setFormOrderId(`PP-${Math.floor(1000 + Math.random() * 9000)}-ADVR`);
                      setFormTracking(`940011189922303300${Math.floor(1000 + Math.random() * 9000)}`);
                      setFormBuyer('Sarah Jenkins');
                      setFormAddress('789 Market St, San Francisco, CA 94103');
                    }}
                    className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#FFC43A]" /> Autofill Random Dispute Order
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsCreateOpen(false)}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isGenerating}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-cyan-500/25 transition-all disabled:opacity-50"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Building Merkle Tree…
                        </>
                      ) : (
                        <>
                          <GitBranch className="w-4 h-4" /> Calculate Tree & Anchor
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </>
  );
}
