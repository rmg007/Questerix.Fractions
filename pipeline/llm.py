"""
LLM provider abstraction.
per content-pipeline.md §6.3, §11

Supports two backends, selected via LLM_PROVIDER env var:
  - "anthropic" (default) — Anthropic API via official SDK.
  - "cloudflare"          — Cloudflare Workers AI via REST.

Both implement the same `LLMClient` Protocol so generate.py is provider-agnostic.

Build-time only. Does not violate C1 (no runtime backend) — nothing in dist/
calls these. The Anthropic / Cloudflare keys are developer-only secrets.
"""
from __future__ import annotations

import logging
import os
import time
from dataclasses import dataclass
from typing import Protocol

logger = logging.getLogger(__name__)

# ── Public types ──────────────────────────────────────────────────────────────


@dataclass
class LLMUsage:
    """Token-count payload normalized across providers."""
    input_tokens: int
    output_tokens: int


@dataclass
class LLMResponse:
    text: str
    usage: LLMUsage
    model_used: str


class LLMRateLimitError(Exception):
    """Raised by any provider on a rate-limit / 429."""


class LLMModelNotFoundError(Exception):
    """Raised when a requested model slug is not available."""


class LLMClient(Protocol):
    """Provider-agnostic interface used by generate.py."""

    provider_name: str

    def generate(
        self,
        *,
        model: str,
        system: str,
        user: str,
        max_tokens: int = 4096,
    ) -> LLMResponse: ...

    def is_available_model(self, slug: str) -> bool: ...

    def haiku_models(self) -> list[str]: ...

    def sonnet_models(self) -> list[str]: ...


# ── Anthropic provider ────────────────────────────────────────────────────────

# Ordered newest→oldest within tier so fallback walks down predictably.
ANTHROPIC_HAIKU_MODELS = [
    "claude-haiku-4-5-20251001",
    "claude-haiku-4-5",
    "claude-haiku-3-5",
]
ANTHROPIC_SONNET_MODELS = [
    "claude-sonnet-4-6",
    "claude-sonnet-4-5",
]


class AnthropicClient:
    provider_name = "anthropic"

    def __init__(self, api_key: str):
        import anthropic  # lazy: don't require the SDK if user picks cloudflare
        self._anthropic = anthropic
        self._client = anthropic.Anthropic(api_key=api_key)

    def generate(self, *, model: str, system: str, user: str, max_tokens: int = 4096) -> LLMResponse:
        try:
            response = self._client.messages.create(
                model=model,
                max_tokens=max_tokens,
                system=system,
                messages=[{"role": "user", "content": user}],
            )
        except self._anthropic.RateLimitError as exc:
            raise LLMRateLimitError(str(exc)) from exc

        text = response.content[0].text.strip()
        usage = LLMUsage(
            input_tokens=response.usage.input_tokens,
            output_tokens=response.usage.output_tokens,
        )
        return LLMResponse(text=text, usage=usage, model_used=model)

    def is_available_model(self, slug: str) -> bool:
        try:
            self._client.models.retrieve(slug)
            return True
        except self._anthropic.NotFoundError:
            return False

    def haiku_models(self) -> list[str]:
        return list(ANTHROPIC_HAIKU_MODELS)

    def sonnet_models(self) -> list[str]:
        return list(ANTHROPIC_SONNET_MODELS)


# ── Cloudflare Workers AI provider ────────────────────────────────────────────

# Ordered newest→oldest within tier. "haiku" = fast/cheap tier on Cloudflare;
# "sonnet" = higher-quality tier. Slugs subject to Cloudflare's deprecation
# schedule; rotate via CLOUDFLARE_MODEL env var if needed.
CLOUDFLARE_HAIKU_MODELS = [
    # Llama 3.3 70B fast variant — solid throughput, good instruction following.
    "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    "@cf/meta/llama-3.1-70b-instruct",
    "@cf/meta/llama-3.1-8b-instruct",
]
CLOUDFLARE_SONNET_MODELS = [
    # Larger / higher-quality models for synthesis batches.
    "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    "@cf/qwen/qwen2.5-coder-32b-instruct",
]


class CloudflareWorkersAIClient:
    provider_name = "cloudflare"

    def __init__(
        self,
        api_token: str,
        account_id: str,
        gateway: str | None = None,
        default_model: str | None = None,
    ):
        import requests  # lazy import
        self._requests = requests
        self._token = api_token
        self._account_id = account_id
        self._gateway = gateway
        self._default_model = default_model

    def _endpoint(self, model: str) -> str:
        # AI Gateway path (if set) wraps the call for caching/observability.
        # per https://developers.cloudflare.com/ai-gateway/providers/workersai/
        if self._gateway:
            return (
                f"https://gateway.ai.cloudflare.com/v1/{self._account_id}/"
                f"{self._gateway}/workers-ai/{model}"
            )
        return f"https://api.cloudflare.com/client/v4/accounts/{self._account_id}/ai/run/{model}"

    def generate(self, *, model: str, system: str, user: str, max_tokens: int = 4096) -> LLMResponse:
        url = self._endpoint(model)
        headers = {
            "Authorization": f"Bearer {self._token}",
            "Content-Type": "application/json",
        }
        body = {
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "max_tokens": max_tokens,
        }
        # Retry on rate-limit AND connection errors (concurrent runs sometimes
        # trigger ConnectionResetError 10054 from the edge).
        last_exc: Exception | None = None
        for attempt in range(5):
            try:
                response = self._requests.post(url, headers=headers, json=body, timeout=120)
            except (self._requests.exceptions.ConnectionError,
                    self._requests.exceptions.ReadTimeout) as exc:
                last_exc = exc
                wait = min(60, 3 * (2 ** attempt))  # 3, 6, 12, 24, 48s
                logger.warning("Connection error to Cloudflare (%s); retry %d/5 in %ds",
                               exc.__class__.__name__, attempt + 1, wait)
                time.sleep(wait)
                continue
            if response.status_code == 429:
                wait = 5 * (attempt + 1)
                logger.warning("Cloudflare rate-limited; sleeping %ds", wait)
                time.sleep(wait)
                continue
            if response.status_code == 404:
                raise LLMModelNotFoundError(f"Model {model} not found on Cloudflare Workers AI")
            if response.status_code in (502, 503, 504):
                wait = min(60, 3 * (2 ** attempt))
                logger.warning("Cloudflare upstream %d; retry %d/5 in %ds",
                               response.status_code, attempt + 1, wait)
                time.sleep(wait)
                continue
            response.raise_for_status()
            data = response.json()
            break
        else:
            if last_exc is not None:
                raise LLMRateLimitError(
                    f"Cloudflare retries exhausted (last: {last_exc.__class__.__name__})"
                ) from last_exc
            raise LLMRateLimitError("Cloudflare retries exhausted")

        # Cloudflare Workers AI envelope: { result: { response, usage }, success, errors, messages }
        if not data.get("success", True):
            raise RuntimeError(f"Cloudflare Workers AI error: {data.get('errors')}")
        result = data.get("result", data)
        text = (result.get("response") or "").strip()

        usage_payload = result.get("usage") or {}
        usage = LLMUsage(
            input_tokens=int(usage_payload.get("prompt_tokens", 0)),
            output_tokens=int(usage_payload.get("completion_tokens", 0)),
        )
        return LLMResponse(text=text, usage=usage, model_used=model)

    def is_available_model(self, slug: str) -> bool:
        # No cheap pre-flight on Cloudflare; we trust the configured slug list.
        # The actual generate call surfaces 404 via LLMModelNotFoundError.
        return slug.startswith("@cf/")

    def haiku_models(self) -> list[str]:
        if self._default_model:
            return [self._default_model] + [m for m in CLOUDFLARE_HAIKU_MODELS if m != self._default_model]
        return list(CLOUDFLARE_HAIKU_MODELS)

    def sonnet_models(self) -> list[str]:
        return list(CLOUDFLARE_SONNET_MODELS)


# ── Factory ───────────────────────────────────────────────────────────────────


def make_client() -> LLMClient:
    """Build the configured LLM client based on env vars. Read once at startup."""
    provider = os.environ.get("LLM_PROVIDER", "anthropic").lower().strip()

    if provider == "anthropic":
        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            raise RuntimeError(
                "LLM_PROVIDER=anthropic but ANTHROPIC_API_KEY is not set. "
                "See pipeline/.env.example."
            )
        logger.info("LLM provider: anthropic")
        return AnthropicClient(api_key=api_key)

    if provider == "cloudflare":
        token = os.environ.get("CLOUDFLARE_API_TOKEN")
        account = os.environ.get("CLOUDFLARE_ACCOUNT_ID")
        gateway = os.environ.get("CLOUDFLARE_AI_GATEWAY") or None
        default_model = os.environ.get("CLOUDFLARE_MODEL") or None
        if not token or not account:
            raise RuntimeError(
                "LLM_PROVIDER=cloudflare but CLOUDFLARE_API_TOKEN and/or "
                "CLOUDFLARE_ACCOUNT_ID is not set. See pipeline/.env.example."
            )
        logger.info(
            "LLM provider: cloudflare (account=%s gateway=%s default_model=%s)",
            account[:8] + "…", gateway or "<none>", default_model or "<auto>",
        )
        return CloudflareWorkersAIClient(
            api_token=token,
            account_id=account,
            gateway=gateway,
            default_model=default_model,
        )

    raise RuntimeError(
        f"Unknown LLM_PROVIDER={provider!r}. Valid: 'anthropic' | 'cloudflare'."
    )
