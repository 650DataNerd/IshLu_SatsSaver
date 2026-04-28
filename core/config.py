from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    supabase_url: str
    supabase_service_key: str
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 10080  # 7 days

    lnbits_url: str = "https://legend.lnbits.com"
    lnbits_admin_key: str = ""

    mpesa_consumer_key: str = ""
    mpesa_consumer_secret: str = ""
    mpesa_shortcode: str = "174379"
    mpesa_passkey: str = ""
    mpesa_callback_url: str = "https://placeholder.com/api/mpesa/callback"

    anthropic_api_key: str = ""
    encryption_key: str

    class Config:
        env_file = ".env"

settings = Settings()
