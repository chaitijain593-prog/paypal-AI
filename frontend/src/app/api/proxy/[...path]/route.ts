import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const ALLOWED_PATH_PREFIXES = [
  'dashboard',
  'transactions',
  'disputes',
  'arena',
  'proofs',
  'cashflow',
  'webhooks',
  'paypal',
  'control-tower',
  'agent-commerce',
  'health',
];

const ROLE_TOKENS: Record<string, string | undefined> = {
  SENIOR_RISK_OFFICER: process.env.PAYSENTINEL_API_TOKEN_SENIOR_RISK || (process.env.NODE_ENV !== 'production' ? 'tok_senior_risk_001' : undefined),
  OPERATOR: process.env.PAYSENTINEL_API_TOKEN_OPERATOR || (process.env.NODE_ENV !== 'production' ? 'tok_operator_003' : undefined),
  ADMIN: process.env.PAYSENTINEL_API_TOKEN_ADMIN || (process.env.NODE_ENV !== 'production' ? 'tok_admin_004' : undefined),
};

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxyRequest(request, path.join('/'), 'GET');
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxyRequest(request, path.join('/'), 'POST');
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxyRequest(request, path.join('/'), 'PUT');
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxyRequest(request, path.join('/'), 'DELETE');
}

async function proxyRequest(request: NextRequest, subpath: string, method: string) {
  // 1. Strict Path Prefix Allowlist Enforcement
  const isAllowed = ALLOWED_PATH_PREFIXES.some(
    (prefix) => subpath === prefix || subpath.startsWith(`${prefix}/`)
  );
  if (!isAllowed) {
    return NextResponse.json(
      { error: 'Forbidden', detail: `Path '/api/${subpath}' is not in the authorized proxy allowlist.` },
      { status: 403 }
    );
  }

  // 2. Privilege Escalation Defense: Client header is strictly ignored unless explicitly in development/demo mode
  const isDemoMode = process.env.NODE_ENV !== 'production' || process.env.PAYSENTINEL_DEMO_MODE === 'true';
  const clientHeaderRole = isDemoMode ? request.headers.get('x-reviewer-role') : null;
  const targetRole = clientHeaderRole && ROLE_TOKENS[clientHeaderRole] ? clientHeaderRole : 'OPERATOR';
  const serverToken = ROLE_TOKENS[targetRole] || ROLE_TOKENS.OPERATOR;

  if (!serverToken) {
    return NextResponse.json(
      { error: 'Authentication Token Missing', detail: `Backend token for role '${targetRole}' is not configured.` },
      { status: 500 }
    );
  }

  const targetUrl = new URL(`/api/${subpath}`, BACKEND_URL);
  targetUrl.search = request.nextUrl.search;

  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  headers.set('Authorization', `Bearer ${serverToken}`);

  let body: string | undefined = undefined;
  if (method !== 'GET' && method !== 'HEAD') {
    try {
      body = await request.text();
    } catch {
      // no body
    }
  }

  try {
    const res = await fetch(targetUrl.toString(), {
      method,
      headers,
      body,
    });

    const resBody = await res.text();
    const forwardHeaders: Record<string, string> = {
      'Content-Type': res.headers.get('Content-Type') || 'application/json',
    };
    const debugId = res.headers.get('Paypal-Debug-Id') || res.headers.get('paypal-debug-id');
    if (debugId) {
      forwardHeaders['Paypal-Debug-Id'] = debugId;
    }
    return new NextResponse(resBody, {
      status: res.status,
      headers: forwardHeaders,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown backend connection error';
    return NextResponse.json(
      { error: 'Backend connection failure', detail: errorMessage },
      { status: 502 }
    );
  }
}
