from dataclasses import dataclass


@dataclass(frozen=True)
class SourceTable:
    file_name: str
    required_columns: tuple[str, ...]
    aliases: dict[str, str]


TABLES = {
    "transactions": SourceTable(
        "tx_junction_transactions.csv",
        ("customer_id", "tx_date", "category", "tx_amount_eur", "merchant_id"),
        {"date": "tx_date", "amount_eur": "tx_amount_eur", "merchant": "merchant_id"},
    ),
    "customers": SourceTable(
        "tx_customers_junction.csv",
        ("customer_id", "customer_postal_code", "customer_age"),
        {"postal_code": "customer_postal_code", "age": "customer_age"},
    ),
    "mortgage_events": SourceTable(
        "mtg_negotiation_history.csv",
        ("mortgage_customer_id", "timestamp", "event_type", "decision"),
        {"event_timestamp": "timestamp", "application_id": "mortgage_customer_id"},
    ),
    "mortgage_outcomes": SourceTable(
        "mtg_tx_customer_link_and_final_mtg_infio.csv",
        ("mortgage_customer_id", "customer_id", "final_decision"),
        {"application_id": "mortgage_customer_id", "outcome": "final_decision"},
    ),
}
