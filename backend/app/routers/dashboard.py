"""Dashboard route — aggregated metrics."""

from fastapi import APIRouter

from app.models.schemas import DashboardStats
from app.services.mock_data import get_dashboard_stats

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=DashboardStats)
def dashboard_stats():
    """Return aggregated dashboard statistics for the frontend."""
    return get_dashboard_stats()
