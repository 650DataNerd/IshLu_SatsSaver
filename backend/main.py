from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from routers import auth, savings, trust, mpesa_webhook
from routers import loans
from routers import deposits
from routers import multisig_deposits

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="IshLu SatsSaver API", version="2.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(savings.router, prefix="/api")
app.include_router(trust.router, prefix="/api")
app.include_router(mpesa_webhook.router, prefix="/api")
app.include_router(loans.router, prefix="/api")
app.include_router(deposits.router, prefix="/api")
app.include_router(multisig_deposits.router, prefix="/api")

@app.get("/health")
def health():
    return {"status": "ok", "service": "IshLu SatsSaver", "version": "2.0.0"}
