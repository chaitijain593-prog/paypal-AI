"""Dashboard route — aggregated metrics."""

from fastapi import APIRouter

from app.services.mock_data import get_dashboard_stats

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/stats")
def dashboard_stats():
    """Return aggregated dashboard statistics for the frontend."""
    return get_dashboard_stats()
