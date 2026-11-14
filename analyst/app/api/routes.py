from fastapi import HTTPException
from pydantic import BaseModel

from app.config import Settings
from app.data.engine import DataEngine
from app.llm.client import GeminiClient
from app.llm.service import ChatService
from app.models import ChatRequest, ChatResponse


class StatusResponse(BaseModel):
    data: dict[str, str]
    chat_configured: bool


def install_routes(app, settings: Settings, engine: DataEngine) -> None:
    @app.get("/api/status", response_model=StatusResponse)
    def status():
        return StatusResponse(data=engine.status, chat_configured=settings.gemini_api_key is not None)

    @app.post("/api/chat", response_model=ChatResponse)
    def chat(request: ChatRequest):
        if not settings.gemini_api_key:
            raise HTTPException(status_code=503, detail="GEMINI_API_KEY is missing. Add it to analyst/.env and restart the app.")
        try:
            answer = ChatService(settings, engine, GeminiClient(settings)).ask(
                request.question,
                request.history,
            )
        except Exception:
            raise HTTPException(status_code=503, detail="The analysis service is temporarily unavailable.") from None
        return ChatResponse(answer=answer, data_status=engine.status)
