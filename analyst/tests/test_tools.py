from datetime import date

import pytest
from pydantic import ValidationError

from app.data.engine import DataEngine
from app.tools.cohort_outcomes import CohortInput, CohortOutcomes
from app.tools.spending_change import SpendingChange, SpendingInput
from app.tools.top_categories import TopCategories, TopCategoriesInput
from app.tools.top_merchants import TopMerchants, TopMerchantsInput


@pytest.fixture
def engine(tmp_path):
    return DataEngine(tmp_path, demo_mode=True)


def test_spending_input_rejects_reversed_or_long_range():
    with pytest.raises(ValidationError):
        SpendingInput(start_date=date(2026, 2, 1), end_date=date(2026, 1, 1))
    with pytest.raises(ValidationError):
        SpendingInput(start_date=date(2025, 1, 1), end_date=date(2026, 2, 1))


def test_top_merchants_is_limited(engine):
    result = TopMerchants().execute(engine, TopMerchantsInput(start_date="2026-01-01", end_date="2026-02-28", limit=2), 10)
    assert result.status == "ok"
    assert len(result.rows) <= 2
    assert result.rows[0]["merchant"] == "Market"


def test_top_categories_returns_spending_share(engine):
    result = TopCategories().execute(engine, TopCategoriesInput(start_date="2026-02-01", end_date="2026-02-28"), 10)
    assert result.status == "ok"
    assert result.rows[0]["category"] == "Travel"
    assert result.rows[0]["share_of_total_spending_percent"] > 0


def test_spending_comparison_has_two_periods(engine):
    args = SpendingInput(start_date="2026-02-01", end_date="2026-02-28")
    result = SpendingChange().execute(engine, args, 10)
    assert result.status == "ok"
    assert [row["period"] for row in result.rows] == ["previous", "requested", "change_eur"]
    assert result.rows[1]["amount_eur"] == 181.0


def test_cohort_suppression_enforced_in_tool(engine):
    result = CohortOutcomes().execute(engine, CohortInput(), 11)
    assert result.status == "suppressed"
    assert result.rows == []
