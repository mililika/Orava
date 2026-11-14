from pydantic import BaseModel, ConfigDict, Field


class ChatRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    question: str = Field(min_length=1, max_length=2000)


class ChatResponse(BaseModel):
    answer: str
    data_status: dict[str, str]


class ToolResult(BaseModel):
    status: str
    message: str
    metadata: dict[str, str | int | float | None] = Field(default_factory=dict)
    rows: list[dict[str, str | int | float | None]] = Field(default_factory=list)
