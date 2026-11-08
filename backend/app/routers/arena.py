"""Arena routes — Attacker vs Defender AI simulations."""

from fastapi import APIRouter

from app.models.schemas import ArenaRunRequest, LiveAttackRequest, LiveAttackResult
from app.services.arena_engine import execute_arena_simulation, evaluate_live_attack
from app.services.mock_data import get_arena_simulations

router = APIRouter(prefix="/api/arena", tags=["Dispute Arena"])


@router.get("/simulations")
def list_simulations():
    """Return all past arena simulation results."""
    sims = get_arena_simulations()
    return {"count": len(sims), "simulations": sims}


@router.post("/run")
def run_simulation(body: ArenaRunRequest):
    """Run a new attacker-vs-defender arena simulation using the Arena Engine."""
    result = execute_arena_simulation(body)
    return result


@router.post("/evaluate-attack", response_model=LiveAttackResult)
def evaluate_custom_attack(body: LiveAttackRequest):
    """Evaluate a custom judge/red-teamer attack through the Untrusted Input Firewall."""
    result = evaluate_live_attack(body)
    return result


