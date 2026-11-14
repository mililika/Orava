"""Discover tool modules and import them for their self-registration side effect."""

from importlib import import_module
from pkgutil import iter_modules

from app.tools import __path__

_INFRASTRUCTURE = {"base", "registry", "load_tools"}
for _module in iter_modules(__path__):
    if _module.name not in _INFRASTRUCTURE:
        import_module(f"app.tools.{_module.name}")
