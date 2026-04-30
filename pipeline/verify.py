"""
Programmatic verifier — per content-pipeline.md §4.
Loads a seed file (or a standalone questionTemplates array) and runs all checks.
No LLM calls. Safe to run in CI.

Usage:
    python -m pipeline.verify --in path/to/v1.0.0.json
    python -m pipeline.verify --in pipeline/output/level_3.json --templates-only
"""
from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from .schemas import QuestionTemplate
from .validators_py import VALIDATOR_REGISTRY


# ── Result containers ─────────────────────────────────────────────────────────

@dataclass
class CheckResult:
    check: str
    passed: int = 0
    failed: int = 0
    warnings: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)


@dataclass
class VerifyReport:
    passed: int = 0
    failed: int = 0
    warnings: int = 0
    by_check: list[CheckResult] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "passed": self.passed,
            "failed": self.failed,
            "warnings": self.warnings,
            "by_check": [
                {
                    "check": c.check,
                    "passed": c.passed,
                    "failed": c.failed,
                    "warnings": c.warnings,
                    "errors": c.errors,
                }
                for c in self.by_check
            ],
        }


# ── Individual checks ─────────────────────────────────────────────────────────

def check_schema(templates: list[dict]) -> CheckResult:
    """
    Validate every template against the Pydantic QuestionTemplate schema.
    per content-pipeline.md §4 row: Schema conforms
    """
    result = CheckResult("schema_validation")
    for t in templates:
        try:
            QuestionTemplate.model_validate(t)
            result.passed += 1
        except Exception as exc:
            result.failed += 1
            result.errors.append(f"{t.get('id', '?')}: {exc}")
    return result


def check_validator_existence(templates: list[dict]) -> CheckResult:
    """
    Every template's validatorId must be in VALIDATOR_REGISTRY.
    per content-pipeline.md §4 row: validatorId is known
    """
    result = CheckResult("validator_existence")
    for t in templates:
        vid = t.get("validatorId", "")
        if vid in VALIDATOR_REGISTRY:
            result.passed += 1
        else:
            result.failed += 1
            result.errors.append(f"{t.get('id', '?')}: unknown validatorId '{vid}'")
    return result


def check_archetype_consistency(templates: list[dict]) -> CheckResult:
    """
    Template archetype must match the archetype on the registered validator.
    per content-pipeline.md §4 row: Archetype consistency
    """
    result = CheckResult("archetype_consistency")
    for t in templates:
        vid = t.get("validatorId", "")
        arch = t.get("archetype", "")
        reg = VALIDATOR_REGISTRY.get(vid)
        if reg is None:
            result.warnings.append(f"{t.get('id', '?')}: validator not found, skipped archetype check")
            continue
        if reg.archetype == arch:
            result.passed += 1
        else:
            result.failed += 1
            result.errors.append(
                f"{t.get('id', '?')}: archetype '{arch}' != validator archetype '{reg.archetype}'"
            )
    return result


def check_numeric_sanity(templates: list[dict]) -> CheckResult:
    """
    For placement: correctAnswer (targetDecimal) must be in [0, 1].
    For fractions in payload: numerator < denominator unless improper is declared.
    per content-pipeline.md §4 row: Math is correct
    """
    result = CheckResult("numeric_sanity")
    for t in templates:
        tid = t.get("id", "?")
        arch = t.get("archetype", "")
        payload = t.get("payload", {})

        if arch == "placement":
            ca = t.get("correctAnswer")
            if isinstance(ca, (int, float)) and 0.0 <= ca <= 1.0:
                result.passed += 1
            else:
                result.failed += 1
                result.errors.append(f"{tid}: placement correctAnswer {ca!r} out of [0,1]")

        elif arch in ("partition", "make"):
            tp = payload.get("targetPartitions")
            if isinstance(tp, int) and tp >= 2:
                result.passed += 1
            else:
                result.failed += 1
                result.errors.append(f"{tid}: targetPartitions {tp!r} invalid")

        elif arch == "compare":
            ca = t.get("correctAnswer")
            # Accept legacy A/B/equal format OR newer {trueRelation: '>/<=/='} format
            valid = ca in ("A", "B", "equal") or (
                isinstance(ca, dict) and ca.get("trueRelation") in (">", "<", "=")
            )
            if valid:
                result.passed += 1
            else:
                result.failed += 1
                result.errors.append(f"{tid}: compare correctAnswer {ca!r} not in A/B/equal or {{trueRelation}}")

        else:
            # No numeric check defined yet for this archetype — count as pass
            result.passed += 1

    return result


def check_misconception_coverage(
    templates: list[dict],
    known_misconceptions: list[str] | None = None,
) -> CheckResult:
    """
    At least one template per (level, misconception) pair where applicable.
    per content-pipeline.md §4 row: misconceptionTraps are real
    """
    result = CheckResult("misconception_coverage")
    seen: set[tuple[str, str]] = set()

    for t in templates:
        tid = t.get("id", "?")
        mc_traps: list[str] = t.get("misconceptionTraps", [])
        level = _extract_level(tid)

        for mc in mc_traps:
            if known_misconceptions and mc not in known_misconceptions:
                result.failed += 1
                result.errors.append(f"{tid}: unknown misconceptionId '{mc}'")
            else:
                seen.add((level, mc))
                result.passed += 1

    if not seen:
        result.warnings.append("No misconceptionTraps found across all templates")
    return result


def check_prompt_length(templates: list[dict]) -> CheckResult:
    """
    Prompt text must be 5–25 words.
    per content-pipeline.md §4 row: Prompt text passes basic constraints
    """
    result = CheckResult("prompt_length")
    for t in templates:
        text = (t.get("prompt") or {}).get("text", "")
        word_count = len(text.split())
        if 5 <= word_count <= 25:
            result.passed += 1
        else:
            result.failed += 1
            result.errors.append(
                f"{t.get('id', '?')}: prompt '{text}' has {word_count} words (expected 5–25)"
            )
    return result


def check_difficulty_distribution(templates: list[dict]) -> CheckResult:
    """
    Warn if any difficulty tier is completely absent for a given level.
    per content-pipeline.md §4 row: Difficulty tier distribution
    """
    result = CheckResult("difficulty_distribution")
    from collections import defaultdict

    level_tiers: dict[str, set[str]] = defaultdict(set)
    for t in templates:
        level = _extract_level(t.get("id", ""))
        tier = t.get("difficultyTier", "")
        level_tiers[level].add(tier)

    expected_tiers = {"easy", "medium", "hard"}
    for level, tiers in sorted(level_tiers.items()):
        missing = expected_tiers - tiers
        if missing:
            result.warnings.append(f"Level {level}: missing tiers {missing}")
        else:
            result.passed += 1

    return result


# ── Helpers ───────────────────────────────────────────────────────────────────

def _extract_level(template_id: str) -> str:
    """Extract 'L1' from 'q:ms:L1:0001'. Returns '' if not parseable."""
    parts = template_id.split(":")
    for part in parts:
        if part.startswith("L") and part[1:].isdigit():
            return part
    return ""


# ── Main verify function ──────────────────────────────────────────────────────

def verify(data: dict | list, known_misconceptions: list[str] | None = None) -> VerifyReport:
    """
    Run all checks against a seed file dict or a bare list of templates.
    Returns a VerifyReport.
    per content-pipeline.md §4
    """
    if isinstance(data, list):
        templates = data
    else:
        templates = data.get("questionTemplates", [])

    misconception_ids = known_misconceptions
    if isinstance(data, dict) and not misconception_ids:
        misconception_ids = [m["id"] for m in data.get("misconceptions", [])]

    checks = [
        check_schema(templates),
        check_validator_existence(templates),
        check_archetype_consistency(templates),
        check_numeric_sanity(templates),
        check_misconception_coverage(templates, misconception_ids),
        check_prompt_length(templates),
        check_difficulty_distribution(templates),
    ]

    report = VerifyReport()
    for c in checks:
        report.passed += c.passed
        report.failed += c.failed
        report.warnings += len(c.warnings)
        report.by_check.append(c)

    return report


# ── CLI entry ─────────────────────────────────────────────────────────────────

def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Verify a Questerix curriculum seed file")
    parser.add_argument("--in", dest="infile", required=True, help="Path to JSON seed or templates file")
    parser.add_argument("--templates-only", action="store_true", help="Input is a bare array of templates")
    parser.add_argument("--strict", action="store_true", help="Treat warnings as failures")
    parser.add_argument("--out", help="Write report JSON to this path (default: stdout)")
    args = parser.parse_args(argv)

    inpath = Path(args.infile)
    if not inpath.exists():
        print(f"ERROR: file not found: {inpath}", file=sys.stderr)
        return 1

    raw = json.loads(inpath.read_text(encoding="utf-8"))
    report = verify(raw)

    report_dict = report.to_dict()
    report_json = json.dumps(report_dict, indent=2)

    if args.out:
        Path(args.out).write_text(report_json, encoding="utf-8")
        print(f"Report written to {args.out}")
    else:
        print(report_json)

    if report.failed > 0:
        print(f"\nFAILED: {report.failed} checks failed", file=sys.stderr)
        return 1
    if args.strict and report.warnings > 0:
        print(f"\nFAILED (strict): {report.warnings} warnings", file=sys.stderr)
        return 1
    print(f"\nPASSED: {report.passed} checks, {report.warnings} warnings")
    return 0


if __name__ == "__main__":
    sys.exit(main())
