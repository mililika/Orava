from datetime import date

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.data.engine import DataEngine
from app.models import ToolResult
from app.tools.base import AnalystTool
from app.tools.registry import registry


class SpendingInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    start_date: date
    end_date: date
    category: str | None = Field(default=None, min_length=1, max_length=80)

    @model_validator(mode="after")
    def valid_range(self):
        if self.end_date < self.start_date:
            raise ValueError("end_date must be on or after start_date")
        if (self.end_date - self.start_date).days > 366:
            raise ValueError("Date range is limited to one year")
        return self


class SpendingChange(AnalystTool):
    name = "spending_change"
    description = "Compare spending in a date range with the same-length period immediately before it."
    input_model = SpendingInput

    def execute(self, engine: DataEngine, arguments: SpendingInput, min_cohort_size: int) -> ToolResult:
        if engine.status["transactions"] not in {"present", "synthetic_fixture"}:
            return ToolResult(status="unavailable", message="Transaction CSV is missing or unreadable.")
        days = (arguments.end_date - arguments.start_date).days + 1
        prev_start = arguments.start_date.fromordinal(arguments.start_date.toordinal() - days)
        category_clause = " AND category ILIKE ?" if arguments.category else ""
        category_params = [f"%{arguments.category}%"] if arguments.category else []
        query = (
            "SELECT SUM(ABS(TRY_CAST(tx_amount_eur AS DOUBLE))) amount_eur, COUNT(*) row_count "
            "FROM transactions WHERE tx_date BETWEEN ? AND ? "
            "AND TRY_CAST(tx_amount_eur AS DOUBLE)<0"
            + category_clause
        )
        # Keep requested and previous intervals distinct; compute each explicitly for robust metadata.
        requested = engine.query(
            query, [arguments.start_date, arguments.end_date, *category_params]
        )[0]
        previous = engine.query(
            query,
            [
                prev_start,
                arguments.start_date.fromordinal(arguments.start_date.toordinal() - 1),
                *category_params,
            ],
        )[0]
        current_total = float(requested["amount_eur"] or 0)
        prior_total = float(previous["amount_eur"] or 0)
        delta = current_total - prior_total
        return ToolResult(
            status="ok",
            message="Amounts are sums of absolute negative transaction values (EUR).",
            metadata={
                "requested_start": str(arguments.start_date),
                "requested_end": str(arguments.end_date),
                "previous_start": str(prev_start),
                "previous_end": str(
                    arguments.start_date.fromordinal(arguments.start_date.toordinal() - 1)
                ),
                "category_filter": arguments.category,
                "comparison_method": "equal day-count adjacent periods",
            },
            rows=[
                {
                    "period": "previous",
                    "amount_eur": round(prior_total, 2),
                    "row_count": previous["row_count"],
                },
                {
                    "period": "requested",
                    "amount_eur": round(current_total, 2),
                    "row_count": requested["row_count"],
                },
                {
                    "period": "change_eur",
                    "amount_eur": round(delta, 2),
                    "percent_change": round(delta / prior_total * 100, 2) if prior_total else None,
                },
            ],
        )


registry.register(SpendingChange())
