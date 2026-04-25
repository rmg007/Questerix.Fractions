"""
Main generation entry point.
per content-pipeline.md §3, §6.3

Usage:
    python -m pipeline.generate --level 1 --archetype placement --out pipeline/output --model haiku
    python -m pipeline.generate --level 1 --out pipeline/output  # all archetypes for level
"""
from __future__ import annotations

import argparse
import json
import logging
import os
import sys
import time
from pathlib import Path
from typing import Any

from pydantic import ValidationError

# Auto-load pipeline/.env if present (no error if missing or dotenv not installed).
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent / ".env")
except ImportError:
    pass

from .level_archetypes import LEVEL_ARCHETYPES
from .llm import LLMClient, LLMModelNotFoundError, LLMRateLimitError, make_client
from .schemas import ARCHETYPES, QuestionTemplate
from .validators_py import VALIDATOR_REGISTRY

logger = logging.getLogger(__name__)

# Model tiers are sourced from the active LLM provider so each backend can
# advertise its own slug list. See pipeline/llm.py.

# Templates per (level, archetype) target. 10 archetypes × 9 levels ≈ 320 total.
# Adjust per level-spec authoring targets. per content-pipeline.md §1 (audit §2.5 fix)
TEMPLATES_PER_BATCH = 4  # default; overridden by --count


# ── Prompt loading ────────────────────────────────────────────────────────────

def _load_system_prompt() -> str:
    path = Path(__file__).parent / "prompts" / "system.md"
    return path.read_text(encoding="utf-8")


def _load_archetype_prompt(archetype: str) -> str:
    path = Path(__file__).parent / "prompts" / "per_archetype" / f"{archetype}.md"
    if path.exists():
        return path.read_text(encoding="utf-8")
    return f"# Archetype: {archetype}\n\nNo additional guidance defined yet."


# ── User message builder ──────────────────────────────────────────────────────

def _build_user_message(
    level: int,
    archetype: str,
    count: int,
    tier: str,
    fraction_pool: list[str],
    skill_ids: list[str],
    misconception_ids: list[str],
    archetype_guidance: str,
) -> str:
    return f"""
{archetype_guidance}

---

Generate exactly {count} QuestionTemplate records for:
- Level: {level}
- Archetype: {archetype}
- Difficulty tier: {tier}
- Fraction pool: {json.dumps(fraction_pool)}
- Available skill IDs: {json.dumps(skill_ids)}
- Available misconception IDs: {json.dumps(misconception_ids)}

ID sequence starts at 0001 for this batch.
Output only a JSON array. No prose.
""".strip()


# ── Generation with retries ───────────────────────────────────────────────────

def _try_generate(
    client: LLMClient,
    model: str,
    system_prompt: str,
    user_message: str,
    max_retries: int,  # per content-pipeline.md §3 audit §2.6 fix — max 3
) -> tuple[list[dict], dict]:
    """
    Call the configured LLM, parse JSON, validate schema.
    Returns (validated_templates, usage_info).
    Raises on unrecoverable failure after max_retries.
    per content-pipeline.md §3 (retry loop) and §12 (failure modes)
    """
    last_exc: Exception | None = None
    total_usage: dict = {"input_tokens": 0, "output_tokens": 0}

    for attempt in range(1, max_retries + 1):
        try:
            response = client.generate(
                model=model,
                system=system_prompt,
                user=user_message,
                max_tokens=4096,
            )
            total_usage["input_tokens"] += response.usage.input_tokens
            total_usage["output_tokens"] += response.usage.output_tokens

            raw_text = response.text

            # Strip markdown fences if present
            if raw_text.startswith("```"):
                raw_text = raw_text.split("```")[1]
                if raw_text.startswith("json"):
                    raw_text = raw_text[4:]

            records: list[dict] = json.loads(raw_text)
            if not isinstance(records, list):
                raise ValueError(f"Expected JSON array, got {type(records).__name__}")

            # Validate each record against Pydantic schema
            validated = []
            for rec in records:
                QuestionTemplate.model_validate(rec)  # raises ValidationError on fail
                validated.append(rec)

            return validated, total_usage

        except (json.JSONDecodeError, ValidationError, ValueError, KeyError) as exc:
            last_exc = exc
            logger.warning(
                "Attempt %d/%d failed for model %s: %s",
                attempt, max_retries, model, exc,
            )
            if attempt < max_retries:
                backoff = 2 ** (attempt - 1)
                logger.info("Backing off %ds before retry", backoff)
                time.sleep(backoff)

        except LLMRateLimitError:
            # Exponential backoff per content-pipeline.md §12 (provider-agnostic)
            backoffs = [5, 30, 120]
            wait = backoffs[min(attempt - 1, len(backoffs) - 1)]
            logger.warning("Rate limited. Waiting %ds (attempt %d/%d)", wait, attempt, max_retries)
            time.sleep(wait)

    raise RuntimeError(
        f"Generation failed after {max_retries} retries. Last error: {last_exc}"
    )


# ── Model fallback (audit §5 fix) ─────────────────────────────────────────────

def _resolve_model(tier: str, client: LLMClient) -> str:
    """
    Try models in tier order; return first that is available.
    Falls back within same tier only — never cross-tier.
    per content-pipeline.md §6.3 (audit §5 fix)
    """
    if tier == "haiku":
        candidates = client.haiku_models()
    elif tier == "sonnet":
        candidates = client.sonnet_models()
    else:
        candidates = []

    for slug in candidates:
        try:
            if client.is_available_model(slug):
                return slug
            logger.warning("Model %s not available on %s; trying next in tier",
                           slug, client.provider_name)
        except LLMModelNotFoundError:
            logger.warning("Model %s not found on %s; trying next in tier",
                           slug, client.provider_name)
        except Exception:
            # Other errors (auth, network) — don't silently skip, re-raise.
            raise
    raise RuntimeError(
        f"No available model found in tier '{tier}' on {client.provider_name}. "
        f"Candidates: {candidates}"
    )


# ── Per-level generation ──────────────────────────────────────────────────────

def generate_level(
    client: LLMClient,
    level: int,
    archetype: str | None,
    out_dir: Path,
    haiku_model: str,
    sonnet_model: str,
    count: int,
    max_retries: int,
    dry_run: bool,
    all_archetypes: bool = False,
) -> dict:
    """
    Generate templates for one level (one or all archetypes).
    Returns cost summary dict.
    per content-pipeline.md §7.1, §7.2
    """
    system_prompt = _load_system_prompt()
    if archetype:
        archetypes = [archetype]
    elif all_archetypes:
        archetypes = list(ARCHETYPES)
    else:
        archetypes = LEVEL_ARCHETYPES.get(level, list(ARCHETYPES))

    total_usage: dict = {"input_tokens": 0, "output_tokens": 0, "templates_generated": 0}
    all_templates: list[dict] = []

    for arch in archetypes:
        archetype_guidance = _load_archetype_prompt(arch)

        for tier in ["easy", "medium", "hard"]:
            # Placeholder pools — in a real run these come from level spec parser.
            fraction_pool = [f"frac:{n}/{d}" for n, d in _default_pool_for_level(level)]
            skill_ids = _default_skill_ids_for_level(level)
            misconception_ids = ["MC-WHB-01", "MC-EOL-01"]

            user_message = _build_user_message(
                level=level,
                archetype=arch,
                count=count,
                tier=tier,
                fraction_pool=fraction_pool,
                skill_ids=skill_ids,
                misconception_ids=misconception_ids,
                archetype_guidance=archetype_guidance,
            )

            logger.info("Generating: level=%d archetype=%s tier=%s", level, arch, tier)

            try:
                templates, usage = _try_generate(
                    client=client,
                    model=haiku_model,
                    system_prompt=system_prompt,
                    user_message=user_message,
                    max_retries=max_retries,
                )
                all_templates.extend(templates)
                total_usage["input_tokens"] += usage["input_tokens"]
                total_usage["output_tokens"] += usage["output_tokens"]
                total_usage["templates_generated"] += len(templates)
                logger.info(
                    "  Generated %d templates (tokens: in=%d out=%d)",
                    len(templates),
                    usage["input_tokens"],
                    usage["output_tokens"],
                )
            except RuntimeError as exc:
                logger.error("SKIPPED (manual_review=true): %s", exc)
                # Flag for manual review per content-pipeline.md §4
                all_templates.append(
                    {
                        "id": f"q:{arch}:L{level}:MANUAL",
                        "archetype": arch,
                        "difficultyTier": tier,
                        "manual_review": True,
                        "error": str(exc),
                    }
                )

    if dry_run:
        print(json.dumps(all_templates, indent=2))
    else:
        level_dir = out_dir / f"level_{level:02d}"
        level_dir.mkdir(parents=True, exist_ok=True)
        out_file = level_dir / (f"{archetype}.json" if archetype else "all.json")
        out_file.write_text(json.dumps(all_templates, indent=2), encoding="utf-8")
        logger.info("Written to %s", out_file)

    return total_usage


def _default_pool_for_level(level: int) -> list[tuple[int, int]]:
    """
    Stub fraction pool by level.
    Real implementation reads level-NN.md via level_parser.
    per content-pipeline.md §2.1
    """
    pools: dict[int, list[tuple[int, int]]] = {
        # L1 = halves only; distractors include thirds/fourths so identify items have
        # plausible wrong options. Zero-numerators excluded (not pedagogically useful at K).
        1: [(1, 2), (1, 3), (1, 4), (2, 3), (3, 4)],
        2: [(0, 4), (1, 4), (2, 4), (3, 4), (4, 4)],
        3: [(0, 3), (1, 3), (2, 3), (3, 3)],
        4: [(1, 2), (1, 4), (2, 4), (3, 4)],
        5: [(1, 8), (2, 8), (3, 8), (4, 8), (5, 8), (6, 8), (7, 8)],
        6: [(1, 3), (2, 3), (1, 6), (2, 6), (3, 6), (4, 6), (5, 6)],
        7: [(1, 4), (1, 3), (1, 2), (2, 3), (3, 4)],
        8: [(1, 8), (1, 4), (1, 3), (1, 2), (2, 3), (3, 4), (7, 8)],
        9: [(1, 8), (1, 6), (1, 4), (1, 3), (3, 8), (1, 2), (2, 3), (3, 4), (5, 6), (7, 8)],
    }
    return pools.get(level, [(1, 2)])


def _default_skill_ids_for_level(level: int) -> list[str]:
    """
    Stub skill mapping by level — sourced from docs/10-curriculum/skills.md.
    Real implementation parses skills.md at build time.
    """
    mapping: dict[int, list[str]] = {
        1: ["SK-01", "SK-02", "SK-03"],
        2: ["SK-04", "SK-05", "SK-06"],
        3: ["SK-07", "SK-08", "SK-09", "SK-10"],
        4: ["SK-11", "SK-12", "SK-13"],
        5: ["SK-14", "SK-15", "SK-16", "SK-17"],
        6: ["SK-18", "SK-19", "SK-20", "SK-21"],
        7: ["SK-22", "SK-23", "SK-24"],
        8: ["SK-25", "SK-26", "SK-27", "SK-28"],
        9: ["SK-29", "SK-30", "SK-31", "SK-32", "SK-33"],
    }
    return mapping.get(level, [f"SK-{str(level).zfill(2)}"])


# ── CLI ───────────────────────────────────────────────────────────────────────

def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Generate QuestionTemplates via Claude API")
    parser.add_argument("--level", type=int, choices=range(1, 10), metavar="N",
                        help="Level to generate (1-9). Omit for all.")
    parser.add_argument("--archetype", choices=list(ARCHETYPES),
                        help="Archetype to generate. Omit for all 10.")
    parser.add_argument("--out", default="pipeline/output",
                        help="Output directory (default: pipeline/output)")
    parser.add_argument("--model", choices=["haiku", "sonnet"], default="haiku",
                        help="Primary model tier (default: haiku)")
    parser.add_argument("--count", type=int, default=TEMPLATES_PER_BATCH,
                        help=f"Templates per (archetype, tier) batch (default: {TEMPLATES_PER_BATCH})")
    parser.add_argument("--max-retries", type=int, default=3,
                        help="Max retries per batch on validation failure (default: 3, per audit §2.6 fix)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Print to stdout, don't write files")
    parser.add_argument("--all-archetypes", action="store_true", default=False,
                        help="Override per-level scope and run all 10 archetypes")
    args = parser.parse_args(argv)

    try:
        client = make_client()
    except RuntimeError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1

    # Resolve model slugs with fallback (audit §5 fix)
    haiku_model = _resolve_model("haiku", client)
    sonnet_model = _resolve_model("sonnet", client)
    logger.info("Provider=%s haiku=%s sonnet=%s", client.provider_name, haiku_model, sonnet_model)

    levels = [args.level] if args.level else list(range(1, 10))
    out_dir = Path(args.out)

    grand_total: dict = {"input_tokens": 0, "output_tokens": 0, "templates_generated": 0}
    for level in levels:
        usage = generate_level(
            client=client,
            level=level,
            archetype=args.archetype,
            out_dir=out_dir,
            haiku_model=haiku_model,
            sonnet_model=sonnet_model,
            count=args.count,
            max_retries=args.max_retries,
            dry_run=args.dry_run,
            all_archetypes=args.all_archetypes,
        )
        for k in grand_total:
            grand_total[k] += usage[k]

    print("\n=== Generation complete ===")
    print(f"Provider            : {client.provider_name}")
    print(f"Templates generated : {grand_total['templates_generated']}")
    print(f"Input tokens        : {grand_total['input_tokens']:,}")
    print(f"Output tokens       : {grand_total['output_tokens']:,}")
    # Rough cost estimate (audit §2.5 fix — per content-pipeline.md §6.4).
    # Prices vary by provider; the Haiku table below is illustrative.
    if client.provider_name == "anthropic":
        cost = (grand_total["input_tokens"] * 0.00025 + grand_total["output_tokens"] * 0.00125) / 1000
        print(f"Estimated cost (Haiku): ${cost:.2f}")
    elif client.provider_name == "cloudflare":
        # Workers AI pricing: ~$0.011 per 1M neurons; Llama 70B ≈ 1 neuron/token rough.
        # See https://developers.cloudflare.com/workers-ai/platform/pricing/
        total_tokens = grand_total["input_tokens"] + grand_total["output_tokens"]
        cost_estimate = total_tokens * 0.011 / 1_000_000
        print(f"Estimated cost (Workers AI, illustrative): ${cost_estimate:.2f}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
