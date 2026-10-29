"""Cash-flow runway routes."""

from fastapi import APIRouter

from app.services.mock_data import get_cashflow_runway

router = APIRouter(prefix="/api/cashflow", tags=["Cash Flow"])


@router.get("/runway")
def cashflow_runway():
    """Return cash-flow runway analysis including dispute impact."""
    return get_cashflow_runway()
