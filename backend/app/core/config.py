from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "MemoZip API"
    environment: str = "development"
    database_url: str
    secret_key: str
    gemini_api_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    upload_dir: str = "uploads"

    model_config = SettingsConfigDict(env_file="app/.env")


settings = Settings()
