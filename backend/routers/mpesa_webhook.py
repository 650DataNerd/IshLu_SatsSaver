from fastapi import APIRouter, Request
from core.database import supabase

router = APIRouter(prefix="/mpesa", tags=["mpesa"])

KES_TO_SATS_RATE = 7.5

@router.post("/callback")
async def mpesa_callback(request: Request):
    try:
        body = await request.json()
    except Exception:
        return {"ResultCode": 0, "ResultDesc": "Success"}

    stk_callback = body.get("Body", {}).get("stkCallback", {})
    result_code = stk_callback.get("ResultCode")

    if result_code == 0:
        items = stk_callback.get("CallbackMetadata", {}).get("Item", [])
        metadata = {item["Name"]: item.get("Value") for item in items}

        amount_kes = metadata.get("Amount", 0)
        mpesa_ref = metadata.get("MpesaReceiptNumber", "")
        phone = str(metadata.get("PhoneNumber", ""))
        amount_sats = int(float(amount_kes) * KES_TO_SATS_RATE)

        user = supabase.table("users").select("id").eq("mpesa_phone", phone[-9:].lstrip("0")).execute()

        if user.data:
            user_id = user.data[0]["id"]
            supabase.table("transactions").insert({
                "user_id": user_id,
                "type": "deposit",
                "amount_sats": amount_sats,
                "mpesa_ref": mpesa_ref,
                "status": "settled"
            }).execute()

    return {"ResultCode": 0, "ResultDesc": "Success"}
