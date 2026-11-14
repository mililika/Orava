from pydantic import BaseModel, ConfigDict, Field

from app.data.engine import DataEngine
from app.models import ToolResult
from app.privacy.minimize import mask_identifier
from app.tools.base import AnalystTool
from app.tools.registry import registry


class TimelineInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    application_id: str = Field(min_length=5, max_length=80, pattern=r"^[A-Za-z0-9_-]+$")


class MortgageTimeline(AnalystTool):
    name = "mortgage_timeline"
    description = "Summarize the event sequence for one mortgage application. Do not include customer notes."
    input_model = TimelineInput

    def execute(self, engine: DataEngine, arguments: TimelineInput, min_cohort_size: int) -> ToolResult:
        if engine.status["mortgage_events"] not in {"present", "synthetic_fixture"}:
            return ToolResult(status="unavailable", message="Mortgage event history is missing or unreadable.")
        rows = engine.query(
            """SELECT CAST(timestamp AS VARCHAR) event_time, event_type,
                      COALESCE(decision, '') decision
               FROM mortgage_events WHERE mortgage_customer_id = ?
               ORDER BY timestamp LIMIT 50""",
            [arguments.application_id],
        )
        if not rows:
            return ToolResult(status="not_found", message="No matching application events were found.", metadata={"application_reference": mask_identifier(arguments.application_id)})
        return ToolResult(status="ok", message="Observed event history only. Free-text notes and direct identifiers were excluded.", metadata={"application_reference": mask_identifier(arguments.application_id), "event_count": len(rows), "chronological": True}, rows=rows)


registry.register(MortgageTimeline())
