from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from core.database import supabase
from routers.dependencies import get_current_user
from services.trust_score_service import calculate_trust_score
from services.mpesa_service import initiate_stk_push
from slowapi import Limiter
from slowapi.util import get_remote_address
from datetime import date, timedelta
import logging
from services.price_service import get_kes_to_sats

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/loans", tags=["loans"])
limiter = Limiter(key_func=get_remote_address)

KES_TO_SATS = 7.5  # fallback only
LTV_RATIO = 0.67
APR = 0.1149
MIN_SCORE = 400
MIN_COLLATERAL_SATS = 100000
MAX_COLLATERAL_SATS = 210000000000000  # 21M BTC in sats — hard cap


class LoanRequest(BaseModel):
    collateral_sats: int
    mpesa_phone: str
    term_days: int = 30

class RepayRequest(BaseModel):
    loan_id: str
    amount_kes: int


@router.get("/calculator")
async def loan_calculator(collateral_sats: int, term_days: int = 30):
    valid_terms = [30, 90, 180, 365]
    if term_days not in valid_terms:
        term_days = 30

    if collateral_sats < MIN_COLLATERAL_SATS:
        raise HTTPException(
            status_code=400,
            detail=f"Minimum collateral is {MIN_COLLATERAL_SATS:,} sats"
        )

    live_rate = await get_kes_to_sats()
    kes_value = collateral_sats / live_rate
    loan_kes = int(kes_value * LTV_RATIO)
    total_interest = int(loan_kes * (APR * term_days / 365))
    total_repayment = loan_kes + total_interest
    due_date = str(date.today() + timedelta(days=term_days))
    term_labels = {30: "1 Month", 90: "3 Months", 180: "6 Months", 365: "1 Year"}

    return {
        "collateral_sats": collateral_sats,
        "collateral_kes_value": int(kes_value),
        "loan_amount_kes": loan_kes,
        "total_interest_kes": total_interest,
        "total_repayment_kes": total_repayment,
        "apr_percent": APR * 100,
        "term_days": term_days,
        "term_label": term_labels[term_days],
        "due_date": due_date,
        "btc_kes_rate": round(100_000_000 / live_rate),
        "kes_to_sats_rate": round(live_rate, 4),
        "message": f"Lock {collateral_sats:,} sats → receive KES {loan_kes:,} for {term_labels[term_days]}"
    }


@router.post("/request")
@limiter.limit("3/hour")
async def request_loan(request: Request, req: LoanRequest, user=Depends(get_current_user)):
    # Validate input bounds
    if req.collateral_sats < MIN_COLLATERAL_SATS:
        raise HTTPException(
            status_code=400,
            detail=f"Minimum collateral is {MIN_COLLATERAL_SATS:,} sats"
        )

    if req.collateral_sats > MAX_COLLATERAL_SATS:
        raise HTTPException(
            status_code=400,
            detail="Collateral amount exceeds maximum allowed"
        )

    if req.term_days not in [30, 90, 180, 365]:
        raise HTTPException(
            status_code=400,
            detail="Invalid term. Choose 30, 90, 180, or 365 days"
        )

    if req.amount_kes < 0 if hasattr(req, 'amount_kes') else False:
        raise HTTPException(status_code=400, detail="Invalid amount")

    # Check Trust Score
    trust = calculate_trust_score(user["id"])
    if trust["score"] < MIN_SCORE:
        raise HTTPException(
            status_code=400,
            detail=f"Credit score too low. Need {MIN_SCORE}, you have {trust['score']}"
        )

    # Check no active loan already exists
    active_loans = supabase.table("loans")\
        .select("id")\
        .eq("user_id", user["id"])\
        .eq("status", "active")\
        .eq("collateral_locked", True)\
        .execute()

    if active_loans.data:
        raise HTTPException(
            status_code=400,
            detail="You already have an active loan. Repay it first."
        )

    # ATOMIC collateral lock — prevents race condition
    lock_result = supabase.rpc("lock_collateral", {
        "p_user_id": user["id"],
        "p_amount": req.collateral_sats
    }).execute()

    if not lock_result.data or not lock_result.data[0].get("success"):
        message = lock_result.data[0].get("message", "Insufficient collateral") if lock_result.data else "Insufficient collateral"
        raise HTTPException(status_code=400, detail=message)

    # Calculate loan terms
    live_rate = await get_kes_to_sats()
    kes_value = req.collateral_sats / live_rate
    loan_kes = int(kes_value * LTV_RATIO)
    total_interest = int(loan_kes * (APR * req.term_days / 365))
    total_repayment_kes = loan_kes + total_interest
    total_repayment_sats = int(total_repayment_kes * live_rate)
    due_date = str(date.today() + timedelta(days=req.term_days))

    if loan_kes < 1000:
        raise HTTPException(
            status_code=400,
            detail="Minimum loan disbursement is KES 1,000"
        )

    # Create loan record
    loan = supabase.table("loans").insert({
        "user_id": user["id"],
        "principal_sats": int(loan_kes * live_rate),
        "collateral_sats": req.collateral_sats,
        "disbursed_kes": loan_kes,
        "total_repayment_kes": total_repayment_kes,
        "total_repayment_sats": total_repayment_sats,
        "total_interest_kes": total_interest,
        "collateral_locked": True,
        "interest_rate_apr": APR,
        "ltv_ratio": LTV_RATIO,
        "due_date": due_date,
        "term_days": req.term_days,
        "repaid_sats": 0,
        "status": "active",
    }).execute()

    loan_id = loan.data[0]["id"]

    # Disburse via M-Pesa
    try:
        stk = await initiate_stk_push(
            phone=req.mpesa_phone,
            amount_kes=loan_kes,
            account_ref=loan_id[:12]
        )
        supabase.table("loans").update({
            "mpesa_disbursement_ref": stk.get("CheckoutRequestID", "")
        }).eq("id", loan_id).execute()

        logger.info(f"Loan {loan_id} disbursed KES {loan_kes} to {req.mpesa_phone}")

    except Exception as e:
        # M-Pesa failed — flag for manual review, do NOT silently ignore
        supabase.table("loans").update({
            "status": "pending_disbursement"
        }).eq("id", loan_id).execute()

        logger.error(f"Loan {loan_id} M-Pesa disbursement failed: {str(e)}")

        raise HTTPException(
            status_code=503,
            detail="Loan approved but M-Pesa disbursement failed. Our team will contact you within 24 hours to process your KES."
        )

    calculate_trust_score(user["id"])

    return {
        "loan_id": loan_id,
        "collateral_locked_sats": req.collateral_sats,
        "loan_amount_kes": loan_kes,
        "total_repayment_kes": total_repayment_kes,
        "total_interest_kes": total_interest,
        "due_date": due_date,
        "term": f"{req.term_days} days",
        "apr": f"{APR * 100}%",
        "message": f"KES {loan_kes:,} sent to your M-Pesa. Repay KES {total_repayment_kes:,} by {due_date}."
    }


@router.get("/my-loans")
async def get_my_loans(user=Depends(get_current_user)):
    loans = supabase.table("loans")\
        .select("*")\
        .eq("user_id", user["id"])\
        .order("created_at", desc=True)\
        .execute()
    return loans.data


@router.get("/calculator")
async def loan_calculator_get(collateral_sats: int, term_days: int = 30):
    return await loan_calculator(collateral_sats, term_days)


@router.post("/repay")
@limiter.limit("10/hour")
async def repay_loan(request: Request, req: RepayRequest, user=Depends(get_current_user)):
    # Input validation
    if req.amount_kes <= 0:
        raise HTTPException(status_code=400, detail="Repayment amount must be positive")

    # Fetch loan — scoped to user_id prevents IDOR
    loan_result = supabase.table("loans")\
        .select("*")\
        .eq("id", req.loan_id)\
        .eq("user_id", user["id"])\
        .execute()

    if not loan_result.data:
        raise HTTPException(status_code=404, detail="Loan not found")

    loan = loan_result.data[0]

    if loan["status"] != "active":
        raise HTTPException(
            status_code=400,
            detail=f"Loan is already {loan['status']}"
        )

    # Use total_repayment_kes if available, fall back to principal + interest calculation
    live_rate = await get_kes_to_sats()
    total_owed_kes = loan.get("total_repayment_kes") or (
        loan["disbursed_kes"] + int(loan["disbursed_kes"] * (APR * loan.get("term_days", 30) / 365))
    )
    total_owed_sats = int(total_owed_kes * live_rate)

    repaid_so_far = loan.get("repaid_sats") or 0
    new_repaid_sats = repaid_so_far + int(req.amount_kes * live_rate)

    # Check if fully repaid — enforce TOTAL repayment including interest
    fully_repaid = new_repaid_sats >= total_owed_sats

    update_data = {"repaid_sats": new_repaid_sats}

    if fully_repaid:
        update_data["status"] = "repaid"
        update_data["collateral_locked"] = False

        # Return collateral to user's vault
        goals = supabase.table("savings_goals")\
            .select("id")\
            .eq("user_id", user["id"])\
            .eq("status", "active")\
            .limit(1).execute()

        if goals.data:
            supabase.rpc("increment_goal_sats", {
                "goal_id": goals.data[0]["id"],
                "amount": loan["collateral_sats"]
            }).execute()

            logger.info(f"Loan {req.loan_id} fully repaid. Collateral {loan['collateral_sats']} sats returned.")
        else:
            logger.warning(f"Loan {req.loan_id} repaid but no active goal found to return collateral to user {user['id']}")

    supabase.table("loans")\
        .update(update_data)\
        .eq("id", req.loan_id)\
        .execute()

    calculate_trust_score(user["id"])

    remaining_kes = max(0, total_owed_kes - int(new_repaid_sats / KES_TO_SATS))

    return {
        "fully_repaid": fully_repaid,
        "collateral_returned": fully_repaid,
        "collateral_sats": loan["collateral_sats"] if fully_repaid else 0,
        "repaid_sats": new_repaid_sats,
        "remaining_kes": remaining_kes,
        "message": (
            f"Loan fully repaid! Your {loan['collateral_sats']:,} sats are unlocked."
            if fully_repaid
            else f"Partial repayment recorded. KES {remaining_kes:,} remaining (includes interest)."
        )
    }
