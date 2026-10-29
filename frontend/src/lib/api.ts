/**
 * PaySentinel AI — API Client
 * Connects Next.js frontend to FastAPI backend running on port 8000.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface ApiBuyerInfo {
  name: string;
  email: string;
  payer_id: string;
}

export interface ApiTransaction {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: 'COMPLETED' | 'PENDING' | 'DISPUTED' | 'REFUNDED';
  type: string;
  description: string;
  buyer: ApiBuyerInfo;
  created_at: string;
  payment_method: string;
  has_dispute: boolean;
  dispute_id?: string | null;
}

export interface ApiArenaMove {
  round: number;
  role: 'attacker' | 'defender';
  action: string;
  argument: string;
  score_delta: number;
  cumulative_score: number;
}

export interface ApiArenaSimulation {
  id: string;
  dispute_type: string;
  attacker_strategy: string;
  defender_strategy: string;
  attacker_final_score: number;
  defender_final_score: number;
  winner: 'attacker' | 'defender';
  rounds: ApiArenaMove[];
  total_rounds: number;
  created_at: string;
  duration_ms: number;
}

export interface ApiCashFlowEntry {
  month: string;
  revenue: number;
  expenses: number;
  net: number;
  disputed_amount: number;
  available_balance: number;
}

export interface ApiCashFlowRunway {
  current_balance: number;
  monthly_burn_rate: number;
  monthly_revenue: number;
  runway_months: number;
  runway_with_disputes: number;
  total_disputed: number;
  total_held: number;
  open_disputes_count: number;
  projected_cash_flow: ApiCashFlowEntry[];
  risk_level: string;
  recommendation: string;
}

export interface ApiProofRecord {
  id: string;
  dispute_id: string;
  evidence_id: string;
  filename: string;
  original_hash: string;
  current_hash: string;
  status: 'VERIFIED' | 'TAMPERED' | 'PENDING';
  created_at: string;
  verified_at: string | null;
  file_size_bytes: number;
}

export interface ApiProofVerifyResult {
  proof_id: string;
  evidence_id: string;
  filename: string;
  original_hash: string;
  computed_hash: string;
  match: boolean;
  status: 'VERIFIED' | 'TAMPERED' | 'PENDING';
  verified_at: string;
  chain_of_custody: Array<{
    timestamp: string;
    action: string;
    actor: string;
    hash: string;
  }>;
}

export interface ApiDashboardStats {
  total_transactions: number;
  total_revenue: number;
  total_disputes: number;
  open_disputes: number;
  dispute_rate: number;
  win_rate: number;
  avg_resolution_days: number;
  total_at_risk: number;
  proofs_verified: number;
  proofs_tampered: number;
  arena_simulations_run: number;
  defender_win_rate: number;
  runway_months: number;
  monthly_revenue: number;
  monthly_expenses: number;
  recent_alerts: Array<{
    type: string;
    severity: string;
    message: string;
    timestamp: string;
  }>;
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
      next: { revalidate: 0 }, // Disable Next.js caching for real-time data
    });

    if (!res.ok) {
      console.warn(`API [${endpoint}] responded with status ${res.status}`);
      return null;
    }

    return (await res.json()) as T;
  } catch (error) {
    console.warn(`API [${endpoint}] network error:`, error);
    return null;
  }
}

export const api = {
  // Dashboard
  getDashboardStats: () => request<ApiDashboardStats>('/api/dashboard/stats'),

  // Transactions
  getTransactions: () =>
    request<{ count: number; transactions: ApiTransaction[] }>('/api/transactions'),
  getTransaction: (id: string) => request<ApiTransaction>(`/api/transactions/${id}`),

  // Disputes
  getDisputes: () => request<{ count: number; disputes: any[] }>('/api/disputes'),
  getDispute: (id: string) => request<any>(`/api/disputes/${id}`),

  // Arena
  getArenaSimulations: () =>
    request<{ count: number; simulations: ApiArenaSimulation[] }>('/api/arena/simulations'),
  runArenaSimulation: (params: {
    dispute_type?: string;
    attacker_strategy?: string;
    defender_strategy?: string;
    num_rounds?: number;
  }) =>
    request<ApiArenaSimulation>('/api/arena/run', {
      method: 'POST',
      body: JSON.stringify({
        dispute_type: params.dispute_type || 'ITEM_NOT_RECEIVED',
        attacker_strategy: params.attacker_strategy || 'aggressive',
        defender_strategy: params.defender_strategy || 'evidence_based',
        num_rounds: params.num_rounds || 5,
      }),
    }),

  // Cash Flow Runway
  getCashFlowRunway: () => request<ApiCashFlowRunway>('/api/cashflow/runway'),

  // Proof Engine
  getProofs: () =>
    request<{ count: number; proofs: ApiProofRecord[] }>('/api/proofs'),
  verifyProof: (proofId: string) =>
    request<ApiProofVerifyResult>(`/api/proofs/${proofId}/verify`),
};
