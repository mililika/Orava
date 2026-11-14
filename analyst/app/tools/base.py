from abc import ABC, abstractmethod
from typing import Any, ClassVar

from pydantic import BaseModel

from app.data.engine import DataEngine
from app.models import ToolResult


class AnalystTool(ABC):
    name: ClassVar[str]
    description: ClassVar[str]
    input_model: ClassVar[type[BaseModel]]

    @abstractmethod
    def execute(self, engine: DataEngine, arguments: BaseModel, min_cohort_size: int) -> ToolResult:
        raise NotImplementedError

    def api_schema(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "description": self.description,
            "input_schema": self.input_model.model_json_schema(),
        }
