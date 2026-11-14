from datetime import date

from pydantic import BaseModel, ConfigDict, model_validator

from app.data.engine import DataEngine
from app.models import ToolResult
from app.tools.base import AnalystTool
from app.tools.registry import registry


class CohortInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    start_date: date | None = None
    end_date: date | None = None

    @model_validator(mode="after")
    def date_range_is_complete(self):
        if (self.start_date is None) != (self.end_date is None):
            raise ValueError("Provide both start_date and end_date, or neither")
        if self.start_date and (self.end_date < self.start_date or (self.end_date - self.start_date).days > 3660):
            raise ValueError("Date range must be valid and no longer than ten years")
        return self


class CohortOutcomes(AnalystTool):
    name = "cohort_outcomes"
    description = "Summarize historical final mortgage outcomes descriptively across all applications."
    input_model = CohortInput

    def execute(self, engine: DataEngine, arguments: CohortInput, min_cohort_size: int) -> ToolResult:
        if engine.status["mortgage_outcomes"] not in {"present", "synthetic_fixture"}:
            return ToolResult(status="unavailable", message="Mortgage outcome data is missing or unreadable.")
        params = []
        if arguments.start_date:
            if engine.status["mortgage_events"] not in {"present", "synthetic_fixture"}:
                return ToolResult(status="unavailable", message="Mortgage event history is required to select a date-based cohort.")
            sql = """WITH app_dates AS (
                       SELECT mortgage_customer_id, MIN(CAST(timestamp AS DATE)) applied_on
                       FROM mortgage_events GROUP BY mortgage_customer_id
                   )
                   SELECT o.final_decision outcome, COUNT(DISTINCT o.mortgage_customer_id) application_count
                   FROM mortgage_outcomes o JOIN app_dates d USING (mortgage_customer_id)
                   WHERE d.applied_on BETWEEN ? AND ? GROUP BY o.final_decision ORDER BY o.final_decision"""
            params = [arguments.start_date, arguments.end_date]
        else:
            sql = "SELECT final_decision outcome, COUNT(DISTINCT mortgage_customer_id) application_count FROM mortgage_outcomes GROUP BY final_decision ORDER BY final_decision"
        rows = engine.query(sql, params)
        total = sum(int(row["application_count"] or 0) for row in rows)
        if total < min_cohort_size:
            return ToolResult(status="suppressed", message="The cohort is below the minimum size; outcome details are suppressed.", metadata={"minimum_cohort_size": min_cohort_size})
        visible = [row for row in rows if int(row["application_count"] or 0) >= min_cohort_size]
        omitted = len(rows) - len(visible)
        return ToolResult(
            status="ok",
            message="Descriptive historical outcomes only; not a prediction or lending recommendation.",
            metadata={"cohort_start": str(arguments.start_date) if arguments.start_date else None, "cohort_end": str(arguments.end_date) if arguments.end_date else None, "applications": total, "minimum_cohort_size": min_cohort_size, "suppressed_outcome_groups": omitted},
            rows=[{"outcome": row["outcome"], "application_count": row["application_count"], "share_percent": round(int(row["application_count"]) / total * 100, 2)} for row in visible],
        )


registry.register(CohortOutcomes())
