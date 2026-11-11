"""
Hermetic Pytest configuration for PaySentinel AI backend.
Ensures tests run in a standardized test mode.
"""

from __future__ import annotations

import os

# Set standard test environment flags before app modules load
os.environ["APP_ENV"] = "development"
os.environ.setdefault("PAYPAL_MODE", "simulated")
os.environ.setdefault("ALLOW_UNSIGNED_WEBHOOKS", "true")
os.environ.setdefault("PAYSENTINEL_DEMO_MODE", "true")
