# Orava Analyst Demo

A local-only API service for the Historical Analyst screen inside Orava. It does not connect to live bank systems. FastAPI and DuckDB query the Junction CSVs; the official Google Gen AI SDK sends bounded results to Gemini using a GCP Gemini Enterprise Agent Platform Express Mode key. The customer-facing UI lives in `mobile/src/screens/AnalystScreen.tsx` and uses the Orava app's existing components and theme.

## Run

Install Python 3.11+, then from this folder:

```powershell
py -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Create an API key for [Gemini Enterprise Agent Platform Express Mode](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/start/express-mode/express-mode-api-quickstart) in Google Cloud, then replace `GEMINI_API_KEY=replace-me` in `.env`. Google currently marks Express Mode as Preview. Startup fails with a clear message when the key is absent or still the placeholder. Never put the key in the web client. This uses the GCP-managed Express Mode key, not a Gemini Developer API (AI Studio) key and not an API key for the standard ADC-authenticated Vertex AI endpoint. The example points `DATA_DIR` to the inspected upstream checkout at `../_source_inspection`; for a fresh checkout, put the CSVs in `analyst/data/` and change `DATA_DIR=./data`. Start the API from this folder with `uvicorn app.main:app --reload --host 127.0.0.1 --port 8000`.

In a second terminal at the repository root, copy `mobile/.env.example` to `mobile/.env`, set `EXPO_PUBLIC_ANALYST_ENABLED=true` and `EXPO_PUBLIC_ANALYST_API_URL=http://127.0.0.1:8000`, then run `npm run web`. Open Orava's Home screen and select **Historical analyst**. Keep the API bound to localhost for this unauthenticated demo. For a phone on another device, localhost will refer to that device; a reachable HTTPS backend with authentication is needed before exposing this service beyond the local preview.

`GEMINI_MODEL` defaults to `gemini-3.8-flash`; set it to a model available to the GCP project if needed. Set `MAX_OUTPUT_TOKENS`, `REQUEST_TIMEOUT_SECONDS`, and `MAX_TOOL_ITERATIONS` to bound output, requests, and the manual function-calling loop.

## Data inspection (2026-11-14)

The referenced upstream repository README describes four UTF-8 BOM CSVs and says `tx_junction_transactions.csv` is Git LFS managed. In the inspected checkout, all four source files are present: Git LFS reports the transaction object available and `git lfs fsck --objects` passes; it is 362,796,501 bytes and begins with a UTF-8 BOM and the expected `customer_id,...` header, not an LFS pointer. `tx_customers_junction.csv` has 5,100 parsed rows (102,050 bytes), `mtg_negotiation_history.csv` has 3,452 (653,990 bytes), and `mtg_tx_customer_link_and_final_mtg_infio.csv` has 200 (18,804 bytes). No CSV was edited. The app reports per-file status and disables tools that need missing tables. If the transaction file is missing in another checkout, use `git lfs pull` and verify the first bytes before querying.

The app expects source names as listed in the upstream README. It preserves column names as stored. The query layer recognizes its current schema by explicit source-name constants; no CSV is rewritten. CSV parsing uses UTF-8 with BOM handling. For large files, DuckDB queries the CSV on disk and sends only small query results to Gemini. See `app/data/schema.py` for the explicitly documented source-to-query aliases.

## Architecture

| Layer | Responsibility |
| --- | --- |
| `app/config.py` | Validated environment settings |
| `app/data/` | CSV status, schema aliases, read-only DuckDB adapter, fixture |
| `app/tools/` | Validated tool contracts, analytics, one self-registering registry |
| `app/privacy/` | Identifier masking and model payload minimization |
| `app/llm/` | Google Gen AI client wrapper, Gemini schema translation, and bounded function-calling loop |
| `app/api/` | Thin typed HTTP routes with Expo web CORS allowlist |
| `mobile/src/screens/AnalystScreen.tsx` | Orava-native analyst UI with loading, error, retry, and conversation states |
| `mobile/src/lib/analyst.ts` | Typed client for status and chat requests; no API key or CSV access |

```text
Orava app → FastAPI route → Chat service → Gemini adapter
                                  ↘ validated tools → DuckDB → local CSVs
```

CSV contents and mortgage free-text notes are untrusted data. Notes are not sent to Gemini. Gemini receives only bounded aggregate/event results, with customer and mortgage IDs masked. The tools never execute model-written SQL or code. Cohort outcomes are descriptive only, exclude age and postal code from cohort selection, and suppress groups below `MIN_COHORT_SIZE`.

Available tools: period-over-period spending change (same-length adjacent ranges), top merchants, top categories, one application's event timeline, and historical outcomes for all applications or a user-selected application-date range (based on the earliest logged event). No demographic or customer-level segmentation is implemented. If a selected range is too small, the tool suppresses the outcome breakdown.

## Privacy and limits

This is a single-user local demo with no authentication or authorization. The mobile flag controls whether the screen is visible; it is not an access-control boundary. Bind the API only to localhost. Do not expose it to a network or use it to look up another person's records. It is not production-ready. No customer-level transaction detail, age, postal code, or free-text notes are placed in routine logs or model requests. Historical mortgage outcomes are descriptive; the app does not make or recommend credit, eligibility, approval, rejection, or pricing decisions. Historical data is not live account data. If a source is absent or incomplete, dependent answers state that gap rather than fabricate values.

## Tests and checks

Install the development extras, then run `pytest` and `ruff check . && ruff format --check .` from this folder. The tests cover tool input validation, query results against a small synthetic fixture, and the tool loop with a fake LLM client.
