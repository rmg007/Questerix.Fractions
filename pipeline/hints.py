"""
Hint generation module for Questerix Fractions curriculum.
Generates 3-tier hint cascades for question templates.
"""
from __future__ import annotations

import json
import logging
import time
from datetime import datetime
from pathlib import Path
from typing import Any

from pydantic import ValidationError

# Auto-load pipeline/.env if present (no error if missing or dotenv not installed).
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent / ".env")
except ImportError:
    pass

from .llm import LLMClient, LLMRateLimitError
from .schemas import HintTemplate

logger = logging.getLogger(__name__)


def load_hint_prompt() -> str:
    """Load hint generation system prompt."""
    path = Path(__file__).parent / "prompts" / "hint-generation.md"
    if not path.exists():
        raise RuntimeError(f"Hint prompt not found: {path}")
    return path.read_text(encoding="utf-8")


def resolve_model(tier: str, client: LLMClient) -> str:
    """Resolve a model tier ('haiku', 'sonnet') to an actual model slug on the configured provider."""
    if tier == "haiku":
        candidates = client.haiku_models()
    elif tier == "sonnet":
        candidates = client.sonnet_models()
    else:
        raise ValueError(f"Unknown tier: {tier}")

    for slug in candidates:
        try:
            if client.is_available_model(slug):
                logger.info("Using model: %s (tier=%s)", slug, tier)
                return slug
        except Exception:
            logger.warning("Model %s not available; trying next in tier", slug)

    raise RuntimeError(f"No available model found for tier '{tier}'. Candidates: {candidates}")


def count_words(text: str) -> int:
    """Count words in text (space-separated)."""
    return len(text.split())


def validate_hint(hint: dict, template: dict) -> tuple[bool, str]:
    """
    Validate a single hint record.
    Returns (is_valid, error_message).
    """
    required = ["id", "questionTemplateId", "type", "order", "content", "pointCost"]
    for field in required:
        if field not in hint:
            return False, f"Missing required field: {field}"

    hint_id = hint["id"]
    if not hint_id.startswith("h:"):
        return False, f"Invalid hint ID format (must start with 'h:'): {hint_id}"

    if hint["questionTemplateId"] != template["id"]:
        return False, f"questionTemplateId mismatch"

    if hint["type"] not in ["verbal", "visual_overlay", "worked_example"]:
        return False, f"Invalid type: {hint['type']}"

    if hint["order"] not in [1, 2, 3]:
        return False, f"Invalid order: {hint['order']}"

    content = hint.get("content", {})
    if not isinstance(content, dict):
        return False, "content must be a dict"

    hint_text = content.get("text", "")
    if not hint_text:
        return False, "Hint text is empty"

    word_count = count_words(hint_text)
    if word_count > 15:
        return False, f"Hint text exceeds 15 words ({word_count})"

    prompt_text = template.get("prompt", {}).get("text", "")
    if hint_text.lower().strip() == prompt_text.lower().strip():
        return False, "Hint is identical to prompt"

    if not isinstance(hint.get("pointCost"), (int, float)):
        return False, "pointCost must be numeric"

    return True, ""


def validate_hint_cascade(hints_for_template: list[dict], template: dict) -> tuple[bool, list[str]]:
    """
    Validate a full 3-hint cascade for one template.
    Returns (is_valid, error_messages).
    """
    errors = []

    if len(hints_for_template) != 3:
        errors.append(f"Expected 3 hints, got {len(hints_for_template)}")
        return False, errors

    sorted_hints = sorted(hints_for_template, key=lambda h: h.get("order", 0))

    for hint in sorted_hints:
        valid, error = validate_hint(hint, template)
        if not valid:
            errors.append(error)

    texts = [h.get("content", {}).get("text", "") for h in sorted_hints]
    if len(texts) != len(set(texts)):
        errors.append("Duplicate hint texts in cascade")

    return len(errors) == 0, errors


def load_curriculum_templates() -> dict[str, Any]:
    """Load all templates from public/curriculum/v1.json."""
    path = Path("public/curriculum/v1.json")
    if not path.exists():
        raise RuntimeError(f"Curriculum file not found: {path}")

    with open(path, encoding="utf-8") as f:
        data = json.load(f)

    templates: dict[str, dict] = {}
    levels = data.get("levels", {})
    for level_str, questions in levels.items():
        for question in questions:
            templates[question["id"]] = question

    logger.info("Loaded %d templates from curriculum", len(templates))
    return templates


def build_hints_user_message(templates: list[dict]) -> str:
    """Build user message for hint generation batch."""
    return f"""
Generate exactly {len(templates)} × 3 = {len(templates) * 3} HintTemplate records.

Input templates (JSON array):
{json.dumps(templates, indent=2)}

For each template, emit exactly 3 hints (order 1, 2, 3).

Output only a JSON array. No prose.
""".strip()


def try_generate_hints(
    client: LLMClient,
    model: str,
    system_prompt: str,
    templates: list[dict],
    max_retries: int,
) -> tuple[list[dict], dict]:
    """
    Generate hints for a batch of templates.
    Returns (validated_hints, usage_info).
    """
    last_exc: Exception | None = None
    total_usage: dict = {"input_tokens": 0, "output_tokens": 0}

    user_message = build_hints_user_message(templates)

    for attempt in range(1, max_retries + 1):
        try:
            response = client.generate(
                model=model,
                system=system_prompt,
                user=user_message,
                max_tokens=8192,
            )
            total_usage["input_tokens"] += response.usage.input_tokens
            total_usage["output_tokens"] += response.usage.output_tokens

            raw_text = response.text

            if raw_text.startswith("```"):
                raw_text = raw_text.split("```")[1]
                if raw_text.startswith("json"):
                    raw_text = raw_text[4:]

            hints: list[dict] = json.loads(raw_text)
            if not isinstance(hints, list):
                raise ValueError(f"Expected JSON array, got {type(hints).__name__}")

            validated = []
            for hint in hints:
                HintTemplate.model_validate(hint)
                validated.append(hint)

            return validated, total_usage

        except (json.JSONDecodeError, ValidationError, ValueError, KeyError) as exc:
            last_exc = exc
            logger.warning("Attempt %d/%d failed: %s", attempt, max_retries, exc)
            if attempt < max_retries:
                backoff = 2 ** (attempt - 1)
                logger.info("Backing off %ds before retry", backoff)
                time.sleep(backoff)

        except LLMRateLimitError:
            backoffs = [5, 30, 120]
            wait = backoffs[min(attempt - 1, len(backoffs) - 1)]
            logger.warning("Rate limited. Waiting %ds (attempt %d/%d)", wait, attempt, max_retries)
            time.sleep(wait)

    raise RuntimeError(
        f"Hint generation failed after {max_retries} retries. Last error: {last_exc}"
    )


def generate_hints_batch(
    client: LLMClient,
    out_dir: Path,
    model: str,
    batch_size: int,
    max_retries: int,
    dry_run: bool,
) -> dict:
    """
    Generate hints for all templates in the curriculum.
    Returns cost summary dict.
    """
    system_prompt = load_hint_prompt()
    templates = load_curriculum_templates()
    templates_list = list(templates.values())

    total_usage: dict = {"input_tokens": 0, "output_tokens": 0, "hints_generated": 0}
    all_hints: list[dict] = []
    validation_results: dict = {
        "passed": 0,
        "failed": 0,
        "errors": [],
    }

    stats_by_archetype: dict[str, dict] = {}

    num_batches = (len(templates_list) + batch_size - 1) // batch_size
    logger.info("Generating hints for %d templates in %d batches of ~%d",
                len(templates_list), num_batches, batch_size)

    for batch_idx in range(num_batches):
        start_idx = batch_idx * batch_size
        end_idx = min(start_idx + batch_size, len(templates_list))
        batch = templates_list[start_idx:end_idx]

        logger.info("Batch %d/%d: generating hints for %d templates (%d-%d)",
                    batch_idx + 1, num_batches, len(batch), start_idx + 1, end_idx)

        try:
            hints, usage = try_generate_hints(
                client=client,
                model=model,
                system_prompt=system_prompt,
                templates=batch,
                max_retries=max_retries,
            )
            total_usage["input_tokens"] += usage["input_tokens"]
            total_usage["output_tokens"] += usage["output_tokens"]

            hints_by_template: dict[str, list] = {}
            for hint in hints:
                tid = hint["questionTemplateId"]
                if tid not in hints_by_template:
                    hints_by_template[tid] = []
                hints_by_template[tid].append(hint)

            for template in batch:
                tid = template["id"]
                cascade = hints_by_template.get(tid, [])
                archetype = template.get("archetype", "unknown")

                if archetype not in stats_by_archetype:
                    stats_by_archetype[archetype] = {
                        "total": 0,
                        "passed": 0,
                        "failed": 0,
                    }
                stats_by_archetype[archetype]["total"] += 1

                valid, errors = validate_hint_cascade(cascade, template)
                if valid:
                    validation_results["passed"] += 1
                    stats_by_archetype[archetype]["passed"] += 1
                    all_hints.extend(cascade)
                    total_usage["hints_generated"] += 3
                else:
                    validation_results["failed"] += 1
                    stats_by_archetype[archetype]["failed"] += 1
                    logger.error("Validation failed for %s: %s", tid, "; ".join(errors))
                    validation_results["errors"].extend([
                        {"template_id": tid, "error": err} for err in errors
                    ])

            logger.info("  Generated %d hints (tokens: in=%d out=%d)",
                        len(hints), usage["input_tokens"], usage["output_tokens"])

        except RuntimeError as exc:
            logger.error("Batch %d failed: %s", batch_idx + 1, exc)

    if dry_run:
        print(json.dumps(all_hints, indent=2))
    else:
        out_dir.mkdir(parents=True, exist_ok=True)
        out_file = out_dir / "hints.json"
        out_file.write_text(json.dumps(all_hints, indent=2), encoding="utf-8")
        logger.info("Written %d hints to %s", len(all_hints), out_file)

        report_file = out_dir / "hint_generation_report.json"
        report = {
            "generated_at": datetime.utcnow().isoformat() + "Z",
            "total_templates": len(templates_list),
            "total_hints_generated": total_usage["hints_generated"],
            "validation": validation_results,
            "stats_by_archetype": stats_by_archetype,
            "usage": {
                "input_tokens": total_usage["input_tokens"],
                "output_tokens": total_usage["output_tokens"],
            },
        }
        report_file.write_text(json.dumps(report, indent=2), encoding="utf-8")
        logger.info("Written report to %s", report_file)

    return total_usage


def main(argv: list[str] | None = None) -> int:
    """CLI entry point for hint generation."""
    import argparse
    from .llm import make_client

    parser = argparse.ArgumentParser(
        description="Generate hints for curriculum templates via Claude API"
    )
    parser.add_argument(
        "--all", action="store_true",
        help="Generate hints for all templates"
    )
    parser.add_argument(
        "--out", default="pipeline/output",
        help="Output directory (default: pipeline/output)"
    )
    parser.add_argument(
        "--model", choices=["haiku", "sonnet"], default="haiku",
        help="Model tier to use (default: haiku)"
    )
    parser.add_argument(
        "--batch-size", type=int, default=20,
        help="Templates per batch (default: 20)"
    )
    parser.add_argument(
        "--max-retries", type=int, default=3,
        help="Max retries per batch (default: 3)"
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Print to stdout, don't write files"
    )

    args = parser.parse_args(argv)

    if not args.all:
        parser.print_help()
        return 1

    logging.basicConfig(
        level=logging.INFO,
        format="[%(levelname)s] %(message)s",
    )

    try:
        client = make_client()
        # Resolve model tier to actual model slug
        model_slug = resolve_model(args.model, client)
        logger.info("Provider=%s model_tier=%s resolved_model=%s",
                    client.provider_name, args.model, model_slug)

        out_dir = Path(args.out)
        result = generate_hints_batch(
            client=client,
            out_dir=out_dir,
            model=model_slug,
            batch_size=args.batch_size,
            max_retries=args.max_retries,
            dry_run=args.dry_run,
        )
        logger.info("Hint generation complete: %d hints", result.get("hints_generated", 0))
        return 0

    except Exception as exc:
        logger.error("Failed: %s", exc)
        return 1


if __name__ == "__main__":
    import sys
    sys.exit(main())
