from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from core.database import supabase
from core.security import hash_password, verify_password, create_access_token
from services.wallet_service import create_user_wallet

router = APIRouter(prefix="/auth", tags=["auth"])

class RegisterRequest(BaseModel):
    phone: str
    password: str
    mpesa_phone: str | None = None

class LoginRequest(BaseModel):
    phone: str
    password: str

@router.post("/register")
async def register(req: RegisterRequest):
    existing = supabase.table("users").select("id").eq("phone", req.phone).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Phone number already registered")

    user = supabase.table("users").insert({
        "phone": req.phone,
        "password_hash": hash_password(req.password),
        "mpesa_phone": req.mpesa_phone or req.phone,
    }).execute()

    user_id = user.data[0]["id"]

    # Wallet creation is best-effort — don't fail registration if LNbits is down
    try:
        await create_user_wallet(user_id, req.phone[-6:])
    except Exception as e:
        print(f"Warning: wallet creation failed for {user_id}: {e}")

    token = create_access_token(user_id)
    return {"access_token": token, "user_id": user_id}

@router.post("/login")
async def login(req: LoginRequest):
    user = supabase.table("users").select("*").eq("phone", req.phone).execute()
    if not user.data:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(req.password, user.data[0]["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token(user.data[0]["id"])
    return {"access_token": token, "user_id": user.data[0]["id"]}

import random
import string

# In-memory store for reset codes (use Redis in production)
reset_codes: dict = {}

class ForgotPasswordRequest(BaseModel):
    phone: str

class ResetPasswordRequest(BaseModel):
    phone: str
    code: str
    new_password: str

@router.post("/forgot-password")
async def forgot_password(req: ForgotPasswordRequest):
    # Check user exists
    user = supabase.table("users").select("id").eq("phone", req.phone).execute()
    if not user.data:
        # Don't reveal if phone exists
        return {"message": "If this number is registered, a code has been sent"}

    # Generate 6-digit code
    code = ''.join(random.choices(string.digits, k=6))
    reset_codes[req.phone] = code

    # In production: send via SMS. For now print to console
    print(f"RESET CODE for {req.phone}: {code}")

    return {"message": "Reset code generated", "dev_code": code}

@router.post("/reset-password")
async def reset_password(req: ResetPasswordRequest):
    stored_code = reset_codes.get(req.phone)
    if not stored_code or stored_code != req.code:
        raise HTTPException(status_code=400, detail="Invalid or expired code")

    if len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password too short")

    # Update password
    supabase.table("users").update({
        "password_hash": hash_password(req.new_password)
    }).eq("phone", req.phone).execute()

    # Clear used code
    del reset_codes[req.phone]

    return {"message": "Password reset successful"}
