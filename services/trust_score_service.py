from datetime import datetime, date
from core.database import supabase
import math

WEIGHTS = {
    "savings_consistency": 35,
    "goal_completion": 25,
    "account_tenure": 15,
    "savings_velocity": 15,
    "loan_repayment": 10,
}

def calculate_trust_score(user_id: str) -> dict:
    now = datetime.utcnow()

    user = supabase.table("users").select("created_at").eq("id", user_id).single().execute().data
    txns = supabase.table("transactions").select("*").eq("user_id", user_id).eq("status", "settled").order("created_at").execute().data
    goals = supabase.table("savings_goals").select("*").eq("user_id", user_id).execute().data
    loans = supabase.table("loans").select("*").eq("user_id", user_id).execute().data

    breakdown = {}

    # 1. SAVINGS CONSISTENCY
    deposit_txns = [t for t in txns if t["type"] == "deposit"]
    weeks_with_deposits = set()
    for t in deposit_txns:
        d = datetime.fromisoformat(t["created_at"].replace("Z", "+00:00"))
        year_week = f"{d.year}-{d.isocalendar()[1]}"
        weeks_with_deposits.add(year_week)

    active_weeks = min(len(weeks_with_deposits), 8)
    consistency_ratio = active_weeks / 8
    consistency_score = round(WEIGHTS["savings_consistency"] * consistency_ratio, 2)
    breakdown["savings_consistency"] = {
        "score": consistency_score,
        "max": WEIGHTS["savings_consistency"],
        "detail": f"{active_weeks}/8 active weeks"
    }

    # 2. GOAL COMPLETION
    completed_goals = [g for g in goals if g["status"] == "completed"]
    mature_goals = [g for g in goals if g["status"] in ("completed", "withdrawn") or
                    (g.get("deadline") and date.fromisoformat(g["deadline"]) < date.today())]
    completion_rate = len(completed_goals) / len(mature_goals) if mature_goals else 0.5
    goal_score = round(WEIGHTS["goal_completion"] * completion_rate, 2)
    breakdown["goal_completion"] = {
        "score": goal_score,
        "max": WEIGHTS["goal_completion"],
        "detail": f"{len(completed_goals)}/{len(mature_goals)} goals completed"
    }

    # 3. ACCOUNT TENURE
    created = datetime.fromisoformat(user["created_at"].replace("Z", "+00:00"))
    days_old = (now.replace(tzinfo=created.tzinfo) - created).days
    tenure_ratio = min(days_old / 180, 1.0)
    tenure_ratio = math.log1p(tenure_ratio * (math.e - 1))
    tenure_score = round(WEIGHTS["account_tenure"] * tenure_ratio, 2)
    breakdown["account_tenure"] = {
        "score": tenure_score,
        "max": WEIGHTS["account_tenure"],
        "detail": f"{days_old} days on platform"
    }

    # 4. SAVINGS VELOCITY
    if len(deposit_txns) >= 2:
        mid = len(deposit_txns) // 2
        first_avg = sum(t["amount_sats"] for t in deposit_txns[:mid]) / max(mid, 1)
        second_avg = sum(t["amount_sats"] for t in deposit_txns[mid:]) / max(len(deposit_txns) - mid, 1)
        growth_ratio = min((second_avg / first_avg), 2.0) / 2.0 if first_avg > 0 else 0.5
    else:
        growth_ratio = 0.3
    velocity_score = round(WEIGHTS["savings_velocity"] * growth_ratio, 2)
    breakdown["savings_velocity"] = {
        "score": velocity_score,
        "max": WEIGHTS["savings_velocity"],
        "detail": f"Growth ratio: {growth_ratio:.2f}"
    }

    # 5. LOAN REPAYMENT
    repaid = [l for l in loans if l["status"] == "repaid"]
    defaulted = [l for l in loans if l["status"] == "defaulted"]
    closed = repaid + defaulted
    if closed:
        repayment_rate = len(repaid) / len(closed)
    elif not loans:
        repayment_rate = 0.7
    else:
        repayment_rate = 0.5
    loan_score = round(WEIGHTS["loan_repayment"] * repayment_rate, 2)
    breakdown["loan_repayment"] = {
        "score": loan_score,
        "max": WEIGHTS["loan_repayment"],
        "detail": f"{len(repaid)} repaid, {len(defaulted)} defaults"
    }

    raw_total = sum(v["score"] for v in breakdown.values())
    final_score = round(300 + (raw_total / 100) * 550)

    if final_score >= 750:
        tier, max_loan_sats = "Platinum", 500_000
    elif final_score >= 650:
        tier, max_loan_sats = "Gold", 200_000
    elif final_score >= 550:
        tier, max_loan_sats = "Silver", 100_000
    elif final_score >= 450:
        tier, max_loan_sats = "Bronze", 50_000
    else:
        tier, max_loan_sats = "Seed", 0

    result = {
        "score": final_score,
        "tier": tier,
        "max_loan_sats": max_loan_sats,
        "breakdown": breakdown,
        "calculated_at": now.isoformat()
    }

    supabase.table("trust_score_log").insert({
        "user_id": user_id,
        "score": final_score,
        "breakdown": breakdown
    }).execute()

    return result

def get_score_history(user_id: str, limit: int = 12) -> list:
    rows = supabase.table("trust_score_log").select("score, breakdown, calculated_at").eq("user_id", user_id).order("calculated_at", desc=True).limit(limit).execute()
    return rows.data
