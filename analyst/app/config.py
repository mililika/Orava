from functools import lru_cache
from pathlib import Path

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    gemini_api_key: SecretStr | None = None
    gemini_model: str = "gemini-3.8-flash"
    data_dir: Path = Path("./data")
    min_cohort_size: int = Field(default=10, ge=2, le=1000)
    max_tool_iterations: int = Field(default=4, ge=1, le=8)
    max_output_tokens: int = Field(default=700, ge=100, le=4096)
    request_timeout_seconds: float = Field(default=30, gt=0, le=120)
    demo_mode: bool = True

    @field_validator("gemini_model")
    @classmethod
    def model_is_not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("GEMINI_MODEL cannot be empty")
        return value.strip()


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
