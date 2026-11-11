"""Application configuration loaded from environment variables."""

from __future__ import annotations

import os
from decimal import Decimal
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()


class Settings:
    """Central configuration instance re-evaluating environment variables at call time."""

    paypal_mode: str
    paypal_client_id: str
    paypal_client_secret: str
    paypal_base_url: str
    gemini_api_key: str
    ai_model: str
    openai_api_key: str
    app_env: str
    app_debug: bool
    app_port: int
    app_host: str
    high_value_amount_cap: Decimal
    api_tokens: str
    paypal_dispute_fee: Decimal
    cors_origins: list[str]
    paypal_webhook_id: str
    allow_unsigned_webhooks: bool
    signing_key_dir: str

    def __init__(self) -> None:
        # PayPal Sandbox
        self.paypal_mode = os.getenv("PAYPAL_MODE", "simulated").lower()
        self.paypal_client_id = os.getenv("PAYPAL_CLIENT_ID", "")
        self.paypal_client_secret = os.getenv("PAYPAL_CLIENT_SECRET", "")
        self.paypal_base_url = os.getenv(
            "PAYPAL_BASE_URL", "https://api-m.sandbox.paypal.com"
        )

        # AI / LLM Engine
        self.gemini_api_key = os.getenv("GEMINI_API_KEY", os.getenv("AI_API_KEY", ""))
        self.ai_model = os.getenv("AI_MODEL", "gemini-2.5-flash")
        self.openai_api_key = os.getenv("OPENAI_API_KEY", "")

        # App
        self.app_env = os.getenv("APP_ENV", "development")
        self.app_debug = os.getenv("APP_DEBUG", "true").lower() == "true"
        self.app_port = int(os.getenv("APP_PORT", "8000"))
        self.app_host = os.getenv("APP_HOST", "0.0.0.0")

        # Security & Financial Caps (Parsed as Decimal for currency precision)
        self.high_value_amount_cap = Decimal(os.getenv("HIGH_VALUE_AMOUNT_CAP", "500.00"))
        self.api_tokens = os.getenv("API_TOKENS", "")
        self.paypal_dispute_fee = Decimal(os.getenv("PAYPAL_DISPUTE_FEE", "15.00"))

        # CORS
        self.cors_origins = [
            orig.strip()
            for orig in os.getenv(
                "CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
            ).split(",")
            if orig.strip()
        ]

        # Webhook
        self.paypal_webhook_id = os.getenv("PAYPAL_WEBHOOK_ID", "")
        self.allow_unsigned_webhooks = (
            os.getenv("ALLOW_UNSIGNED_WEBHOOKS", "false").lower() == "true"
        )

        # Signing Keys
        self.signing_key_dir = os.getenv(
            "SIGNING_KEY_DIR",
            os.path.join(
                os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
                "keys",
            ),
        )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
