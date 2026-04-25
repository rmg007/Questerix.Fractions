"""
CLI wrapper for the Questerix content pipeline.
per content-pipeline.md §7

Subcommands:
    generate  — call Claude API to author templates
    verify    — programmatic checks, no LLM
    parity    — run Python↔TS validator parity checks
"""
from __future__ import annotations

import argparse
import sys


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="pipeline",
        description="Questerix Fractions content authoring pipeline",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    # ── generate ──────────────────────────────────────────────────────────────
    gen_parser = subparsers.add_parser(
        "generate",
        help="Generate QuestionTemplates via Claude API (per content-pipeline.md §7.1/§7.2)",
    )
    gen_parser.add_argument(
        "--level", type=int, choices=range(1, 10), metavar="N",
        help="Level to generate (1–9). Omit for all levels.",
    )
    gen_parser.add_argument(
        "--archetype",
        choices=[
            "partition", "identify", "label", "make", "compare",
            "benchmark", "order", "snap_match", "equal_or_not", "placement",
        ],
        help="Archetype to generate. Omit for all 10.",
    )
    gen_parser.add_argument(
        "--out", default="pipeline/output",
        help="Output directory (default: pipeline/output)",
    )
    gen_parser.add_argument(
        "--model", choices=["haiku", "sonnet"], default="haiku",
        help="Primary model tier (default: haiku per content-pipeline.md §6.3)",
    )
    gen_parser.add_argument(
        "--count", type=int, default=4,
        help="Templates per (archetype, tier) batch (default: 4)",
    )
    gen_parser.add_argument(
        "--max-retries", type=int, default=3,
        help="Max retries on validation failure (default: 3, per audit §2.6 fix)",
    )
    gen_parser.add_argument(
        "--dry-run", action="store_true",
        help="Print to stdout, don't write files (per content-pipeline.md §7.4)",
    )

    # ── verify ────────────────────────────────────────────────────────────────
    ver_parser = subparsers.add_parser(
        "verify",
        help="Verify a seed file — no LLM calls (per content-pipeline.md §7.3)",
    )
    ver_parser.add_argument(
        "--in", dest="infile", required=True,
        help="Path to JSON seed file or templates array",
    )
    ver_parser.add_argument(
        "--templates-only", action="store_true",
        help="Input is a bare array of QuestionTemplate objects",
    )
    ver_parser.add_argument(
        "--out",
        help="Write report JSON to this path (default: stdout)",
    )

    # ── parity ────────────────────────────────────────────────────────────────
    _par_parser = subparsers.add_parser(
        "parity",
        help="Run Python↔TS validator parity checks (per content-pipeline.md §6.2)",
    )

    args = parser.parse_args(argv)

    if args.command == "generate":
        from .generate import main as gen_main
        return gen_main([
            *([f"--level={args.level}"] if args.level else []),
            *([f"--archetype={args.archetype}"] if args.archetype else []),
            f"--out={args.out}",
            f"--model={args.model}",
            f"--count={args.count}",
            f"--max-retries={args.max_retries}",
            *(["--dry-run"] if args.dry_run else []),
        ])

    elif args.command == "verify":
        from .verify import main as ver_main
        verify_args = [f"--in={args.infile}"]
        if args.templates_only:
            verify_args.append("--templates-only")
        if args.out:
            verify_args.append(f"--out={args.out}")
        return ver_main(verify_args)

    elif args.command == "parity":
        from .parity_test import main as parity_main
        return parity_main()

    return 0


if __name__ == "__main__":
    sys.exit(main())
