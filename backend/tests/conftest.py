"""
Hermetic Pytest configuration for PaySentinel AI backend.
Ensures tests run in standardized simulated mode regardless of ambient environment variables.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

# Ensure backend directory is in sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

# Guarantee hermetic test execution: unit tests must not make unmocked external PayPal calls
os.environ["APP_ENV"] = "development"
os.environ["PAYPAL_MODE"] = "simulated"
os.environ["ALLOW_UNSIGNED_WEBHOOKS"] = "true"
os.environ["PAYSENTINEL_DEMO_MODE"] = "true"

from app.core.config import get_settings
get_settings.cache_clear()
