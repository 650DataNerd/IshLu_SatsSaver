from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from core.database import supabase
from core.security import hash_password, verify_password, create_access_token
from services.wallet_service import create_user_wallet
from slowapi import Limiter
from slowapi.util import get_remote_address
import random
import string
from datetime import datetime, timedelta

router = APIRouter(prefix="/auth", tags=["auth"])
limiter = Limiter(key_func=get_remote_address)


class RegisterRequest(BaseModel):
    phone: str
    password: str
    mpesa_phone: str | None = None


class LoginRequest(BaseModel):
    phone: str
    password: str


@router.post("/register")
@limiter.limit("5/hour")
async def register(request: Request, req: RegisterRequest):
    existing = supabase.table("users").select("id").eq("phone", req.phone).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Phone number already registered")

    user = supabase.table("users").insert({
        "phone": req.phone,
        "password_hash": hash_password(req.password),
        "mpesa_phone": req.mpesa_phone or req.phone,
    }).execute()

    user_id = user.data[0]["id"]

    try:
        await create_user_wallet(user_id, req.phone[-6:])
    except Exception as e:
        print(f"Warning: wallet creation failed for {user_id}: {e}")

    token = create_access_token(user_id)
    return {"access_token": token, "user_id": user_id}


@router.post("/login")
@limiter.limit("10/minute")
async def login(request: Request, req: LoginRequest):
    user = supabase.table("users").select("*").eq("phone", req.phone).execute()
    if not user.data:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not verify_password(req.password, user.data[0]["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(user.data[0]["id"])
    return {"access_token": token, "user_id": user.data[0]["id"]}


# In-memory store for reset codes — now with expiry timestamp
reset_codes: dict = {}


class ForgotPasswordRequest(BaseModel):
    phone: str


class ResetPasswordRequest(BaseModel):
    phone: str
    code: str
    new_password: str


@router.post("/forgot-password")
@limiter.limit("3/hour")
async def forgot_password(request: Request, req: ForgotPasswordRequest):
    user = supabase.table("users").select("id").eq("phone", req.phone).execute()
    if not user.data:
        return {"message": "If this number is registered, a code has been sent"}

    code = ''.join(random.choices(string.digits, k=6))
    reset_codes[req.phone] = {
        "code": code,
        "expires_at": datetime.utcnow() + timedelta(minutes=10)
    }

    print(f"RESET CODE for {req.phone}: {code}")

    return {"message": "Reset code generated. Check your phone for SMS."}


@router.post("/reset-password")
@limiter.limit("5/hour")
async def reset_password(request: Request, req: ResetPasswordRequest):
    entry = reset_codes.get(req.phone)

    if not entry:
        raise HTTPException(status_code=400, detail="Invalid or expired code")

    if datetime.utcnow() > entry["expires_at"]:
        del reset_codes[req.phone]
        raise HTTPException(status_code=400, detail="Code has expired. Request a new one.")

    if entry["code"] != req.code:
        raise HTTPException(status_code=400, detail="Invalid or expired code")

    if len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password too short")

    supabase.table("users").update({
        "password_hash": hash_password(req.new_password)
    }).eq("phone", req.phone).execute()

    del reset_codes[req.phone]

    return {"message": "Password reset successful"}
