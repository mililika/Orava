from datetime import date

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.data.engine import DataEngine
from app.models import ToolResult
from app.tools.base import AnalystTool
from app.tools.registry import registry


class TopCategoriesInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    start_date: date
    end_date: date
    limit: int = Field(default=5, ge=1, le=10)

    @model_validator(mode="after")
    def valid_range(self):
        if self.end_date < self.start_date or (self.end_date - self.start_date).days > 366:
            raise ValueError("Date range must be valid and no longer than one year")
        return self


class TopCategories(AnalystTool):
    name = "top_categories"
    description = "Rank spending categories by total amount for a specified date range."
    input_model = TopCategoriesInput

    def execute(self, engine: DataEngine, arguments: TopCategoriesInput, min_cohort_size: int) -> ToolResult:
        if engine.status["transactions"] not in {"present", "synthetic_fixture"}:
            return ToolResult(status="unavailable", message="Transaction CSV is missing or unreadable.")
        rows = engine.query(
            """SELECT category, SUM(ABS(TRY_CAST(tx_amount_eur AS DOUBLE))) amount_eur, COUNT(*) row_count
               FROM transactions WHERE tx_date BETWEEN ? AND ? AND TRY_CAST(tx_amount_eur AS DOUBLE)<0
               GROUP BY category ORDER BY amount_eur DESC LIMIT ?""",
            [arguments.start_date, arguments.end_date, arguments.limit],
        )
        total = engine.query(
            "SELECT SUM(ABS(TRY_CAST(tx_amount_eur AS DOUBLE))) total_eur FROM transactions WHERE tx_date BETWEEN ? AND ? AND TRY_CAST(tx_amount_eur AS DOUBLE)<0",
            [arguments.start_date, arguments.end_date],
        )[0]["total_eur"] or 0
        total = float(total)
        result_rows = [
            {
                **row,
                "amount_eur": round(float(row["amount_eur"] or 0), 2),
                "share_of_total_spending_percent": (
                    round(float(row["amount_eur"] or 0) / total * 100, 2) if total else None
                ),
            }
            for row in rows
        ]
        return ToolResult(
            status="ok",
            message=(
                "Ranked by sum of absolute negative transaction values (EUR); "
                "shares use all spending in the range."
            ),
            metadata={
                "start_date": str(arguments.start_date),
                "end_date": str(arguments.end_date),
                "returned_categories": len(rows),
                "total_spending_eur": round(total, 2),
            },
            rows=result_rows,
        )


registry.register(TopCategories())
