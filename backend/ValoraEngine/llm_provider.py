from __future__ import annotations

import os
import time
from typing import Any, Optional

from google import genai


_GEMINI_CONFIGURED = False


class LLMProviderError(Exception):
    """Raised when an LLM provider request fails."""


def _configure_gemini() -> None:
    global _GEMINI_CONFIGURED

    if _GEMINI_CONFIGURED:
        return

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not set")

    genai.configure(api_key=api_key)
    _GEMINI_CONFIGURED = True


def _sleep_with_backoff(attempt: int, base_delay_seconds: float = 0.75) -> None:
    delay = base_delay_seconds * attempt
    time.sleep(delay)


def _normalize_usage(
    provider: str,
    raw_response: Any,
) -> dict[str, Optional[int]]:
    """
    Returns normalized token/accounting fields.

    Current shape:
    {
        "token_input_count": int | None,
        "token_output_count": int | None,
        "token_total_count": int | None
    }

    Gemini usage metadata availability can vary by SDK/model/version,
    so we parse defensively and allow nulls.
    """
    usage = {
        "token_input_count": None,
        "token_output_count": None,
        "token_total_count": None,
    }

    if provider != "gemini":
        return usage

    try:
        usage_metadata = getattr(raw_response, "usage_metadata", None)

        if usage_metadata is None:
            return usage

        prompt_token_count = getattr(usage_metadata, "prompt_token_count", None)
        candidates_token_count = getattr(usage_metadata, "candidates_token_count", None)
        total_token_count = getattr(usage_metadata, "total_token_count", None)

        usage["token_input_count"] = int(prompt_token_count) if prompt_token_count is not None else None
        usage["token_output_count"] = int(candidates_token_count) if candidates_token_count is not None else None
        usage["token_total_count"] = int(total_token_count) if total_token_count is not None else None

    except Exception:
        # Token accounting must never break response generation.
        return usage

    return usage


def _extract_gemini_text(response: Any) -> str:
    """
    Extract text defensively from Gemini response object.
    """
    text_value = getattr(response, "text", None)
    if text_value:
        return str(text_value).strip()

    try:
        candidates = getattr(response, "candidates", None) or []
        if not candidates:
            return ""

        first_candidate = candidates[0]
        content = getattr(first_candidate, "content", None)
        parts = getattr(content, "parts", None) or []

        collected: list[str] = []
        for part in parts:
            part_text = getattr(part, "text", None)
            if part_text:
                collected.append(str(part_text))

        return "\n".join(collected).strip()
    except Exception:
        return ""


def _generate_with_gemini(
    prompt: str,
    model_name: str,
    temperature: float,
) -> dict[str, Any]:
    _configure_gemini()

    model = genai.GenerativeModel(
        model_name=model_name,
        generation_config={
            "temperature": temperature,
        },
    )

    started = time.perf_counter()
    response = model.generate_content(prompt)
    latency_ms = int((time.perf_counter() - started) * 1000)

    text_value = _extract_gemini_text(response)
    if not text_value:
        raise LLMProviderError("Gemini response did not contain text output")

    usage = _normalize_usage(provider="gemini", raw_response=response)

    return {
        "text": text_value,
        "provider": "gemini",
        "model_name": model_name,
        "model_version": None,
        "latency_ms": latency_ms,
        "token_input_count": usage["token_input_count"],
        "token_output_count": usage["token_output_count"],
        "token_total_count": usage["token_total_count"],
        "raw": response,
    }


def _generate_with_openai(
    prompt: str,
    model_name: str,
    temperature: float,
) -> dict[str, Any]:
    raise NotImplementedError(
        "OpenAI provider hook is defined but not enabled yet for this deployment"
    )


def _generate_with_anthropic(
    prompt: str,
    model_name: str,
    temperature: float,
) -> dict[str, Any]:
    raise NotImplementedError(
        "Anthropic provider hook is defined but not enabled yet for this deployment"
    )


def generate_llm_text(
    prompt: str,
    provider: str = "gemini",
    model_name: str = "gemini-2.5-flash-lite",
    temperature: float = 0.2,
    max_retries: int = 2,
) -> dict[str, Any]:
    """
    Provider abstraction for text generation.

    Normalized return shape:
    {
        "text": str,
        "provider": str,
        "model_name": str,
        "model_version": str | None,
        "latency_ms": int | None,
        "token_input_count": int | None,
        "token_output_count": int | None,
        "token_total_count": int | None,
        "raw": Any
    }

    Supported now:
    - gemini

    Future-ready hooks:
    - openai
    - anthropic

    Recommended Gemini models you can pass:
    - gemini-2.5-flash-lite
    - gemini-2.5-flash
    - gemini-1.5-flash
    - gemini-1.5-pro
    """
    if not prompt or not prompt.strip():
        raise ValueError("Prompt must not be empty")

    provider = provider.strip().lower()
    model_name = model_name.strip()

    last_error: Exception | None = None

    for attempt in range(1, max_retries + 2):
        try:
            if provider == "gemini":
                return _generate_with_gemini(
                    prompt=prompt,
                    model_name=model_name,
                    temperature=temperature,
                )

            if provider == "openai":
                return _generate_with_openai(
                    prompt=prompt,
                    model_name=model_name,
                    temperature=temperature,
                )

            if provider == "anthropic":
                return _generate_with_anthropic(
                    prompt=prompt,
                    model_name=model_name,
                    temperature=temperature,
                )

            raise ValueError(f"Unsupported LLM provider: {provider}")

        except NotImplementedError:
            # Do not retry hooks that are intentionally not enabled yet.
            raise

        except Exception as e:
            last_error = e

            if attempt >= (max_retries + 1):
                break

            _sleep_with_backoff(attempt=attempt)

    raise LLMProviderError(
        f"LLM generation failed after {max_retries + 1} attempt(s): {str(last_error)}"
    )