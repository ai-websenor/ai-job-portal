"""Compatibility imports for the old SageMaker module path."""

from app.parser.llm import (  # noqa: F401
    invoke_llm,
    invoke_mistral,
    invoke_mistral_raw,
    invoke_mistral_whole,
)
