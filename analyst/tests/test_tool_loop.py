from app.config import Settings
from app.data.engine import DataEngine
from app.llm.client import FunctionCall, LLMResponse, _gemini_schema
from app.llm.service import ChatService
from app.tools.spending_change import SpendingInput


class FakeClient:
    def __init__(self):
        self.calls = 0

    def generate_content(self, *, tools, conversation, system_instruction, max_output_tokens):
        self.calls += 1
        if self.calls == 1:
            return LLMResponse(
                text="",
                function_calls=[FunctionCall(name="cohort_outcomes", arguments={})],
                provider_content=object(),
            )
        result = conversation[-1].function_results[0]
        assert result.name == "cohort_outcomes"
        assert "CUST" not in str(result.response)
        return LLMResponse(
            text="Historical results are descriptive only.",
            function_calls=[],
            provider_content=None,
        )


def test_tool_use_loop_returns_grounded_final_text(tmp_path):
    settings = Settings(data_dir=tmp_path, demo_mode=True, min_cohort_size=2, gemini_api_key="fake")
    client = FakeClient()
    service = ChatService(settings, DataEngine(tmp_path, demo_mode=True), client)
    assert service.ask("Summarize historical outcomes") == "Historical results are descriptive only."
    assert client.calls == 2


def test_pydantic_schema_is_translated_for_gemini():
    schema = _gemini_schema(SpendingInput.model_json_schema())
    assert schema["type"] == "object"
    assert schema["properties"]["start_date"]["type"] == "string"
    assert "format" not in schema["properties"]["start_date"]
    assert "anyOf" not in schema["properties"]["category"]
