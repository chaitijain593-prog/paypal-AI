"""Arena routes — Attacker vs Defender AI simulations."""

from fastapi import APIRouter

from app.models.schemas import ArenaRunRequest
from app.services.mock_data import get_arena_simulations, run_arena_simulation

router = APIRouter(prefix="/api/arena", tags=["Dispute Arena"])


@router.get("/simulations")
def list_simulations():
    """Return all past arena simulation results."""
    sims = get_arena_simulations()
    return {"count": len(sims), "simulations": sims}


@router.post("/run")
def run_simulation(body: ArenaRunRequest):
    """Run a new attacker-vs-defender arena simulation."""
    result = run_arena_simulation(body)
    return result
