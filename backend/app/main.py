"""
PaySentinel AI — FastAPI Backend
================================
Main entry point. Registers all routers, configures CORS, and exposes health check.
"""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.routers import arena, cashflow, dashboard, disputes, proofs, transactions, webhooks

settings = get_settings()

app = FastAPI(
    title="PaySentinel AI",
    description="AI-powered PayPal dispute management, proof verification, and cash-flow intelligence.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
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


# ── Health Check ───────────────────────────────────────────────────────────
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
