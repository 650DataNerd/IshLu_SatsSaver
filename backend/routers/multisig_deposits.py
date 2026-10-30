"""
IshLu Multisig Deposit Router
Handles BTC collateral deposits via 2-of-3 multisig.
Replaces LNbits dependency entirely.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from core.database import supabase
from routers.dependencies import get_current_user
from services.multisig_service import (
    generate_user_keypair,
    create_multisig_address,
    check_deposit,
)
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/multisig", tags=["multisig"])


class InitDepositRequest(BaseModel):
    collateral_sats: int
    user_pubkey: str  # User's BTC pubkey from their phone


@router.post("/setup-keys")
async def setup_user_keys(user=Depends(get_current_user)):
    """
    Generate a Bitcoin keypair for a new user.
    Called once at registration.
    Private key returned ONCE — stored on device only.
    Backend stores only the public key.
    """
    # Check if user already has keys
    existing = supabase.table("users")\
        .select("btc_pubkey")\
        .eq("id", user["id"])\
        .single().execute()

    if existing.data and existing.data.get("btc_pubkey"):
        return {
            "already_setup": True,
            "public_key": existing.data["btc_pubkey"],
            "message": "Keys already configured for this account"
        }

    # Generate new keypair
    keypair = generate_user_keypair()

    # Store only pubkey in database
    supabase.table("users").update({
        "btc_pubkey": keypair["public_key_hex"]
    }).eq("id", user["id"]).execute()

    logger.info(f"Bitcoin keypair generated for user {user['id']}")

    return {
        "already_setup": False,
        "public_key": keypair["public_key_hex"],
        "private_key": keypair["private_key_hex"],
        "warning": "Store your private key securely on your device. We do not store it. Losing it means losing access to your collateral.",
        "message": "Bitcoin keys generated successfully"
    }


@router.post("/create-deposit-address")
async def create_deposit_address(
    req: InitDepositRequest,
    user=Depends(get_current_user)
):
    """
    Create a unique 2-of-3 multisig address for collateral deposit.
    User sends BTC to this address — we watch for confirmation.
    """
    if req.collateral_sats < 100000:
        raise HTTPException(
            status_code=400,
            detail="Minimum collateral is 100,000 sats"
        )

    # Get or use provided pubkey
    user_pubkey = req.user_pubkey
    if not user_pubkey:
        user_data = supabase.table("users")\
            .select("btc_pubkey")\
            .eq("id", user["id"])\
            .single().execute()

        if not user_data.data or not user_data.data.get("btc_pubkey"):
            raise HTTPException(
                status_code=400,
                detail="No Bitcoin key found. Call /multisig/setup-keys first."
            )
        user_pubkey = user_data.data["btc_pubkey"]

    # Create multisig address
    multisig = create_multisig_address(user_pubkey)

    # Save to database — linked to user, not yet a loan
    supabase.table("transactions").insert({
        "user_id": user["id"],
        "type": "multisig_deposit",
        "amount_sats": req.collateral_sats,
        "status": "pending",
        "payment_hash": multisig["address"],  # address as identifier
    }).execute()

    # Save pubkey if not already stored
    supabase.table("users").update({
        "btc_pubkey": user_pubkey
    }).eq("id", user["id"]).execute()

    from services.multisig_service import NETWORK
    explorer = (
        f"https://mempool.space/testnet/address/{multisig['address']}"
        if NETWORK == "testnet"
        else f"https://mempool.space/address/{multisig['address']}"
    )

    return {
        "multisig_address": multisig["address"],
        "expected_sats": req.collateral_sats,
        "network": multisig["network"],
        "explorer_url": explorer,
        "redeem_script": multisig["redeem_script_hex"],
        "instructions": [
            f"Send exactly {req.collateral_sats:,} sats to the address above",
            "Use any Bitcoin wallet (on-chain, not Lightning)",
            "Wait for 1 confirmation (~10 minutes)",
            "Tap 'Check Deposit' in the app to verify",
        ],
        "message": f"Send {req.collateral_sats:,} sats to this address to lock as collateral"
    }


@router.get("/check-deposit/{address}")
async def verify_deposit(
    address: str,
    expected_sats: int,
    user=Depends(get_current_user)
):
    """Verify a multisig deposit. Credits exactly once, owner only."""
    tx = supabase.table("transactions")\
        .select("id, status, amount_sats")\
        .eq("payment_hash", address)\
        .eq("user_id", user["id"])\
        .eq("type", "multisig_deposit")\
        .execute()

    if not tx.data:
        raise HTTPException(status_code=404, detail="Deposit address not found")

    if tx.data[0]["status"] == "settled":
        return {"confirmed": True, "already_credited": True,
                "message": "This deposit was already credited"}

    expected = tx.data[0]["amount_sats"]
    result = await check_deposit(address, expected)

    if not (result.get("confirmed") and result.get("sufficient")):
        return {
            "confirmed": False,
            "balance_sats": result.get("balance_sats", 0),
            "message": "Waiting for Bitcoin confirmation (~10 minutes).",
            "explorer_url": result.get("explorer_url", "")
        }

    claim = supabase.table("transactions")\
        .update({"status": "settled"})\
        .eq("id", tx.data[0]["id"])\
        .eq("status", "pending")\
        .execute()

    if not claim.data:
        return {"confirmed": True, "already_credited": True,
                "message": "This deposit was already credited"}

    credit = result["balance_sats"]
    goals = supabase.table("savings_goals")\
        .select("id")\
        .eq("user_id", user["id"])\
        .eq("status", "active")\
        .limit(1).execute()

    if goals.data:
        supabase.rpc("increment_goal_sats", {
            "goal_id": goals.data[0]["id"], "amount": credit
        }).execute()
    else:
        supabase.table("savings_goals").insert({
            "user_id": user["id"],
            "name": "BTC Collateral Vault",
            "target_sats": 10000000,
            "current_sats": credit,
            "status": "active",
        }).execute()

    return {
        "confirmed": True,
        "balance_sats": credit,
        "message": f"{credit:,} sats confirmed and ready as collateral",
        "explorer_url": result.get("explorer_url", "")
    }


@router.get("/collateral-status/{address}")
async def collateral_status(
    address: str,
    user=Depends(get_current_user)
):
    """
    Get current status of collateral at a multisig address.
    Users can check this anytime to verify their BTC is safe.
    """
    result = await check_deposit(address, 0)
    return {
        "address": address,
        "balance_sats": result.get("balance_sats", 0),
        "tx_count": result.get("tx_count", 0),
        "explorer_url": result.get("explorer_url", ""),
        "message": "Your Bitcoin is secured in a 2-of-3 multisig address. You can verify it on the blockchain anytime."
    }
