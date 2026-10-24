from core.database import supabase
from datetime import datetime, date
import math

def calculate_trust_score(user_id: str) -> dict:
    """
    IshLu Credit Score — based on loan repayment behavior.
    Score range: 300-850
    New users start at 400 (Seed tier).
    """
    try:
        loans = supabase.table("loans").select("*").eq("user_id", user_id).execute().data
        user = supabase.table("users").select("created_at").eq("id", user_id).single().execute().data
    except:
        return _build_result(0, {}, user_id)

    # --- Factor 1: Loan Repayment History (50 points) ---
    repaid = [l for l in loans if l.get("status") == "repaid"]
    defaulted = [l for l in loans if l.get("status") == "defaulted"]
    total_loans = len(loans)

    if total_loans == 0:
        repayment_score = 0  # No history yet
    else:
        on_time = len(repaid)
        repayment_rate = on_time / total_loans
        repayment_score = round(repayment_rate * 50)
        # Penalty for defaults
        repayment_score = max(0, repayment_score - len(defaulted) * 15)

    # --- Factor 2: Collateral Health (20 points) ---
    active_loans = [l for l in loans if l.get("status") == "active"]
    if not active_loans:
        collateral_score = 20  # No active loans = healthy
    else:
        # Check LTV ratios — lower LTV = healthier
        avg_ltv = sum(l.get("ltv_ratio", 0.67) for l in active_loans) / len(active_loans)
        if avg_ltv <= 0.5:
            collateral_score = 20
        elif avg_ltv <= 0.67:
            collateral_score = 15
        elif avg_ltv <= 0.8:
            collateral_score = 8
        else:
            collateral_score = 0  # Near liquidation

    # --- Factor 3: Account Age (15 points) ---
    try:
        created = datetime.fromisoformat(user["created_at"].replace("Z", "+00:00"))
        days = (datetime.now().astimezone() - created).days
        tenure_score = min(15, round(math.log1p(days) / math.log1p(365) * 15))
    except:
        tenure_score = 0

    # --- Factor 4: Loan Utilization (15 points) ---
    if total_loans == 0:
        utilization_score = 10  # Neutral for new users
    elif total_loans <= 3:
        utilization_score = 12
    elif total_loans <= 10:
        utilization_score = 15  # Active borrower
    else:
        utilization_score = 13  # Very active — slight risk

    # --- Total raw score (0-100) ---
    raw = repayment_score + collateral_score + tenure_score + utilization_score
    raw = max(0, min(100, raw))

    # --- Map to 300-850 ---
    score = round(300 + (raw / 100) * 550)

    # New users with no loans: start at 400
    if total_loans == 0:
        score = 400

    breakdown = {
        "loan_repayment": {"score": repayment_score, "max": 50},
        "collateral_health": {"score": collateral_score, "max": 20},
        "account_tenure": {"score": tenure_score, "max": 15},
        "loan_utilization": {"score": utilization_score, "max": 15},
    }

    return _build_result(score, breakdown, user_id)


def _build_result(score: int, breakdown: dict, user_id: str) -> dict:
    if score >= 750:
        tier = "Platinum"
        max_loan_sats = 500000
    elif score >= 650:
        tier = "Gold"
        max_loan_sats = 200000
    elif score >= 550:
        tier = "Silver"
        max_loan_sats = 100000
    elif score >= 450:
        tier = "Bronze"
        max_loan_sats = 50000
    else:
        tier = "Seed"
        max_loan_sats = 0

    from services.ai_service import get_offline_explanation
    explanation = get_offline_explanation(score, tier, breakdown)

    # Save to history
    try:
        supabase.table("trust_score_log").upsert({
            "user_id": user_id,
            "score": score,
            "tier": tier,
            "breakdown": breakdown,
            "calculated_at": datetime.now().isoformat(),
        }).execute()
    except:
        pass

    return {
        "score": score,
        "tier": tier,
        "max_loan_sats": max_loan_sats,
        "breakdown": breakdown,
        "ai_explanation": explanation,
    }


def get_score_history(user_id: str) -> list:
    """Get Trust Score history for a user."""
    try:
        result = supabase.table("trust_score_log")\
            .select("*")\
            .eq("user_id", user_id)\
            .order("calculated_at", desc=True)\
            .limit(10)\
            .execute()
        return result.data
    except:
        return []
