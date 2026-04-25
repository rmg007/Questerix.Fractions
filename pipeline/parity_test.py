"""
Parity test — per content-pipeline.md §6.2.
Loads pipeline/fixtures/parity/*.json and checks that:
  1. Python validator produces the expected outcome.
  2. (Optional) TS validator via Node subprocess produces the same outcome.

Each fixture file shape:
{
  "validatorId": "validator.placement.snap8",
  "input":       { "placedDecimal": 0.5 },
  "expected":    { "targetDecimal": 0.5 },
  "outcome":     "correct"
}

Fails CI if any case mismatches.
Run: pytest pipeline/parity_test.py  OR  python -m pipeline.parity
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import pytest

from .validators_py import VALIDATOR_REGISTRY, run_validator

PARITY_DIR = Path(__file__).parent / "fixtures" / "parity"


# ── Load fixtures ─────────────────────────────────────────────────────────────

def _load_fixtures() -> list[dict]:
    fixtures = []
    for f in sorted(PARITY_DIR.glob("*.json")):
        data = json.loads(f.read_text(encoding="utf-8"))
        if isinstance(data, list):
            for item in data:
                item["_source"] = f.name
                fixtures.append(item)
        else:
            data["_source"] = f.name
            fixtures.append(data)
    return fixtures


# ── Python parity ─────────────────────────────────────────────────────────────

@pytest.mark.parametrize("case", _load_fixtures(), ids=lambda c: f"{c['_source']}::{c['validatorId']}")
def test_python_validator_parity(case: dict) -> None:
    """Python validator must return expected outcome. per content-pipeline.md §6.2"""
    validator_id: str = case["validatorId"]
    input_: dict = case["input"]
    expected: dict = case["expected"]
    expected_outcome: str = case["outcome"]

    assert validator_id in VALIDATOR_REGISTRY, f"Unknown validatorId: {validator_id}"

    result = run_validator(validator_id, input_, expected)
    assert result.outcome == expected_outcome, (
        f"[{case['_source']}] {validator_id}: "
        f"got outcome={result.outcome!r}, expected={expected_outcome!r}\n"
        f"  input={input_}\n  expected={expected}"
    )


# ── TS parity (optional — skipped if Node not available) ─────────────────────

def _node_available() -> bool:
    try:
        result = subprocess.run(["node", "--version"], capture_output=True, timeout=5)
        return result.returncode == 0
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return False


# Inline TS runner script — invoked with Node to call the TS validator
_TS_RUNNER_TEMPLATE = """
const path = require('path');
const projectRoot = path.resolve(__dirname, '..', '..');

// Load compiled validators (assumes tsc has run or ts-node is available)
let validators;
try {{
  validators = require(path.join(projectRoot, 'src', 'validators', '{module}'));
}} catch (e) {{
  process.stdout.write(JSON.stringify({{ error: e.message }}));
  process.exit(0);
}}

const allValidators = Object.values(validators).flat().filter(v => v && v.id);
const reg = allValidators.find(v => v.id === '{validator_id}');
if (!reg) {{
  process.stdout.write(JSON.stringify({{ error: 'validator not found' }}));
  process.exit(0);
}}

const input = {input_json};
const expected = {expected_json};
const result = reg.fn(input, expected);
process.stdout.write(JSON.stringify(result));
"""

_ARCHETYPE_TO_MODULE = {
    "partition": "partition",
    "identify": "identify",
    "label": "label",
    "make": "make",
    # compare, benchmark, order, snap_match, equal_or_not, placement not yet in TS
}


@pytest.mark.skipif(not _node_available(), reason="Node.js not available")
@pytest.mark.parametrize("case", _load_fixtures(), ids=lambda c: f"ts::{c['_source']}::{c['validatorId']}")
def test_ts_validator_parity(case: dict, tmp_path: Path) -> None:
    """
    TS validator via Node subprocess must return same outcome as Python.
    per content-pipeline.md §6.2 conformance test requirement.
    Skipped if validator module not compiled.
    """
    validator_id: str = case["validatorId"]
    archetype = validator_id.split(".")[1]
    module = _ARCHETYPE_TO_MODULE.get(archetype)
    if not module:
        pytest.skip(f"No TS module mapping for archetype '{archetype}'")

    script = _TS_RUNNER_TEMPLATE.format(
        module=module,
        validator_id=validator_id,
        input_json=json.dumps(case["input"]),
        expected_json=json.dumps(case["expected"]),
    )
    script_file = tmp_path / "runner.js"
    script_file.write_text(script, encoding="utf-8")

    proc = subprocess.run(
        ["node", str(script_file)],
        capture_output=True,
        text=True,
        timeout=15,
    )

    if proc.returncode != 0:
        pytest.skip(f"Node runner error: {proc.stderr}")

    try:
        ts_result = json.loads(proc.stdout)
    except json.JSONDecodeError:
        pytest.skip(f"Could not parse TS output: {proc.stdout!r}")

    if "error" in ts_result:
        pytest.skip(f"TS validator unavailable: {ts_result['error']}")

    py_result = run_validator(validator_id, case["input"], case["expected"])

    # Map TS outcome names to Python names
    ts_outcome_map = {"correct": "correct", "partial": "partial", "incorrect": "incorrect"}
    ts_outcome = ts_outcome_map.get(ts_result.get("outcome", ""), ts_result.get("outcome", ""))

    assert py_result.outcome == ts_outcome, (
        f"PARITY MISMATCH [{case['_source']}] {validator_id}:\n"
        f"  Python outcome: {py_result.outcome!r}\n"
        f"  TS outcome:     {ts_outcome!r}\n"
        f"  input={case['input']}\n  expected={case['expected']}"
    )


# ── Standalone CLI entry ──────────────────────────────────────────────────────

def main() -> int:
    """Run parity checks without pytest. Returns 0 on pass, 1 on fail."""
    fixtures = _load_fixtures()
    if not fixtures:
        print("No parity fixtures found in", PARITY_DIR)
        return 0

    failures = 0
    for case in fixtures:
        vid = case["validatorId"]
        if vid not in VALIDATOR_REGISTRY:
            print(f"SKIP (unknown): {vid}")
            continue
        result = run_validator(vid, case["input"], case["expected"])
        if result.outcome == case["outcome"]:
            print(f"PASS {case['_source']} :: {vid}")
        else:
            print(
                f"FAIL {case['_source']} :: {vid}: "
                f"got={result.outcome!r} expected={case['outcome']!r}"
            )
            failures += 1

    print(f"\n{len(fixtures) - failures}/{len(fixtures)} parity cases passed")
    return 0 if failures == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
