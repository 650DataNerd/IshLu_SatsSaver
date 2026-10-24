import httpx
from core.config import settings
from core.database import supabase

LNBITS_BASE = settings.lnbits_url

async def create_user_wallet(user_id: str, user_name: str) -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{LNBITS_BASE}/api/v1/account",
            headers={"X-Api-Key": settings.lnbits_admin_key},
            json={"name": f"SatsSaver-{user_name[:20]}"},
            timeout=15.0
        )
        resp.raise_for_status()
        data = resp.json()

        supabase.table("users").update({
            "lnbits_wallet_id": data["id"],
            "lnbits_admin_key": data["adminkey"],
            "lnbits_invoice_key": data["inkey"],
        }).eq("id", user_id).execute()

        return data

async def create_invoice(user_id: str, amount_sats: int, memo: str) -> dict:
    user = supabase.table("users").select("lnbits_invoice_key").eq("id", user_id).single().execute()
    invoice_key = user.data["lnbits_invoice_key"]

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{LNBITS_BASE}/api/v1/payments",
            headers={"X-Api-Key": invoice_key},
            json={
                "out": False,
                "amount": amount_sats,
                "memo": memo,
                "expiry": 3600,
            },
            timeout=15.0
        )
        resp.raise_for_status()
        return resp.json()

async def check_invoice_paid(user_id: str, payment_hash: str) -> bool:
    user = supabase.table("users").select("lnbits_invoice_key").eq("id", user_id).single().execute()
    invoice_key = user.data["lnbits_invoice_key"]

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{LNBITS_BASE}/api/v1/payments/{payment_hash}",
            headers={"X-Api-Key": invoice_key},
            timeout=10.0
        )
        if resp.status_code == 200:
            return resp.json().get("paid", False)
        return False

async def get_wallet_balance(user_id: str) -> int:
    user = supabase.table("users").select("lnbits_invoice_key").eq("id", user_id).single().execute()
    invoice_key = user.data["lnbits_invoice_key"]

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{LNBITS_BASE}/api/v1/wallet",
            headers={"X-Api-Key": invoice_key},
            timeout=10.0
        )
        resp.raise_for_status()
        return resp.json()["balance"]
