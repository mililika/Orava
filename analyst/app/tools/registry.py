from app.tools.base import AnalystTool


class ToolRegistry:
    def __init__(self) -> None:
        self._tools: dict[str, AnalystTool] = {}

    def register(self, tool: AnalystTool) -> AnalystTool:
        if tool.name in self._tools:
            raise ValueError(f"Duplicate tool: {tool.name}")
        self._tools[tool.name] = tool
        return tool

    def get(self, name: str) -> AnalystTool | None:
        return self._tools.get(name)

    def schemas(self) -> list[dict]:
        return [tool.api_schema() for tool in self._tools.values()]

    def all(self) -> list[AnalystTool]:
        return list(self._tools.values())


registry = ToolRegistry()
