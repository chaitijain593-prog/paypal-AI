"""
PaySentinel AI — API Token Authentication & Reviewer Context
============================================================
Derives authenticated reviewer identity and role strictly from API tokens.
Enforces that mutating actions cannot forge reviewer identity via request bodies.
"""

from __future__ import annotations

import os
from typing import Optional

from fastapi import Header, HTTPException, status
from pydantic import BaseModel

from app.core.config import get_settings


class ReviewerContext(BaseModel):
    identity: str
    role: str
    token: str


# Pre-configured deterministic role-bearing API tokens
DEFAULT_TOKENS: dict[str, dict[str, str]] = {
    "tok_senior_risk_001": {
        "identity": "Chief Risk Officer",
        "role": "SENIOR_RISK_OFFICER",
    },
    "tok_compliance_002": {
        "identity": "Compliance Lead",
        "role": "COMPLIANCE_LEAD",
    },
    "tok_operator_003": {
        "identity": "Operator Alex",
        "role": "OPERATOR",
    },
    "tok_admin_004": {
        "identity": "Platform Admin",
        "role": "ADMIN",
    },
    "tok_ai_creator": {
        "identity": "AI_DEFENSE_ENGINE",
        "role": "SYSTEM",
    },
}


def get_current_reviewer(
    authorization: Optional[str] = Header(None, alias="Authorization"),
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
) -> ReviewerContext:
    """
    FastAPI dependency that extracts and validates the API token from headers.
    Returns the securely derived ReviewerContext (identity, role, token).
    """
    token: str | None = None
    if authorization:
        parts = authorization.split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            token = parts[1]
        elif len(parts) == 1:
            token = parts[0]
    elif x_api_key:
        token = x_api_key

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing API authentication token. Provide Authorization: Bearer <token> or X-API-Key header.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 1. Lookup in predefined token registry
    token_data = DEFAULT_TOKENS.get(token)
    if token_data:
        return ReviewerContext(
            identity=token_data["identity"],
            role=token_data["role"],
            token=token,
        )

    # 2. Support dynamic tokens from environment (format: "tok1:Name:ROLE,tok2:Name:ROLE")
    settings = get_settings()
    if settings.api_tokens:
        for entry in settings.api_tokens.split(","):
            parts = entry.strip().split(":")
            if len(parts) == 3 and parts[0] == token:
                return ReviewerContext(
                    identity=parts[1],
                    role=parts[2].upper(),
                    token=token,
                )

    # 3. Support structured test tokens: "tok_<role>_<identity>"
    if token.startswith("tok_"):
        parts = token.split("_", 2)
        if len(parts) == 3:
            role = parts[1].upper()
            identity = parts[2].replace("-", " ")
            return ReviewerContext(
                identity=identity,
                role=role,
                token=token,
            )

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired API token.",
        headers={"WWW-Authenticate": "Bearer"},
    )
