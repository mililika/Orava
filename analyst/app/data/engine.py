from pathlib import Path
from threading import RLock

import duckdb

from .schema import TABLES

LFS_PREFIX = b"version https://git-lfs.github.com/spec/v1"


class DataEngine:
    """Read-only CSV query adapter; table identifiers come only from TABLES."""

    def __init__(self, data_dir: Path, demo_mode: bool = True):
        self.data_dir = data_dir
        self.demo_mode = demo_mode
        self.connection = duckdb.connect(database=":memory:")
        self._lock = RLock()
        self.status = {name: self._file_status(table.file_name) for name, table in TABLES.items()}
        if demo_mode and all(status == "missing" for status in self.status.values()):
            self._load_fixture()
        else:
            self._load_files()

    def _file_status(self, file_name: str) -> str:
        path = self.data_dir / file_name
        if not path.exists():
            return "missing"
        try:
            with path.open("rb") as source:
                prefix = source.read(100)
        except OSError:
            return "unreadable"
        if prefix.startswith(LFS_PREFIX):
            return "lfs_pointer"
        return "present"

    def _load_files(self) -> None:
        for table, spec in TABLES.items():
            path = (self.data_dir / spec.file_name).resolve()
            if self.status[table] != "present":
                continue
            escaped = str(path).replace("'", "''")
            try:
                self.connection.execute(
                    f"CREATE VIEW {table} AS SELECT * FROM read_csv_auto('{escaped}', "
                    "header=true, encoding='utf-8', sample_size=20000)"
                )
                columns = {row[0] for row in self.connection.execute(f"DESCRIBE {table}").fetchall()}
                missing = set(spec.required_columns) - columns
                if missing:
                    self.connection.execute(f"DROP VIEW {table}")
                    self.status[table] = "invalid_schema"
            except Exception:
                self.status[table] = "unreadable"

    def _load_fixture(self) -> None:
        self.status.update({table: "synthetic_fixture" for table in TABLES})
        self.connection.execute("""
            CREATE TABLE transactions AS SELECT * FROM (VALUES
              ('DEMO-A', DATE '2026-01-03', 'Groceries', -42.50, 'Market'),
              ('DEMO-A', DATE '2026-01-10', 'Groceries', -38.00, 'Market'),
              ('DEMO-B', DATE '2026-01-12', 'Dining', -24.00, 'Cafe'),
              ('DEMO-A', DATE '2026-02-03', 'Groceries', -55.00, 'Market'),
              ('DEMO-B', DATE '2026-02-07', 'Dining', -36.00, 'Cafe'),
              ('DEMO-C', DATE '2026-02-11', 'Travel', -90.00, 'Rail')
            ) t(customer_id, tx_date, category, tx_amount_eur, merchant_id)
        """)
        self.connection.execute("""
            CREATE TABLE mortgage_events AS SELECT * FROM (VALUES
              ('DEMO-M1', TIMESTAMP '2025-03-01 09:00:00', 'application_received', 'pending'),
              ('DEMO-M1', TIMESTAMP '2025-03-03 10:00:00', 'documents_reviewed', 'pending'),
              ('DEMO-M1', TIMESTAMP '2025-03-08 11:00:00', 'decision_recorded', 'approved'),
              ('DEMO-M2', TIMESTAMP '2025-04-01 09:00:00', 'application_received', 'pending'),
              ('DEMO-M2', TIMESTAMP '2025-04-12 11:00:00', 'decision_recorded', 'rejected')
            ) t(mortgage_customer_id, timestamp, event_type, decision)
        """)
        self.connection.execute("""
            CREATE TABLE mortgage_outcomes AS SELECT * FROM (VALUES
              ('DEMO-M1', 'DEMO-A', 'approved'), ('DEMO-M2', 'DEMO-B', 'rejected'),
              ('DEMO-M3', 'DEMO-C', 'approved'), ('DEMO-M4', 'DEMO-D', 'approved'),
              ('DEMO-M5', 'DEMO-E', 'rejected'), ('DEMO-M6', 'DEMO-F', 'approved'),
              ('DEMO-M7', 'DEMO-G', 'rejected'), ('DEMO-M8', 'DEMO-H', 'approved'),
              ('DEMO-M9', 'DEMO-I', 'approved'), ('DEMO-M10', 'DEMO-J', 'rejected')
            ) t(mortgage_customer_id, customer_id, final_decision)
        """)

    def query(self, sql: str, params: list[object] | None = None) -> list[dict]:
        with self._lock:
            cursor = self.connection.execute(sql, params or [])
            names = [column[0] for column in cursor.description]
            return [dict(zip(names, row, strict=True)) for row in cursor.fetchmany(100)]
