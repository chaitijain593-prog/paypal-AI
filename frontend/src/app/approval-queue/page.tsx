'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  DollarSign,
  FileText,
  Lock,
  ArrowRight,
  ExternalLink,
  Edit3,
  RotateCcw,
  Send,
  User,
  Hash,
  Activity,
  Layers,
  Sparkles,
  ChevronRight,
  Info,
  Check,
  Copy,
  FileCheck,
  Building,
  Mail,
} from 'lucide-react';
import {
  api,
  ApiControlTowerItem,
  ApiControlTowerSummaryKPI,
  ApiProofClaim,
  ApiAuditTrailEntry,
} from '@/lib/api';
import DataSourceBadge from '@/components/DataSourceBadge';
import ErrorState from '@/components/ErrorState';
import LoadingState from '@/components/LoadingState';

export default function ApprovalQueuePage() {
  const [items, setItems] = useState<ApiControlTowerItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'pending' | 'resolved'>('pending');
  const [isEditingDefense, setIsEditingDefense] = useState<boolean>(false);
  const [editedLetter, setEditedLetter] = useState<string>('');
  const [reviewerNotes, setReviewerNotes] = useState<string>('');
  const [reviewerName, setReviewerName] = useState<string>('Merchant Admin');
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
    paypalDebugId?: string;
  } | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<number | null>(null);
  const [verifyingChain, setVerifyingChain] = useState<boolean>(false);
  const [chainVerificationResult, setChainVerificationResult] = useState<{
    itemId: string;
    verified: boolean;
    details: string;
  } | null>(null);

  const handleVerifyChain = async (itemId: string) => {
    setVerifyingChain(true);
    try {
      const res = await api.verifyAuditChain(itemId);
      if (res) {
        setChainVerificationResult({
          itemId: res.item_id,
          verified: res.verified,
          details: res.details,
        });
      }
    } catch (err: any) {
      setChainVerificationResult({
        itemId,
        verified: false,
        details: err?.message || 'Verification request failed.',
      });
    } finally {
      setVerifyingChain(false);
    }
  };

  useEffect(() => {
    setCurrentTime(Date.now());
    const timer = setInterval(() => setCurrentTime(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Fetch live items from FastAPI backend — no silent mock fallback
  const loadItems = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await api.getControlTowerItems();
      if (res && res.items) {
        setItems(res.items);
        if (res.items.length > 0) {
          setSelectedId((prev) => (res.items.some((i) => i.id === prev) ? prev : res.items[0].id));
        }
      } else {
        setFetchError('Backend returned empty or invalid response. Ensure backend is running.');
      }
    } catch (err: any) {
      setFetchError(err?.message || 'Failed to connect to backend on port 8000.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  // Compute selected item
  const selectedItem = useMemo(() => {
    const found = items.find((i) => i.id === selectedId);
    return found || items[0] || null;
  }, [items, selectedId]);

  // Sync edited letter when selection changes
  useEffect(() => {
    if (selectedItem) {
      setEditedLetter(selectedItem.drafted_defense_letter);
      setIsEditingDefense(false);
      setReviewerNotes('');
    }
  }, [selectedItem?.id]);

  // Telemetry KPIs
  const pendingItems = useMemo(
    () => items.filter((i) => i.status === 'PENDING_REVIEW'),
    [items]
  );
  const resolvedItems = useMemo(
    () => items.filter((i) => i.status !== 'PENDING_REVIEW'),
    [items]
  );

  const totalAtRisk = useMemo(
    () => pendingItems.reduce((acc, curr) => acc + curr.amount, 0),
    [pendingItems]
  );

  const urgentCount = useMemo(() => {
    if (!currentTime) return 1;
    return pendingItems.filter((i) => {
      const diff = new Date(i.sla_deadline).getTime() - currentTime;
      return diff < 24 * 3600 * 1000 && diff > 0;
    }).length;
  }, [pendingItems, currentTime]);

  const feesSaved = useMemo(
    () => resolvedItems.reduce((acc, curr) => acc + curr.dispute_fee_at_risk, 0),
    [resolvedItems]
  );

  // SLA time helper
  const formatSla = (isoDeadline: string) => {
    if (!currentTime) return { text: '18h left', urgent: true, label: 'Standard SLA' };
    const diff = new Date(isoDeadline).getTime() - currentTime;
    if (diff <= 0) return { text: 'EXPIRED', urgent: true, label: 'Deadline Passed' };
    const hours = Math.floor(diff / (3600 * 1000));
    const mins = Math.floor((diff % (3600 * 1000)) / (60 * 1000));
    if (hours < 24) {
      return { text: `${hours}h ${mins}m left`, urgent: true, label: 'Urgent SLA' };
    }
    return { text: `${hours}h left`, urgent: false, label: 'Standard SLA' };
  };

  // Copy hash helper
  const copyToClipboard = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2200);
  };

  // Actions
  const handleApprove = async () => {
    if (!selectedItem) return;
    setActionLoading(true);
    setFeedbackBanner(null);
    try {
      const updated = await api.approveControlTowerItem(selectedItem.id, {
        reviewer_name: reviewerName,
        reviewer_notes: reviewerNotes || 'Approved drafted defense for PayPal Sandbox dispatch.',
      });
      if (updated) {
        setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        const lastAudit = updated.audit_trail[updated.audit_trail.length - 1];
        setFeedbackBanner({
          type: 'success',
          message: `Dispute ${selectedItem.dispute_id} approved. Dispatch status: ${lastAudit?.paypal_api_status || 'SIMULATED_NOT_SENT'}.`,
        });
      }
    } catch (err: any) {
      setFeedbackBanner({
        type: 'error',
        message: `Failed to approve dispute: ${err?.message || 'Network error connecting to backend.'}`,
        paypalDebugId: err?.paypalDebugId,
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditSubmit = async () => {
    if (!selectedItem) return;
    if (!editedLetter.trim()) {
      setFeedbackBanner({ type: 'error', message: 'Defense letter cannot be empty.' });
      return;
    }
    setActionLoading(true);
    setFeedbackBanner(null);
    try {
      const updated = await api.editControlTowerItem(selectedItem.id, {
        updated_defense_letter: editedLetter,
        reviewer_name: reviewerName,
        reviewer_notes: reviewerNotes || 'Merchant operator modified rebuttal wording before PayPal submission.',
      });
      if (updated) {
        setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        setIsEditingDefense(false);
        const lastAudit = updated.audit_trail[updated.audit_trail.length - 1];
        setFeedbackBanner({
          type: 'success',
          message: `Revisions saved! Dispute ${selectedItem.dispute_id} updated. Dispatch status: ${lastAudit?.paypal_api_status || 'SIMULATED_NOT_SENT'}.`,
        });
      }
    } catch (err: any) {
      setFeedbackBanner({
        type: 'error',
        message: `Failed to save revisions: ${err?.message || 'Network error connecting to backend.'}`,
        paypalDebugId: err?.paypalDebugId,
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectConcede = async () => {
    if (!selectedItem) return;
    setActionLoading(true);
    setFeedbackBanner(null);
    try {
      const updated = await api.rejectControlTowerItem(selectedItem.id, {
        resolution_strategy: 'CONCEDE_AND_REFUND',
        reviewer_name: reviewerName,
        reviewer_notes: reviewerNotes || 'Conceded claim early to waive the $15 PayPal dispute penalty fee.',
      });
      if (updated) {
        setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        const lastAudit = updated.audit_trail[updated.audit_trail.length - 1];
        setFeedbackBanner({
          type: 'info',
          message: `Dispute ${selectedItem.dispute_id} conceded. Dispatch status: ${lastAudit?.paypal_api_status || 'SIMULATED_NOT_SENT'}.`,
        });
      }
    } catch (err: any) {
      setFeedbackBanner({
        type: 'error',
        message: `Failed to concede dispute: ${err?.message || 'Network error connecting to backend.'}`,
        paypalDebugId: err?.paypalDebugId,
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetDemo = async () => {
    setActionLoading(true);
    try {
      const res = await api.resetControlTowerStore();
      if (res && res.items) {
        setItems(res.items);
        if (res.items.length > 0) {
          setSelectedId(res.items[0].id);
        }
        setFeedbackBanner({
          type: 'info',
          message: 'Control Tower queue reset to 3 original demo cases.',
        });
      } else {
        setFeedbackBanner({
          type: 'error',
          message: 'Backend reset succeeded but returned no items.',
        });
      }
    } catch (err: any) {
      setFeedbackBanner({
        type: 'error',
        message: `Failed to reset demo queue: ${err?.message || 'Network error connecting to backend.'}`,
      });
    } finally {
      setActionLoading(false);
    }
  };

  const displayList = activeTab === 'pending' ? pendingItems : resolvedItems;

  return (
    <div className="space-y-6">
      {/* ── Top Header Banner & Reset Button ─────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-white/[0.06]">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#0070BA]/20 text-[#3B9EFF] border border-[#0070BA]/30 inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Human-in-the-Loop (HITL) Firewall Active
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
              Safety Ceiling: $500.00
            </span>
            <DataSourceBadge source={items[0]?.data_source || 'SIMULATED'} />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white leading-tight flex items-center gap-3">
            Human Control Tower &amp; Approval Queue
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Deterministic merchant protection: AI drafts defenses and flags high-value or ambiguous chargebacks for human sign-off before real money moves.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleResetDemo}
            disabled={actionLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-semibold text-slate-300 hover:text-white transition-all shadow-sm"
            title="Reset queue to 3 initial hackathon demo disputes"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#3B9EFF]" />
            Reset Demo Cases
          </button>
        </div>
      </div>

      {/* ── Connection / Fetch Error Alert ─────────────────────────────────── */}
      {fetchError && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 flex items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            <div>
              <p className="font-semibold text-red-200">Backend Connection Error</p>
              <p className="text-xs text-red-300/80">{fetchError}</p>
            </div>
          </div>
          <button
            onClick={loadItems}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-xs font-semibold text-red-200 transition-all shrink-0"
          >
            {loading ? 'Retrying...' : 'Retry Connection'}
          </button>
        </div>
      )}

      {/* ── 1. Top Executive Telemetry Bar ──────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Capital at Risk */}
        <div className="p-5 rounded-2xl bg-[#121826] border border-white/[0.06]">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
            <span>Capital Under Review</span>
            <DollarSign className="w-4 h-4 text-[#3B9EFF]" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white mt-2">
            ${totalAtRisk.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Paused across {pendingItems.length} open high-stake disputes
          </p>
        </div>

        {/* Pending Decisions */}
        <div className="p-5 rounded-2xl bg-[#121826] border border-white/[0.06]">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
            <span>Pending Approvals</span>
            <ShieldAlert className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-400 mt-2 flex items-baseline gap-1.5">
            <span>{pendingItems.length}</span>
            <span className="text-xs font-semibold text-slate-400">Decisions</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Awaiting merchant operator authorization</p>
        </div>

        {/* Urgent SLA (<24h) */}
        <div className="p-5 rounded-2xl bg-[#121826] border border-white/[0.06]">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
            <span>Urgent SLA (&lt;24h)</span>
            <Clock className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-red-400 mt-2 flex items-baseline gap-1.5">
            <span>{urgentCount}</span>
            <span className="text-xs font-semibold text-slate-400">Urgent Case</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Requires response to prevent default loss</p>
        </div>

        {/* Audit Trail Integrity */}
        <div className="p-5 rounded-2xl bg-[#121826] border border-white/[0.06]">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
            <span>Audit Trail Integrity</span>
            <FileCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 mt-2 flex items-baseline gap-1.5">
            <span>100%</span>
            <span className="text-xs font-semibold text-slate-400">Deterministic</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            ${feesSaved.toFixed(0)} dispute fees saved to date
          </p>
        </div>
      </div>

      {/* ── Status Feedback Banner ──────────────────────────────────────── */}
      <AnimatePresence>
        {feedbackBanner && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm font-medium ${
              feedbackBanner.type === 'success'
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                : feedbackBanner.type === 'error'
                ? 'bg-red-500/15 border-red-500/30 text-red-300'
                : 'bg-[#0070BA]/20 border-[#0070BA]/40 text-[#3B9EFF]'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {feedbackBanner.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : feedbackBanner.type === 'error' ? (
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              ) : (
                <Info className="w-4 h-4 text-[#3B9EFF] shrink-0 mt-0.5" />
              )}
              <div>
                <span>{feedbackBanner.message}</span>
                {feedbackBanner.paypalDebugId && (
                  <div className="mt-1 font-mono text-xs text-amber-300 bg-black/40 px-2 py-0.5 rounded border border-amber-500/30 inline-block">
                    PayPal Debug ID: {feedbackBanner.paypalDebugId}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              {feedbackBanner.type === 'error' && (
                <button
                  onClick={handleApprove}
                  disabled={actionLoading}
                  className="px-3 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/40 text-xs font-semibold flex items-center gap-1 transition-all"
                >
                  <RotateCcw className="w-3 h-3" />
                  Retry Submission
                </button>
              )}
              <button
                onClick={() => setFeedbackBanner(null)}
                className="text-xs opacity-70 hover:opacity-100 px-2 py-1"
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Explicit Backend Error or Loading Banner */}
      {fetchError && (
        <ErrorState
          title="Approval Queue Unavailable"
          message={fetchError}
          onRetry={loadItems}
        />
      )}

      {loading && !fetchError && (
        <LoadingState message="Connecting to FastAPI Control Tower on port 8000..." />
      )}

      {/* ── 2. Split-Pane Master-Detail Layout ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ================================================================= */}
        {/* LEFT PANE: Queue List & Filters (4 Columns)                       */}
        {/* ================================================================= */}
        <div className="lg:col-span-4 space-y-4">
          {/* Queue Tab Buttons */}
          <div className="flex p-1 bg-white/[0.04] rounded-xl border border-white/[0.06]">
            <button
              onClick={() => setActiveTab('pending')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'pending'
                  ? 'bg-[#0070BA] text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Pending Review</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
                {pendingItems.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('resolved')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'resolved'
                  ? 'bg-[#0070BA] text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Resolved &amp; Log</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
                {resolvedItems.length}
              </span>
            </button>
          </div>

          {/* Dispute Cards List */}
          <div className="space-y-3">
            {displayList.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-[#121826] border border-white/[0.06] text-slate-400 text-xs">
                No items in this queue tab.
              </div>
            ) : (
              displayList.map((item) => {
                const isSelected = item.id === selectedItem?.id;
                const sla = formatSla(item.sla_deadline);
                const isApproved = item.status === 'APPROVED_AND_SUBMITTED';
                const isEdited = item.status === 'EDITED_AND_SUBMITTED';
                const isConceded = item.status === 'REJECTED_CONCEDED';

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    className={`p-4 rounded-2xl transition-all cursor-pointer border select-none ${
                      isSelected
                        ? 'bg-[#152033] border-[#3B9EFF] shadow-lg shadow-[#0070BA]/20'
                        : 'bg-[#121826] border-white/[0.06] hover:bg-white/[0.03] hover:border-white/[0.12]'
                    }`}
                  >
                    {/* Card Top: Dispute ID + Amount */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#3B9EFF]">
                          {item.dispute_id}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-white/[0.06] text-slate-400">
                          {item.id}
                        </span>
                      </div>
                      <span className="text-sm font-extrabold text-white">
                        ${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}{' '}
                        <span className="text-[10px] text-slate-400 font-normal">
                          {item.currency}
                        </span>
                      </span>
                    </div>

                    {/* Product Name */}
                    <p className="text-xs font-semibold text-slate-200 mt-1 line-clamp-1">
                      {item.item_name}
                    </p>

                    {/* SLA and Confidence Row */}
                    <div className="flex items-center justify-between mt-3 text-[11px]">
                      {/* SLA Badge */}
                      <span
                        className={`inline-flex items-center gap-1 font-semibold ${
                          item.status !== 'PENDING_REVIEW'
                            ? 'text-slate-400'
                            : sla.urgent
                            ? 'text-red-400 animate-pulse font-bold'
                            : 'text-amber-400 font-medium'
                        }`}
                      >
                        <Clock className="w-3 h-3" />
                        {item.status !== 'PENDING_REVIEW' ? 'Finalized' : sla.text}
                      </span>

                      {/* AI Confidence Pill */}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          item.ai_confidence_score >= 0.8
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : item.ai_confidence_score >= 0.5
                            ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                            : 'bg-red-500/15 text-red-400 border-red-500/30'
                        }`}
                      >
                        {Math.round(item.ai_confidence_score * 100)}% Confidence
                      </span>
                    </div>

                    {/* Triggers Tags */}
                    <div className="mt-2.5 flex flex-wrap gap-1">
                      {item.escalation_triggers.slice(0, 2).map((trigger, idx) => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.5 rounded text-[9.5px] font-medium bg-white/[0.04] text-slate-300 border border-white/[0.06] line-clamp-1"
                        >
                          {trigger}
                        </span>
                      ))}
                      {item.firewall_injection_flagged && (
                        <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                          🛡️ Prompt Injection Neutralized
                        </span>
                      )}
                    </div>

                    {/* Final Status pill if resolved */}
                    {item.status !== 'PENDING_REVIEW' && (
                      <div className="mt-3 pt-2 border-t border-white/[0.06] flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Resolution:</span>
                        <span
                          className={`font-bold ${
                            isApproved
                              ? 'text-emerald-400'
                              : isEdited
                              ? 'text-[#3B9EFF]'
                              : 'text-purple-400'
                          }`}
                        >
                          {isApproved
                            ? '✓ Approved'
                            : isEdited
                            ? '✎ Edited & Sent'
                            : '↩ Conceded ($15 Saved)'}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ================================================================= */}
        {/* RIGHT PANE: Evidence & Decision Workbench (8 Columns)             */}
        {/* ================================================================= */}
        <div className="lg:col-span-8 space-y-6">
          {selectedItem ? (
            <div className="p-6 rounded-2xl bg-[#121826] border border-white/[0.06] space-y-6">
              {/* Header: Dispute Meta & Customer Identifier */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-white/[0.06]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-white font-mono">
                      {selectedItem.dispute_id}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-white/[0.06] text-slate-300 font-semibold">
                      Order: {selectedItem.transaction_id}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${
                      selectedItem.draft_status === 'DRAFT_FAILED' || selectedItem.draft_status === 'LLM_UNAVAILABLE'
                        ? 'bg-red-500/15 text-red-400 border-red-500/30'
                        : selectedItem.draft_status === 'NO_EVIDENCE'
                        ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                        : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    }`}>
                      Draft: {selectedItem.draft_status || 'AI_DRAFTED'}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-[#0070BA]/20 text-[#3B9EFF] border border-[#0070BA]/30">
                      Fee at Risk: ${selectedItem.dispute_fee_at_risk.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      {selectedItem.buyer_name}
                    </span>
                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      {selectedItem.buyer_email}
                    </span>
                    <span className="font-semibold text-white">
                      ${selectedItem.amount.toFixed(2)} {selectedItem.currency}
                    </span>
                  </div>
                </div>

                {/* Status Indicator */}
                <div className="text-right">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold border ${
                      selectedItem.status === 'PENDING_REVIEW'
                        ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                        : selectedItem.status === 'APPROVED_AND_SUBMITTED'
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : selectedItem.status === 'EDITED_AND_SUBMITTED'
                        ? 'bg-[#0070BA]/20 text-[#3B9EFF] border-[#0070BA]/40'
                        : 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-current" />
                    {selectedItem.status.replace(/_/g, ' ')}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-1">
                    SLA: {formatSla(selectedItem.sla_deadline).text}
                  </p>
                </div>
              </div>

              {/* SECTION A: Why AI Paused & Untrusted Message Firewall */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-400" />
                    Why AI Paused Autonomous Execution
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">
                    Confidence: {Math.round(selectedItem.ai_confidence_score * 100)}%
                  </span>
                </div>

                {/* Triggers Pills & AI Recommendation Banner */}
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {selectedItem.escalation_triggers.map((trigger, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/25"
                      >
                        ⚠️ {trigger}
                      </span>
                    ))}
                  </div>

                  {/* AI Recommended Action Banner */}
                  <div className="p-3 rounded-xl bg-[#152033] border border-[#3B9EFF]/30 flex items-start gap-3">
                    <Sparkles className="w-4 h-4 text-[#3B9EFF] shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <p className="font-bold text-white flex items-center gap-2">
                        <span>AI Recommended Action:</span>
                        <span className="text-[#3B9EFF] underline font-mono">
                          {selectedItem.ai_recommended_action}
                        </span>
                      </p>
                      <p className="text-slate-300 mt-1 leading-relaxed">
                        {selectedItem.ai_rationale}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Untrusted Message Firewall Card */}
                <div className="p-4 rounded-xl bg-[#0F172A] border border-white/[0.08] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-300 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-emerald-400" />
                      Untrusted Message Firewall Inspection
                    </span>
                    {selectedItem.firewall_injection_flagged ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                        ⚡ Adversarial Prompt Injection Neutralized
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        ✓ Clean Buyer Message
                      </span>
                    )}
                  </div>
                  <div className="p-3 rounded-lg bg-black/40 border border-white/[0.04] text-xs font-mono text-slate-300 leading-relaxed">
                    &ldquo;{selectedItem.buyer_raw_message}&rdquo;
                  </div>
                  {selectedItem.firewall_details && (
                    <p className="text-[11px] text-slate-400 italic">
                      {selectedItem.firewall_details}
                    </p>
                  )}
                </div>
              </div>

              {/* SECTION B: Side-by-Side Evidence Preview vs Drafted Defense */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left Sub-Column: Verified Evidence Locker */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-[#3B9EFF]" />
                      Verified Evidence Locker ({selectedItem.proof_claims.length})
                    </h4>
                    <span className="text-[10px] font-bold text-emerald-400">
                      Seller Protection Ready
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {selectedItem.proof_claims.map((claim) => (
                      <div
                        key={claim.claim_id}
                        className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-2 hover:border-[#3B9EFF]/40 transition-colors"
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-white flex items-center gap-1">
                            <FileText className="w-3 h-3 text-[#3B9EFF]" />
                            {claim.source_type.replace(/_/g, ' ')}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">
                            {claim.source_record_id}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {claim.statement_text}
                        </p>
                        <button
                          onClick={() => copyToClipboard(claim.sha256_hash)}
                          className="w-full text-left p-1.5 rounded bg-black/30 border border-white/[0.04] flex items-center justify-between font-mono text-[10px] text-emerald-400 hover:text-emerald-300 transition-colors"
                          title="Click to copy full SHA-256 hash"
                        >
                          <span className="flex items-center gap-1 truncate">
                            <CheckCircle2 className="w-3 h-3 shrink-0" />
                            SHA-256: {claim.sha256_hash.slice(0, 16)}...
                          </span>
                          {copiedHash === claim.sha256_hash ? (
                            <span className="text-white text-[9px] font-sans">Copied!</span>
                          ) : (
                            <Copy className="w-3 h-3 shrink-0 text-slate-500" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right Sub-Column: AI Drafted Rebuttal Letter */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-emerald-400" />
                      AI Drafted Rebuttal Letter
                    </h4>
                    {selectedItem.status === 'PENDING_REVIEW' && (
                      <button
                        onClick={() => setIsEditingDefense(!isEditingDefense)}
                        className="text-xs font-semibold text-[#3B9EFF] hover:underline flex items-center gap-1"
                      >
                        <Edit3 className="w-3 h-3" />
                        {isEditingDefense ? 'View Preview' : 'Edit Draft'}
                      </button>
                    )}
                  </div>

                  <div className="rounded-xl border border-white/[0.08] overflow-hidden bg-black/40">
                    {isEditingDefense ? (
                      <div className="p-3 space-y-2">
                        <textarea
                          value={editedLetter}
                          onChange={(e) => setEditedLetter(e.target.value)}
                          rows={12}
                          className="w-full p-2.5 bg-black/50 border border-white/[0.1] rounded-lg text-xs font-mono text-slate-200 leading-relaxed focus:outline-none focus:border-[#0070BA] focus:ring-1 focus:ring-[#0070BA]"
                          placeholder="Modify defense rebuttal text..."
                        />
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>{editedLetter.length} characters</span>
                          <span className="text-[#3B9EFF]">
                            Changes will be logged in audit trail
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3.5 max-h-[300px] overflow-y-auto text-xs font-mono text-slate-200 whitespace-pre-wrap leading-relaxed select-text">
                        {editedLetter || selectedItem.drafted_defense_letter}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION C: Human Override Action Bar */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-[#152033] to-[#121826] border border-[#3B9EFF]/30 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-white flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#3B9EFF]" />
                    Human Reviewer Sign-Off &amp; Accountability
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Operator: <span className="text-white font-semibold">{reviewerName}</span>
                  </span>
                </div>

                {/* Reviewer Notes Input */}
                {selectedItem.status === 'PENDING_REVIEW' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={reviewerNotes}
                      onChange={(e) => setReviewerNotes(e.target.value)}
                      placeholder="Add reviewer notes for the immutable audit trail (optional)..."
                      className="sm:col-span-2 px-3 py-2 bg-black/40 border border-white/[0.1] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#0070BA]"
                    />
                    <input
                      type="text"
                      value={reviewerName}
                      onChange={(e) => setReviewerName(e.target.value)}
                      placeholder="Reviewer Name"
                      className="px-3 py-2 bg-black/40 border border-white/[0.1] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#0070BA]"
                    />
                  </div>
                ) : (
                  <div className="p-2.5 rounded-lg bg-white/[0.03] text-xs text-slate-300">
                    Decision already finalized and locked. See audit trail below.
                  </div>
                )}

                {/* 3 Action Buttons */}
                {selectedItem.status === 'PENDING_REVIEW' && (
                  <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
                    {/* Button 1: Approve & Submit */}
                    <button
                      onClick={handleApprove}
                      disabled={
                        actionLoading ||
                        selectedItem.draft_status === 'DRAFT_FAILED' ||
                        selectedItem.draft_status === 'LLM_UNAVAILABLE' ||
                        selectedItem.draft_status === 'NO_EVIDENCE' ||
                        !selectedItem.drafted_defense_letter?.trim()
                      }
                      className="w-full sm:w-auto flex-1 py-2.5 px-4 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-600 text-slate-950 transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
                      title={
                        selectedItem.draft_status === 'DRAFT_FAILED'
                          ? 'Cannot approve failed draft. Use Edit Draft to write human defense.'
                          : 'Approve & Push to PayPal API'
                      }
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Approve &amp; Push to PayPal API
                    </button>

                    {/* Button 2: Save Edits & Submit */}
                    <button
                      onClick={handleEditSubmit}
                      disabled={actionLoading || editedLetter === selectedItem.drafted_defense_letter}
                      className={`w-full sm:w-auto flex-1 py-2.5 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                        editedLetter !== selectedItem.drafted_defense_letter
                          ? 'bg-[#0070BA] hover:bg-[#005ea6] text-white shadow-lg shadow-[#0070BA]/20'
                          : 'bg-white/[0.05] text-slate-500 border border-white/[0.06] cursor-not-allowed'
                      }`}
                    >
                      <Edit3 className="w-4 h-4" />
                      Save Edits &amp; Submit
                    </button>

                    {/* Button 3: Reject / Concede Claim */}
                    <button
                      onClick={handleRejectConcede}
                      disabled={actionLoading}
                      className="w-full sm:w-auto py-2.5 px-4 rounded-xl font-bold text-xs bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                      title="Concede claim to avoid $15 PayPal dispute fee"
                    >
                      <XCircle className="w-4 h-4 text-purple-400" />
                      Concede Claim ($15 Saved)
                    </button>
                  </div>
                )}
              </div>

              {/* SECTION D: Immutable Audit Trail Timeline */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-[#3B9EFF]" />
                    Immutable Audit Trail &amp; Cryptographic Proof Log
                  </h4>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleVerifyChain(selectedItem.id)}
                      disabled={verifyingChain}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#0070BA]/20 hover:bg-[#0070BA]/35 text-[#3B9EFF] border border-[#0070BA]/40 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                      title="Verify SHA-256 cryptographic hash chain integrity from genesis"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-[#3B9EFF]" />
                      {verifyingChain ? 'Verifying Chain...' : 'Verify Audit Chain'}
                    </button>
                    <span className="text-[10px] text-slate-400 font-mono">SHA-256 Hashed</span>
                  </div>
                </div>

                {/* Audit Chain Verification Banner */}
                {chainVerificationResult && chainVerificationResult.itemId === selectedItem.id && (
                  <div
                    className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
                      chainVerificationResult.verified
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-red-500/10 border-red-500/30 text-red-300'
                    }`}
                  >
                    {chainVerificationResult.verified ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="font-bold">
                        {chainVerificationResult.verified
                          ? '✓ Cryptographic Audit Chain Verified: Intact'
                          : '⚠️ Cryptographic Tamper Alert: Hash Chain Broken'}
                      </p>
                      <p className="text-[11px] opacity-90 mt-0.5 font-mono">
                        {chainVerificationResult.details}
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-2 border-l-2 border-white/[0.1] pl-4 ml-1">
                  {selectedItem.audit_trail.map((entry, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-white flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#3B9EFF]" />
                          {entry.action.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(entry.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">{entry.reviewer_notes}</p>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-slate-400 pt-1">
                        <span>Actor: {entry.actor}</span>
                        <span className="text-emerald-400 font-bold">
                          {entry.paypal_api_status}
                        </span>
                        <span className="truncate max-w-[200px]" title={entry.payload_hash}>
                          Hash: {entry.payload_hash.slice(0, 16)}...
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center rounded-2xl bg-[#121826] border border-white/[0.06] text-slate-400">
              Select a dispute from the queue on the left to inspect evidence.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
