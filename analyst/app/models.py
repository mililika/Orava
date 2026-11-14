from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=2000)


class MoneySummary(BaseModel):
    period: str = Field(max_length=80)
    income: float = Field(ge=0, le=1_000_000_000)
    spending: float = Field(ge=0, le=1_000_000_000)
    score: int = Field(ge=0, le=100)
    health_message: str = Field(max_length=500)
    health_reasons: list[str] = Field(max_length=8)
    safe_to_spend_this_week: str = Field(max_length=40)
    safe_to_spend_remaining: float = Field(ge=-1_000_000_000, le=1_000_000_000)
    per_day_after_today: float = Field(ge=0, le=1_000_000_000)
    everyday_extras: str = Field(max_length=40)
    everyday_extras_change: str = Field(max_length=40)
    kept_rate: str = Field(max_length=40)
    breakdown: dict[str, float] = Field(max_length=8)


class ChatRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    question: str = Field(min_length=1, max_length=2000)
    history: list[ChatMessage] = Field(default_factory=list, max_length=8)
    money_summary: MoneySummary | None = None


class ChatResponse(BaseModel):
    answer: str
    data_status: dict[str, str]


class ToolResult(BaseModel):
    status: str
    message: str
    metadata: dict[str, str | int | float | None] = Field(default_factory=dict)
    rows: list[dict[str, str | int | float | None]] = Field(default_factory=list)
