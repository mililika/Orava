from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=2000)


class ChatRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    question: str = Field(min_length=1, max_length=2000)
    history: list[ChatMessage] = Field(default_factory=list, max_length=8)


class ChatResponse(BaseModel):
    answer: str
    data_status: dict[str, str]


class ToolResult(BaseModel):
    status: str
    message: str
    metadata: dict[str, str | int | float | None] = Field(default_factory=dict)
    rows: list[dict[str, str | int | float | None]] = Field(default_factory=list)
