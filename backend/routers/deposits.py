from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from core.database import supabase
from routers.dependencies import get_current_user
import httpx
import os

router = APIRouter(prefix="/deposits", tags=["deposits"])

LNBITS_URL = os.getenv("LNBITS_URL", "https://demo.lnbits.com")
LNBITS_ADMIN_KEY = os.getenv("LNBITS_ADMIN_KEY", "")

class DepositRequest(BaseModel):
    amount_sats: int
    memo: str = "IshLu BTC Deposit"

async def get_or_create_wallet(user_id: str) -> dict:
    """Get existing LNbits wallet or create one for user."""
    user = supabase.table("users").select("lnbits_wallet_id, lnbits_invoice_key").eq("id", user_id).single().execute()
    
    if user.data.get("lnbits_wallet_id"):
        return {
            "wallet_id": user.data["lnbits_wallet_id"],
            "invoice_key": user.data["lnbits_invoice_key"]
        }
    
    # Create new wallet
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{LNBITS_URL}/api/v1/account",
            headers={"X-Api-Key": LNBITS_ADMIN_KEY},
            json={"name": f"ishlu_{user_id[:8]}"},
            timeout=10.0
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=400, detail="Could not create Lightning wallet")
        
        wallet = resp.json()
        
        # Save wallet credentials
        supabase.table("users").update({
            "lnbits_wallet_id": wallet["id"],
            "lnbits_invoice_key": wallet["invoiceKey"],
        }).eq("id", user_id).execute()
        
        return {
            "wallet_id": wallet["id"],
            "invoice_key": wallet["invoiceKey"]
        }

@router.post("/lightning/invoice")
async def create_deposit_invoice(req: DepositRequest, user=Depends(get_current_user)):
    """Create a Lightning invoice for BTC deposit."""
    if req.amount_sats < 100000:
        raise HTTPException(
            status_code=400,
            detail="Minimum deposit is 100,000 sats to qualify for loans"
        )
    
    try:
        wallet = await get_or_create_wallet(user["id"])
        
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{LNBITS_URL}/api/v1/payments",
                headers={"X-Api-Key": wallet["invoice_key"]},
                json={
                    "out": False,
                    "amount": req.amount_sats,
                    "memo": req.memo,
                },
                timeout=10.0
            )
            
            if resp.status_code != 201:
                raise HTTPException(status_code=400, detail="Could not create invoice")
            
            data = resp.json()
            
            # Save pending deposit
            supabase.table("transactions").insert({
                "user_id": user["id"],
                "type": "deposit",
                "amount_sats": req.amount_sats,
                "status": "pending",
                "payment_hash": data["payment_hash"],
            }).execute()
            
            return {
                "bolt11": data["bolt11"],
                "payment_hash": data["payment_hash"],
                "amount_sats": req.amount_sats,
                "expires_in": 3600,
                "message": f"Pay this invoice to deposit {req.amount_sats:,} sats"
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Lightning error: {str(e)}")

@router.get("/lightning/verify/{payment_hash}")
async def verify_deposit(payment_hash: str, user=Depends(get_current_user)):
    """Check if a Lightning payment was received."""
    try:
        wallet = await get_or_create_wallet(user["id"])
        
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{LNBITS_URL}/api/v1/payments/{payment_hash}",
                headers={"X-Api-Key": wallet["invoice_key"]},
                timeout=10.0
            )
            
            data = resp.json()
            paid = data.get("paid", False)
            
            if paid:
                # Check not already credited
                existing = supabase.table("transactions")\
                    .select("id, status")\
                    .eq("payment_hash", payment_hash)\
                    .single().execute()
                
                if existing.data and existing.data["status"] == "settled":
                    return {"paid": True, "already_credited": True}
                
                # Credit sats to user balance
                amount_sats = abs(data.get("amount", 0)) // 1000  # msat to sat
                
                # Add to first active goal or create a collateral pool
                goals = supabase.table("savings_goals")\
                    .select("id")\
                    .eq("user_id", user["id"])\
                    .eq("status", "active")\
                    .limit(1).execute()
                
                if goals.data:
                    supabase.rpc("increment_goal_sats", {
                        "goal_id": goals.data[0]["id"],
                        "amount": amount_sats
                    }).execute()
                else:
                    # Create a collateral vault goal
                    goal = supabase.table("savings_goals").insert({
                        "user_id": user["id"],
                        "name": "BTC Collateral Vault",
                        "target_sats": 10000000,
                        "current_sats": amount_sats,
                        "status": "active",
                    }).execute()
                
                # Mark transaction settled
                supabase.table("transactions")\
                    .update({"status": "settled"})\
                    .eq("payment_hash", payment_hash).execute()
                
                return {
                    "paid": True,
                    "amount_sats": amount_sats,
                    "message": f"{amount_sats:,} sats credited to your collateral vault"
                }
            
            return {"paid": False, "message": "Payment not received yet"}
    
    except Exception as e:
        return {"paid": False, "message": str(e)}

@router.get("/balance")
async def get_balance(user=Depends(get_current_user)):
    """Get total deposited sats available as collateral."""
    goals = supabase.table("savings_goals")\
        .select("current_sats")\
        .eq("user_id", user["id"])\
        .eq("status", "active").execute()
    
    total = sum(g["current_sats"] for g in goals.data)
    kes_value = round(total / 7.5)
    loan_capacity = round(kes_value * 0.67)
    
    return {
        "total_sats": total,
        "kes_value": kes_value,
        "loan_capacity_kes": loan_capacity,
    }
