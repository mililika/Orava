import json

from pydantic import ValidationError

from app.config import Settings
from app.data.engine import DataEngine
from app.llm.client import (
    SYSTEM_PROMPT,
    ConversationTurn,
    FunctionResult,
    LLMClient,
)
from app.privacy.minimize import safe_tool_payload
from app.tools import load_tools  # noqa: F401
from app.tools.registry import ToolRegistry, registry


class ChatService:
    def __init__(
        self,
        settings: Settings,
        engine: DataEngine,
        client: LLMClient,
        tools: ToolRegistry = registry,
    ):
        self.settings = settings
        self.engine = engine
        self.client = client
        self.tools = tools

    def ask(self, question: str) -> str:
        conversation = [ConversationTurn(role="user", text=question)]
        try:
            for _ in range(self.settings.max_tool_iterations):
                response = self.client.generate_content(
                    tools=self.tools.schemas(),
                    conversation=conversation,
                    system_instruction=SYSTEM_PROMPT,
                    max_output_tokens=self.settings.max_output_tokens,
                )
                if not response.function_calls:
                    return response.text.strip() or "I couldn't produce a grounded answer."
                if response.provider_content is None:
                    return "The model returned an invalid function call response. Please retry."

                conversation.append(
                    ConversationTurn(role="model", provider_content=response.provider_content)
                )
                function_results = []
                for call in response.function_calls:
                    tool = self.tools.get(call.name)
                    if tool is None:
                        result, is_error = {"message": "Unknown tool."}, True
                    else:
                        try:
                            arguments = tool.input_model.model_validate(call.arguments)
                            tool_result = tool.execute(
                                self.engine,
                                arguments,
                                self.settings.min_cohort_size,
                            )
                            is_error = tool_result.status in {"error", "validation_error"}
                            result = tool_result.model_dump()
                        except ValidationError:
                            result, is_error = {
                                "status": "validation_error",
                                "message": "Arguments did not validate. Ask the user for missing or corrected values.",
                            }, True
                        except Exception:
                            result, is_error = {
                                "status": "error",
                                "message": "The local query could not be completed.",
                            }, True

                    safe_result = json.loads(safe_tool_payload(result))
                    function_results.append(
                        FunctionResult(
                            name=call.name,
                            response={"result": safe_result, "is_error": is_error},
                        )
                    )
                conversation.append(
                    ConversationTurn(role="tool", function_results=function_results)
                )
            return "I couldn't complete the data lookup within the tool-call limit. Please narrow the question."
        except Exception:
            return "The analysis service is temporarily unavailable. Check the GCP API key, connection, and request limits, then try again."
