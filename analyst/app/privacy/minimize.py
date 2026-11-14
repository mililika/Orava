import re


def mask_identifier(value: str) -> str:
    """Keep only a short suffix for an analyst-facing reference."""
    return f"…{value[-4:]}" if len(value) > 4 else "…"


def safe_tool_payload(value: object) -> str:
    """Serialize bounded tool results; SQL, notes, and identifiers are never accepted here."""
    import json

    payload = json.dumps(value, default=str, ensure_ascii=False)
    return re.sub(r"(?i)(CUST|MORTGAGE|DEMO)-?[A-Z0-9]{4,}", "[masked]", payload)
