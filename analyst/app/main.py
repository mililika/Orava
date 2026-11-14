from fastapi import FastAPI

from app.api.routes import install_routes
from app.config import get_settings
from app.data.engine import DataEngine

settings = get_settings()
if not settings.gemini_api_key or settings.gemini_api_key.get_secret_value().strip().lower() in {
    "",
    "replace-me",
}:
    raise RuntimeError("GEMINI_API_KEY is missing. Copy .env.example to .env, set a real GCP key, and restart.")

engine = DataEngine(settings.data_dir, demo_mode=settings.demo_mode)
app = FastAPI(title="Orava Analyst Demo", docs_url="/api/docs", redoc_url=None)
install_routes(app, settings, engine)
