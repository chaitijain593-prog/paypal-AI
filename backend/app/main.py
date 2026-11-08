"""
PaySentinel AI — FastAPI Backend
================================
Main entry point. Registers all routers, configures CORS, and exposes health check.
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.routers import (
    arena,
    cashflow,
    dashboard,
    disputes,
    paypal,
    proofs,
    transactions,
    webhooks,
    control_tower,
    agent_commerce,
)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Fail startup loudly if sandbox mode is active but webhook verification ID is missing."""
    if settings.paypal_mode in ("sandbox", "live") and not settings.paypal_webhook_id:
        raise RuntimeError(
            "FATAL STARTUP CONFIGURATION ERROR: PAYPAL_MODE is configured as 'sandbox'/'live', "
            "but PAYPAL_WEBHOOK_ID is empty. PayPal webhook signature verification cannot operate "
            "without a configured webhook ID. Configure PAYPAL_WEBHOOK_ID or set PAYPAL_MODE=simulated."
        )
    yield


app = FastAPI(
    title="PaySentinel AI",
    description="AI-powered PayPal dispute management, proof verification, and cash-flow intelligence.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── CORS ───────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────────────────
app.include_router(dashboard.router)
app.include_router(transactions.router)
app.include_router(disputes.router)
app.include_router(arena.router)
app.include_router(proofs.router)
app.include_router(cashflow.router)
app.include_router(webhooks.router)
app.include_router(paypal.router)
app.include_router(control_tower.router)
app.include_router(agent_commerce.router)



# ── Health Check ───────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
@app.get("/api/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": "PaySentinel AI Backend",
        "version": "1.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "environment": settings.app_env,
    }


# ── Root ───────────────────────────────────────────────────────────────────
@app.get("/", tags=["Root"])
def root():
    return {
        "message": "🛡️ PaySentinel AI Backend is running",
        "docs": "/docs",
        "health": "/api/health",
    }
