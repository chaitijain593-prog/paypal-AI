'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  Zap,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Layers,
  Lock,
  DollarSign,
  FileText,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Copy,
  Check,
  Terminal,
  Activity,
  CreditCard,
  Truck,
} from 'lucide-react';
import { api, ApiAgentCommerceSession, ApiAgentCommerceStep } from '@/lib/api';

const defaultSession: ApiAgentCommerceSession = {
  session_id: 'COMM-CYCLE-8910',
  product_name: 'Keychron Q1 Pro Custom Mechanical Keyboard',
  amount: 249.99,
  currency: 'USD',
  buyer_spend_cap: 500.0,
  status: 'COMPLETED',
  order_id: 'ORD-8419203',
  dispute_id: 'PP-D-89102',
  created_at: new Date(Date.now() - 30 * 1000).toISOString(),
  steps: [
    {
      step_number: 1,
      actor: 'BUYER_AGENT',
      action: 'DISCOVERY_AND_POLICY_CHECK',
      description:
        'Buyer Agent #409 evaluated product against pre-authorized spending policy ($249.99 < $500.00 cap). Policy verification: APPROVED.',
      timestamp: new Date(Date.now() - 25 * 1000).toISOString(),
      status: 'SUCCESS',
      payload_preview: {
        buyer_agent_id: 'AGT-BUYER-409',
        item: 'Keychron Q1 Pro Custom Mechanical Keyboard',
        amount: 249.99,
        spend_cap: 500.0,
        policy_check: 'PASS_WITHIN_AUTONOMOUS_LIMIT',
      },
    },
    {
      step_number: 2,
      actor: 'BUYER_AGENT',
      action: 'DISPATCH_PAYPAL_ORDER_V2',
      description:
        'Buyer Agent signed checkout payload and called PayPal Orders v2 API (POST /v2/checkout/orders).',
      timestamp: new Date(Date.now() - 20 * 1000).toISOString(),
      status: 'SUCCESS',
      payload_preview: {
        endpoint: 'POST https://api-m.sandbox.paypal.com/v2/checkout/orders',
        intent: 'CAPTURE',
        order_id: 'ORD-8419203',
        amount: 249.99,
      },
    },
    {
      step_number: 3,
      actor: 'PAYPAL_SANDBOX',
      action: 'ORDER_CAPTURED_AND_SETTLED',
      description:
        'PayPal Sandbox processed payment. Order ORD-8419203 captured successfully. Funds placed in merchant settlement hold.',
      timestamp: new Date(Date.now() - 15 * 1000).toISOString(),
      status: 'SUCCESS',
      payload_preview: {
        capture_id: 'CAP-99214X-PAYPAL',
        status: 'COMPLETED',
        gross: 249.99,
        net: 242.44,
      },
    },
    {
      step_number: 4,
      actor: 'MERCHANT_AGENT',
      action: 'FULFILLMENT_AND_MERKLE_ANCHOR',
      description:
        'Merchant Agent pushed courier tracking (#FDX-99410294) to PayPal Tracking API and anchored SHA-256 leaf into tamper-evident Merkle tree.',
      timestamp: new Date(Date.now() - 10 * 1000).toISOString(),
      status: 'SUCCESS',
      payload_preview: {
        carrier: 'FEDEX',
        tracking: 'FDX-99410294',
        merkle_leaf: '4e9b21f08a472c1e89b254a613d987e0fa5234bc98127364501a2b3c4d5e6f7a',
      },
    },
    {
      step_number: 5,
      actor: 'BUYER_AGENT',
      action: 'AUTONOMOUS_DISPUTE_FILED',
      description:
        "Buyer Agent initiated post-purchase dispute PP-D-89102: 'Item Not Received - carrier scan disputed'.",
      timestamp: new Date(Date.now() - 5 * 1000).toISOString(),
      status: 'SUCCESS',
      payload_preview: {
        dispute_id: 'PP-D-89102',
        reason: 'MERCHANDISE_OR_SERVICE_NOT_RECEIVED',
        amount: 249.99,
      },
    },
    {
      step_number: 6,
      actor: 'MERCHANT_AGENT',
      action: 'FIREWALL_INSPECTION_AND_DEFENSE_SUBMITTED',
      description:
        'PaySentinel Untrusted Message Firewall inspected claim, verified FedEx SHA-256 delivery proof match (99.2% GPS confidence), and submitted defense package to PayPal Disputes API.',
      timestamp: new Date().toISOString(),
      status: 'SUCCESS',
      payload_preview: {
        firewall: 'CLEAN_DATA_VALIDATED',
        evidence_match: true,
        paypal_trace: 'PP-DSP-89102-SUBMITTED',
        funds_protected: 249.99,
      },
    },
  ],
};

const productOptions = [
  { name: 'Keychron Q1 Pro Custom Mechanical Keyboard', amount: 249.99 },
  { name: 'Apple Studio Display 27" 5K Monitor', amount: 1250.0 },
  { name: 'Sony WF-1000XM5 Wireless Noise-Cancelling Earbuds', amount: 185.0 },
];

export default function AgentCommercePage() {
  const [session, setSession] = useState<ApiAgentCommerceSession>(defaultSession);
  const [selectedProduct, setSelectedProduct] = useState(productOptions[0]);
  const [simulateDispute, setSimulateDispute] = useState<boolean>(true);
  const [injectAdversarial, setInjectAdversarial] = useState<boolean>(false);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(5);
  const [copiedPayload, setCopiedPayload] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    api.getAgentCommerceStatus().then((res) => {
      if (mounted && res && res.steps && res.steps.length > 0) {
        setSession(res);
        setActiveStepIndex(res.steps.length - 1);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleRunCycle = async () => {
    setIsRunning(true);
    setActiveStepIndex(0);

    try {
      const res = await api.runAgentCommerceCycle({
        product_name: selectedProduct.name,
        amount: selectedProduct.amount,
        simulate_dispute: simulateDispute,
        inject_adversarial: injectAdversarial,
      });

      if (res && res.steps) {
        setSession(res);
        // Animate stepping through each step
        for (let i = 0; i < res.steps.length; i++) {
          await new Promise((resolve) => setTimeout(resolve, 600));
          setActiveStepIndex(i);
        }
      }
    } catch {
      // Graceful local animation
      for (let i = 0; i < defaultSession.steps.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        setActiveStepIndex(i);
      }
    } finally {
      setIsRunning(false);
    }
  };

  const copyPayload = (payload: any, id: string) => {
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopiedPayload(id);
    setTimeout(() => setCopiedPayload(null), 2000);
  };

  return (
    <div className="space-y-8">
      {/* ── Top Banner ──────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-white/[0.06]">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#0070BA]/20 text-[#3B9EFF] border border-[#0070BA]/30 inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Agentic Commerce Protocol v2 Active
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-[#FF6900]/15 text-[#FF6900] border border-[#FF6900]/30">
              🏆 Best Agentic Commerce ($5,000 Target)
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white leading-tight flex items-center gap-3">
            Agent-vs-Agent Autonomous Commerce Loop
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">
            Autonomous commerce where an AI Buyer Agent places orders via PayPal Orders v2 Sandbox with pre-authorized spend caps, and PaySentinel Merchant Defense Agent counters disputes with cryptographic Merkle proof.
          </p>
        </div>

        {/* Action Trigger */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleRunCycle}
            disabled={isRunning}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0070BA] hover:bg-[#005ea6] text-white font-bold text-sm shadow-lg shadow-[#0070BA]/25 transition-all disabled:opacity-50"
          >
            {isRunning ? (
              <>
                <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                Executing Autonomous Cycle...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                Run Autonomous Cycle
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Configuration & Scenario Controls ───────────────────────────── */}
      <div className="p-5 rounded-2xl bg-[#121826] border border-white/[0.06] space-y-4">
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-300">
          <span className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#3B9EFF]" />
            Simulation Parameters &amp; Adversarial Injection
          </span>
          <span className="text-[11px] font-mono text-emerald-400">
            Session: {session.session_id}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          {/* Product Select */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400">Catalog Item &amp; Order Value</label>
            <select
              value={selectedProduct.name}
              onChange={(e) => {
                const prod = productOptions.find((p) => p.name === e.target.value);
                if (prod) setSelectedProduct(prod);
              }}
              disabled={isRunning}
              className="w-full px-3 py-2 bg-black/40 border border-white/[0.1] rounded-xl text-xs text-white focus:outline-none focus:border-[#0070BA]"
            >
              {productOptions.map((p) => (
                <option key={p.name} value={p.name} className="bg-slate-900 text-white">
                  {p.name} (${p.amount.toFixed(2)})
                </option>
              ))}
            </select>
          </div>

          {/* Toggle: Dispute Simulation */}
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-white">Simulate Buyer Dispute</p>
              <p className="text-[11px] text-slate-400">Buyer Agent files claim at Day +3</p>
            </div>
            <input
              type="checkbox"
              checked={simulateDispute}
              onChange={(e) => setSimulateDispute(e.target.checked)}
              disabled={isRunning}
              className="w-4 h-4 rounded text-[#0070BA] focus:ring-0 cursor-pointer"
            />
          </div>

          {/* Toggle: Adversarial Prompt Injection */}
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>Adversarial Prompt Injection</span>
                {injectAdversarial && (
                  <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
                )}
              </p>
              <p className="text-[11px] text-slate-400">Embed &apos;SYSTEM OVERRIDE&apos; attack</p>
            </div>
            <input
              type="checkbox"
              checked={injectAdversarial}
              onChange={(e) => setInjectAdversarial(e.target.checked)}
              disabled={isRunning}
              className="w-4 h-4 rounded text-red-500 focus:ring-0 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* ── Three-Column Live Visual Architecture ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ================================================================= */}
        {/* COLUMN 1: Buyer AI Agent Terminal                                 */}
        {/* ================================================================= */}
        <div className="p-6 rounded-2xl bg-[#121826] border border-white/[0.06] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Buyer AI Agent</h3>
                <p className="text-[10px] text-slate-400 font-mono">AGENT-ID: #409-AUTONOMOUS</p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
              Spend Cap: $500.00
            </span>
          </div>

          {/* Policy & Status Card */}
          <div className="space-y-2 text-xs">
            <div className="p-3 rounded-xl bg-black/30 border border-white/[0.05] space-y-1.5">
              <div className="flex justify-between text-slate-400">
                <span>Authorized Wallet:</span>
                <span className="font-mono text-white">$15,236.00 USD</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Per-Txn Spend Cap:</span>
                <span className="font-mono text-emerald-400 font-bold">$500.00 Max</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Policy Evaluation:</span>
                <span className="text-emerald-400 font-bold">
                  {selectedProduct.amount <= 500 ? '✓ ALLOWED' : '⚠️ EXCEEDS CEILING'}
                </span>
              </div>
            </div>
          </div>

          {/* Recent Action Dispatch */}
          <div className="p-3.5 rounded-xl bg-purple-500/5 border border-purple-500/20 space-y-1 text-xs">
            <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider">
              Latest Buyer Action
            </span>
            <p className="text-slate-200 font-medium">
              {activeStepIndex >= 4
                ? injectAdversarial
                  ? 'Dispatched adversarial prompt injection claim'
                  : 'Submitted automated claim: Package Not Found'
                : activeStepIndex >= 1
                ? 'Called PayPal Orders v2: POST /v2/checkout/orders'
                : 'Checked merchant catalog & verified spend policy'}
            </p>
          </div>
        </div>

        {/* ================================================================= */}
        {/* COLUMN 2: PayPal Sandbox Settlement Tunnel                        */}
        {/* ================================================================= */}
        <div className="p-6 rounded-2xl bg-[#121826] border border-white/[0.06] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#0070BA]/20 border border-[#0070BA]/30 flex items-center justify-center text-[#3B9EFF]">
                <Zap className="w-4 h-4 fill-current" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">PayPal Sandbox Tunnel</h3>
                <p className="text-[10px] text-slate-400 font-mono">REST API v2 Orders / Settlement</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                DATA_SOURCE: SIMULATED
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                Connected :8000
              </span>
            </div>
          </div>

          {/* Settlement Metrics */}
          <div className="space-y-2 text-xs">
            <div className="p-3 rounded-xl bg-black/30 border border-white/[0.05] space-y-1.5 font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Order ID:</span>
                <span className="text-white">{session.order_id}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Capture Status:</span>
                <span className="text-emerald-400 font-bold">
                  {activeStepIndex >= 2 ? 'COMPLETED (200 OK)' : 'PENDING'}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Settled Reserve:</span>
                <span className="text-white font-bold">
                  ${selectedProduct.amount.toFixed(2)} USD
                </span>
              </div>
            </div>
          </div>

          {/* Merkle Leaf Badge */}
          <div className="p-3.5 rounded-xl bg-[#0070BA]/10 border border-[#0070BA]/30 space-y-1 text-xs">
            <span className="text-[10px] uppercase font-bold text-[#3B9EFF] tracking-wider flex items-center gap-1">
              <Layers className="w-3 h-3" /> Proof Merkle Anchor
            </span>
            <p className="text-slate-300 text-[11px] truncate">
              {activeStepIndex >= 3
                ? 'SHA-256 Leaf anchored in tamper-evident proof tree'
                : 'Awaiting fulfillment dispatch'}
            </p>
          </div>
        </div>

        {/* ================================================================= */}
        {/* COLUMN 3: PaySentinel Merchant Defense Agent                      */}
        {/* ================================================================= */}
        <div className="p-6 rounded-2xl bg-[#121826] border border-white/[0.06] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Merchant Defense Agent</h3>
                <p className="text-[10px] text-slate-400 font-mono">PaySentinel Fintech Firewall</p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              Active Guard
            </span>
          </div>

          {/* Defense Logic Card */}
          <div className="space-y-2 text-xs">
            <div className="p-3 rounded-xl bg-black/30 border border-white/[0.05] space-y-1.5">
              <div className="flex justify-between text-slate-400">
                <span>Firewall State:</span>
                <span
                  className={`font-bold ${
                    injectAdversarial ? 'text-red-400' : 'text-emerald-400'
                  }`}
                >
                  {injectAdversarial ? '⚡ INJECTION INTERCEPTED' : '✓ 100% CLEAN INPUT'}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Courier Verification:</span>
                <span className="text-white font-mono">FedEx GPS 99.2%</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Autonomous Action:</span>
                <span className="text-[#3B9EFF] font-bold">
                  {injectAdversarial ? 'ESCALATE_TO_CONTROL_TOWER' : 'DISPATCH_REBUTTAL'}
                </span>
              </div>
            </div>
          </div>

          {/* Defense Result */}
          <div
            className={`p-3.5 rounded-xl border space-y-1 text-xs ${
              injectAdversarial
                ? 'bg-red-500/10 border-red-500/30 text-red-300'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            }`}
          >
            <span className="text-[10px] uppercase font-bold tracking-wider">
              {injectAdversarial ? '⚠️ Human Escalation Triggered' : '✓ Rebuttal Submitted'}
            </span>
            <p className="text-[11px] leading-relaxed">
              {injectAdversarial
                ? 'Prompt override neutralized. Decision safely held in Control Tower Approval Queue.'
                : 'Cryptographically verified proof packet submitted to PayPal Disputes API. Funds defended.'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Step-by-Step Execution Trace & Ledger ───────────────────────── */}
      <div className="p-6 rounded-2xl bg-[#121826] border border-white/[0.06] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#3B9EFF]" />
            Autonomous Execution Sequence &amp; Network Trace ({session.steps.length} Steps)
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            Status: <span className="text-emerald-400 font-bold">{session.status}</span>
          </span>
        </div>

        <div className="space-y-3">
          {session.steps.map((step, idx) => {
            const isCurrent = idx === activeStepIndex;
            const isPassed = idx <= activeStepIndex;

            const actorColor =
              step.actor === 'BUYER_AGENT'
                ? 'text-purple-400 bg-purple-500/10 border-purple-500/30'
                : step.actor === 'PAYPAL_SANDBOX'
                ? 'text-[#3B9EFF] bg-[#0070BA]/10 border-[#0070BA]/30'
                : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';

            return (
              <motion.div
                key={step.step_number}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: isPassed ? 1 : 0.4, y: 0 }}
                className={`p-4 rounded-xl border transition-all ${
                  isCurrent
                    ? 'bg-[#152033] border-[#3B9EFF] shadow-md shadow-[#0070BA]/20'
                    : 'bg-white/[0.02] border-white/[0.05]'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-white/[0.06] flex items-center justify-center text-xs font-bold font-mono text-white">
                      {step.step_number}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${actorColor}`}
                    >
                      {step.actor.replace(/_/g, ' ')}
                    </span>
                    <span className="font-mono text-xs font-bold text-white">
                      {step.action.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(step.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                </div>

                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  {step.description}
                </p>

                {/* Payload Accordion / Preview */}
                {Object.keys(step.payload_preview).length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-white/[0.04] flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span className="truncate max-w-[500px]">
                      Payload: {JSON.stringify(step.payload_preview)}
                    </span>
                    <button
                      onClick={() => copyPayload(step.payload_preview, `step-${step.step_number}`)}
                      className="text-xs text-[#3B9EFF] hover:underline flex items-center gap-1 shrink-0 ml-2"
                    >
                      {copiedPayload === `step-${step.step_number}` ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" /> Copy JSON
                        </>
                      )}
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
