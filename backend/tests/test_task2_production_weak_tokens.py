"""
Task 2 Acceptance Tests: Production token validation.
Verifies that when APP_ENV != 'development', weak tokens or tokens < 32 characters
are strictly rejected at boot, while strong production tokens (>= 32 chars) succeed.
"""

import pytest

from app.core.config import get_settings
from app.core.auth import _load_token_registry, reset_token_registry


def test_production_boot_rejects_weak_token(monkeypatch):
    """When APP_ENV='production', weak dev tokens like tok_admin_001 cause boot failure."""
    reset_token_registry()
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv(
        "API_TOKENS",
        "tok_admin_001:PlatformAdmin:ADMIN",
    )
    get_settings.cache_clear()

    with pytest.raises(RuntimeError) as exc_info:
        _load_token_registry()

    assert "too weak or uses a forbidden pattern" in str(exc_info.value)
    reset_token_registry()
    get_settings.cache_clear()


def test_production_boot_rejects_short_token(monkeypatch):
    """When APP_ENV='production', random tokens under 32 characters cause boot failure."""
    reset_token_registry()
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv(
        "API_TOKENS",
        "short_random_token_123:CustomUser:OPERATOR",
    )
    get_settings.cache_clear()

    with pytest.raises(RuntimeError) as exc_info:
        _load_token_registry()

    assert "must be >= 32 characters" in str(exc_info.value)
    reset_token_registry()
    get_settings.cache_clear()


def test_production_boot_accepts_strong_tokens(monkeypatch):
    """When APP_ENV='production', 32+ character strong tokens are accepted."""
    reset_token_registry()
    strong_token = "a" * 32
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv(
        "API_TOKENS",
        f"{strong_token}:ProductionOfficer:SENIOR_RISK_OFFICER",
    )
    get_settings.cache_clear()

    registry = _load_token_registry()
    assert strong_token in registry
    assert registry[strong_token]["role"] == "SENIOR_RISK_OFFICER"

    reset_token_registry()
    get_settings.cache_clear()
