from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, savings, trust, mpesa_webhook

app = FastAPI(title="IshLu SatsSaver API", version="1.0.0")

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

@app.get("/health")
def health():
    return {"status": "ok", "service": "IshLu SatsSaver"}
