import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const ROLE_TOKENS: Record<string, string> = {
  SENIOR_RISK_OFFICER: process.env.PAYSENTINEL_API_TOKEN_SENIOR_RISK || 'tok_senior_risk_001',
  OPERATOR: process.env.PAYSENTINEL_API_TOKEN_OPERATOR || 'tok_operator_003',
  ADMIN: process.env.PAYSENTINEL_API_TOKEN_ADMIN || 'tok_admin_004',
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
  const reviewerRole = request.headers.get('x-reviewer-role') || 'SENIOR_RISK_OFFICER';
  const serverToken = ROLE_TOKENS[reviewerRole] || ROLE_TOKENS.SENIOR_RISK_OFFICER;

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
