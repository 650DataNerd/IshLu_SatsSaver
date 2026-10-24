import httpx
import base64
from datetime import datetime
from core.config import settings

MPESA_BASE = "https://sandbox.safaricom.co.ke"

async def get_mpesa_token() -> str:
    credentials = base64.b64encode(
        f"{settings.mpesa_consumer_key}:{settings.mpesa_consumer_secret}".encode()
    ).decode()

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{MPESA_BASE}/oauth/v1/generate?grant_type=client_credentials",
            headers={"Authorization": f"Basic {credentials}"},
            timeout=10.0
        )
        resp.raise_for_status()
        return resp.json()["access_token"]

def get_mpesa_password() -> tuple:
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    raw = f"{settings.mpesa_shortcode}{settings.mpesa_passkey}{timestamp}"
    password = base64.b64encode(raw.encode()).decode()
    return password, timestamp

async def initiate_stk_push(phone: str, amount_kes: int, account_ref: str) -> dict:
    token = await get_mpesa_token()
    password, timestamp = get_mpesa_password()

    # Normalize phone to 254XXXXXXXXX
    phone = phone.strip().replace("+", "").replace(" ", "")
    if phone.startswith("0"):
        phone = "254" + phone[1:]
    if not phone.startswith("254"):
        phone = "254" + phone

    payload = {
        "BusinessShortCode": settings.mpesa_shortcode,
        "Password": password,
        "Timestamp": timestamp,
        "TransactionType": "CustomerPayBillOnline",
        "Amount": max(int(amount_kes), 10),
        "PartyA": phone,
        "PartyB": settings.mpesa_shortcode,
        "PhoneNumber": phone,
        "CallBackURL": settings.mpesa_callback_url,
        "AccountReference": account_ref[:12],
        "TransactionDesc": "IshLu SatsSaver deposit"
    }

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{MPESA_BASE}/mpesa/stkpush/v1/processrequest",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            },
            json=payload,
            timeout=15.0
        )
        resp.raise_for_status()
        return resp.json()

async def query_stk_status(checkout_request_id: str) -> dict:
    token = await get_mpesa_token()
    password, timestamp = get_mpesa_password()

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{MPESA_BASE}/mpesa/stkpushquery/v1/query",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "BusinessShortCode": settings.mpesa_shortcode,
                "Password": password,
                "Timestamp": timestamp,
                "CheckoutRequestID": checkout_request_id
            },
            timeout=10.0
        )
        return resp.json()
