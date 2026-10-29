"""Application configuration loaded from environment variables."""

from __future__ import annotations

import os
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()


class Settings:
    """Central configuration singleton."""

    # PayPal Sandbox
    paypal_client_id: str = os.getenv("PAYPAL_CLIENT_ID", "")
    paypal_client_secret: str = os.getenv("PAYPAL_CLIENT_SECRET", "")
    paypal_base_url: str = os.getenv(
        "PAYPAL_BASE_URL", "https://api-m.sandbox.paypal.com"
    )

    # App
    app_env: str = os.getenv("APP_ENV", "development")
    app_debug: bool = os.getenv("APP_DEBUG", "true").lower() == "true"
    app_port: int = int(os.getenv("APP_PORT", "8000"))
    app_host: str = os.getenv("APP_HOST", "0.0.0.0")

    # CORS
    cors_origins: list[str] = os.getenv(
        "CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
    ).split(",")

    # Webhook
    paypal_webhook_id: str = os.getenv("PAYPAL_WEBHOOK_ID", "")


@lru_cache
def get_settings() -> Settings:
    return Settings()
