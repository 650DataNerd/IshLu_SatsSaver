import jwt
import bcrypt
from datetime import datetime, timedelta, timezone
from cryptography.fernet import Fernet
from core.config import settings

fernet = Fernet(settings.encryption_key.encode())

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())

def create_access_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)

def decode_token(token: str) -> dict:
    return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])

def encrypt_mnemonic(mnemonic: str) -> str:
    return fernet.encrypt(mnemonic.encode()).decode()

def decrypt_mnemonic(encrypted: str) -> str:
    return fernet.decrypt(encrypted.encode()).decode()
