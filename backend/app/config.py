from typing import List
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # App Settings
    APP_NAME: str = "FixBack AI Backend"
    APP_VERSION: str = "1.0.0"
    APP_ENV: str = "development"
    API_PREFIX: str = "/api"

    # Database Settings
    DATABASE_URL: str = Field(
        default="postgresql+psycopg://username@localhost:5432/fixback",
        description="SQLAlchemy database connection URL",
    )

    # Hindsight Configuration
    HINDSIGHT_API_URL: str = Field(
        default="https://api.hindsight.vectorize.io",
        description="Base URL for Hindsight API",
    )
    HINDSIGHT_API_KEY: str = Field(
        default="",
        description="API Key for Hindsight Cloud Service",
    )
    HINDSIGHT_BANK_ID: str = Field(
        default="fixback-engineering",
        description="Hindsight memory bank identifier",
    )

    # Groq Configuration
    GROQ_API_KEY: str = Field(
        default="",
        description="API Key for Groq Cloud API",
    )
    GROQ_MODEL: str = Field(
        default="openai/gpt-oss-120b",
        description="Groq model for AI incident diagnosis",
    )

    # CORS Settings
    CORS_ORIGINS: str = Field(
        default="http://localhost:5173",
        description="Comma-separated list of allowed CORS origins",
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origins_list(self) -> List[str]:
        if not self.CORS_ORIGINS:
            return ["*"]
        if self.CORS_ORIGINS.strip() == "*":
            return ["*"]
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


settings = Settings()
