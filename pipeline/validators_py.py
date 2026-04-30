"""
Python parity validators — mirror of src/validators/*.ts.
Pure functions. Same input/expected/output contract as TypeScript.
per content-pipeline.md §6.2 — must match TS runtime exactly.

ValidatorResult shape:
  outcome: "correct" | "partial" | "incorrect"
  score:   float 0..1
  feedback?: str
  detectedMisconception?: str
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable, Literal, Optional


# ── Result type ───────────────────────────────────────────────────────────────

@dataclass
class ValidatorResult:
    outcome: Literal["correct", "partial", "incorrect"]
    score: float  # 0..1
    feedback: Optional[str] = None
    detectedMisconception: Optional[str] = None


ValidatorFn = Callable[[Any, Any], ValidatorResult]


@dataclass
class ValidatorRegistration:
    id: str
    archetype: str
    variant: str
    fn: ValidatorFn


# ── Shared math helpers (mirrors src/validators/utils.ts) ─────────────────────

def _mean(values: list[float]) -> float:
    """Array mean. Returns 0 for empty. per utils.ts:mean"""
    if not values:
        return 0.0
    return sum(values) / len(values)


def _is_within_tolerance(value: float, target: float, tolerance: float) -> bool:
    """per utils.ts:isWithinTolerance"""
    if target == 0:
        return value == 0
    return abs(value - target) / target <= tolerance


def _kendall_tau_distance(a: list[str], b: list[str]) -> int:
    """
    Minimum adjacent swaps to transform a into b.
    per utils.ts:kendallTauDistance — activity-archetypes.md §7
    """
    pos = {v: i for i, v in enumerate(b)}
    ranked = [pos.get(v, 0) for v in a]
    swaps = 0
    for i in range(len(ranked)):
        for j in range(i + 1, len(ranked)):
            if ranked[i] > ranked[j]:
                swaps += 1
    return swaps


# ─────────────────────────────────────────────────────────────────────────────
# 1. partition  (mirrors src/validators/partition.ts)
# ─────────────────────────────────────────────────────────────────────────────

def _partition_equal_areas(input_: dict, expected: dict) -> ValidatorResult:
    """
    Returns correct if relative area delta <= areaTolerance,
    partial if <= areaTolerance*2, else incorrect.
    per activity-archetypes.md §1 / partition.ts:partitionEqualAreas
    """
    region_areas: list[float] = input_["regionAreas"]
    target_partitions: int = expected["targetPartitions"]
    area_tolerance: float = expected["areaTolerance"]

    if len(region_areas) != target_partitions:
        return ValidatorResult("incorrect", 0.0, "wrong_partition_count")

    avg = _mean(region_areas)
    if avg == 0:
        return ValidatorResult("incorrect", 0.0)

    max_delta = max(region_areas) - min(region_areas)
    relative_delta = max_delta / avg

    if relative_delta <= area_tolerance:
        return ValidatorResult("correct", 1.0, "exact")
    if relative_delta <= area_tolerance * 2:
        return ValidatorResult("partial", 0.5, "close")
    return ValidatorResult("incorrect", 0.0, "wrong")


def _partition_equal_count(input_: dict, expected: dict) -> ValidatorResult:
    """per partition.ts:partitionEqualCount"""
    if input_["regionCount"] == expected["targetPartitions"]:
        return ValidatorResult("correct", 1.0)
    return ValidatorResult("incorrect", 0.0, "wrong_partition_count")


partition_equal_areas = ValidatorRegistration(
    id="validator.partition.equalAreas",
    archetype="partition",
    variant="equalAreas",
    fn=_partition_equal_areas,
)
partition_equal_count = ValidatorRegistration(
    id="validator.partition.equalCount",
    archetype="partition",
    variant="equalCount",
    fn=_partition_equal_count,
)


# ─────────────────────────────────────────────────────────────────────────────
# 2. identify  (mirrors src/validators/identify.ts)
# ─────────────────────────────────────────────────────────────────────────────

def _identify_exact_index(input_: dict, expected: dict) -> ValidatorResult:
    """
    Returns correct if selectedIndex == targetIndex.
    Flags misconception if distractor mapping exists.
    per activity-archetypes.md §2 / identify.ts:identifyExactIndex
    """
    if input_["selectedIndex"] == expected["targetIndex"]:
        return ValidatorResult("correct", 1.0)

    mc = (expected.get("distractorMisconceptions") or {}).get(
        str(input_["selectedIndex"])
    ) or (expected.get("distractorMisconceptions") or {}).get(input_["selectedIndex"])

    result = ValidatorResult("incorrect", 0.0)
    if mc is not None:
        result.detectedMisconception = mc
    return result


identify_exact_index = ValidatorRegistration(
    id="validator.identify.exactIndex",
    archetype="identify",
    variant="exactIndex",
    fn=_identify_exact_index,
)


# ─────────────────────────────────────────────────────────────────────────────
# 3. label  (mirrors src/validators/label.ts)
# ─────────────────────────────────────────────────────────────────────────────

def _label_exact_match(input_: dict, expected: dict) -> ValidatorResult:
    """
    Returns correct if all label→region mappings match.
    score reflects proportion correct.
    per activity-archetypes.md §3 / label.ts:labelExactMatch
    """
    student_mappings: list[dict] = input_["studentMappings"]
    expected_label_for_region: dict[str, str] = expected["expectedLabelForRegion"]
    region_ids = list(expected_label_for_region.keys())
    total = len(region_ids)

    wrong = 0
    for m in student_mappings:
        if expected_label_for_region.get(m["regionId"]) != m["labelId"]:
            wrong += 1
    for rid in region_ids:
        if not any(m["regionId"] == rid for m in student_mappings):
            wrong += 1

    if wrong == 0:
        return ValidatorResult("correct", 1.0)
    score = max(0.0, (total - wrong) / total) if total > 0 else 0.0
    return ValidatorResult("incorrect", score, f"wrong_mappings:{wrong}")


label_match_target = ValidatorRegistration(
    id="validator.label.matchTarget",  # canonical per activity-archetypes.md §11 row 3
    archetype="label",
    variant="matchTarget",
    fn=_label_exact_match,
)


# ─────────────────────────────────────────────────────────────────────────────
# 4. make  (mirrors src/validators/make.ts)
# ─────────────────────────────────────────────────────────────────────────────

def _make_fold_alignment(input_: dict, expected: dict) -> ValidatorResult:
    """
    Checks partition equality first, then shaded region count.
    per activity-archetypes.md §4 / make.ts:makeFoldAlignment
    """
    part_result = _partition_equal_areas(
        {"regionAreas": input_["regionAreas"]},
        {"targetPartitions": expected["targetPartitions"], "areaTolerance": expected["areaTolerance"]},
    )
    if part_result.outcome != "correct":
        return part_result

    if input_["shadedRegionCount"] != expected["targetNumerator"]:
        return ValidatorResult("incorrect", 0.0, "wrong_shade_count")
    return ValidatorResult("correct", 1.0)


def _make_halving_by_line(input_: dict, expected: dict) -> ValidatorResult:
    """Halves-only variant with fixed targetPartitions=2. per make.ts:makeHalvingByLine"""
    return _partition_equal_areas(
        {"regionAreas": input_["regionAreas"]},
        {"targetPartitions": 2, "areaTolerance": expected["areaTolerance"]},
    )


make_fold_and_shade = ValidatorRegistration(
    id="validator.make.foldAndShade",  # canonical per activity-archetypes.md §11 row 4
    archetype="make",
    variant="foldAndShade",
    fn=_make_fold_alignment,
)
make_halving_by_line = ValidatorRegistration(
    id="validator.make.halvingByLine",
    archetype="make",
    variant="halvingByLine",
    fn=_make_halving_by_line,
)


# ─────────────────────────────────────────────────────────────────────────────
# 5. compare
# ─────────────────────────────────────────────────────────────────────────────

def _compare_greater_than(input_: dict, expected: dict) -> ValidatorResult:
    """
    Returns correct if studentChoice matches expected answer.
    expected: { "correctChoice": "A" | "B" | "equal" }
    input:    { "studentChoice": "A" | "B" | "equal" }
    """
    if input_["studentChoice"] == expected["correctChoice"]:
        return ValidatorResult("correct", 1.0)
    return ValidatorResult("incorrect", 0.0)


compare_greater_than = ValidatorRegistration(
    id="validator.compare.greaterThan",
    archetype="compare",
    variant="greaterThan",
    fn=_compare_greater_than,
)


def _compare_relation(input_: dict, expected: dict) -> ValidatorResult:
    """
    expected: { "trueRelation": ">"|"<"|"=" }
    input:    { "studentRelation": ">"|"<"|"=" }
    """
    if input_.get("studentRelation") == expected.get("trueRelation"):
        return ValidatorResult("correct", 1.0)
    return ValidatorResult("incorrect", 0.0)


compare_relation = ValidatorRegistration(
    id="validator.compare.relation",
    archetype="compare",
    variant="relation",
    fn=_compare_relation,
)


# ─────────────────────────────────────────────────────────────────────────────
# 6. benchmark
# ─────────────────────────────────────────────────────────────────────────────

def _benchmark_closest(input_: dict, expected: dict) -> ValidatorResult:
    """
    Returns correct if student picks the closest benchmark label.
    expected: { "correctBenchmark": "zero"|"half"|"one" }
    input:    { "studentBenchmark": "zero"|"half"|"one" }
    """
    if input_["studentBenchmark"] == expected["correctBenchmark"]:
        return ValidatorResult("correct", 1.0)
    return ValidatorResult("incorrect", 0.0)


benchmark_closest = ValidatorRegistration(
    id="validator.benchmark.closestBenchmark",
    archetype="benchmark",
    variant="closestBenchmark",
    fn=_benchmark_closest,
)


def _benchmark_sort_to_zone(input_: dict, expected: dict) -> ValidatorResult:
    """
    expected: { "correctPlacements": { fracId: zone } }
    input:    { "studentPlacements": { fracId: zone } }
    """
    correct: dict = expected.get("correctPlacements", {})
    student: dict = input_.get("studentPlacements", {})
    if not correct:
        return ValidatorResult("correct", 1.0)
    wrong = sum(1 for fid, zone in correct.items() if student.get(fid) != zone)
    if wrong == 0:
        return ValidatorResult("correct", 1.0)
    return ValidatorResult("incorrect", 0.0)


benchmark_sort_to_zone = ValidatorRegistration(
    id="validator.benchmark.sortToZone",
    archetype="benchmark",
    variant="sortToZone",
    fn=_benchmark_sort_to_zone,
)


# ─────────────────────────────────────────────────────────────────────────────
# 7. order
# ─────────────────────────────────────────────────────────────────────────────

def _order_sequence(input_: dict, expected: dict) -> ValidatorResult:
    """
    EXACT if Kendall tau distance == 0, CLOSE if == 1, else WRONG.
    per activity-archetypes.md §7 / utils.ts:kendallTauDistance
    """
    student_order: list[str] = input_["studentOrder"]
    correct_order: list[str] = expected["expectedOrder"]

    dist = _kendall_tau_distance(student_order, correct_order)
    if dist == 0:
        return ValidatorResult("correct", 1.0)
    if dist == 1:
        return ValidatorResult("partial", 0.5, "close")
    return ValidatorResult("incorrect", 0.0, f"tau_distance:{dist}")


order_sequence = ValidatorRegistration(
    id="validator.order.sequence",
    archetype="order",
    variant="sequence",
    fn=_order_sequence,
)


# ─────────────────────────────────────────────────────────────────────────────
# 8. snap_match
# ─────────────────────────────────────────────────────────────────────────────

def _snap_match_equivalence(input_: dict, expected: dict) -> ValidatorResult:
    """
    Returns correct if snapped fraction decimal == target decimal within 1e-9.
    expected: { "targetDecimal": float }
    input:    { "snappedDecimal": float }
    """
    snapped: float = input_["snappedDecimal"]
    target: float = expected["targetDecimal"]
    if abs(snapped - target) <= 1e-9:
        return ValidatorResult("correct", 1.0)
    return ValidatorResult("incorrect", 0.0)


snap_match_equivalence = ValidatorRegistration(
    id="validator.snap_match.equivalence",
    archetype="snap_match",
    variant="equivalence",
    fn=_snap_match_equivalence,
)


def _snap_match_all_pairs(input_: dict, expected: dict) -> ValidatorResult:
    """
    expected: { "expectedPairs": [[leftId, rightId], ...] }
    input:    { "studentPairs": [[leftId, rightId], ...] }
    """
    expected_pairs = {tuple(p) for p in expected.get("expectedPairs", [])}
    student_pairs = {tuple(p) for p in input_.get("studentPairs", [])}
    if expected_pairs == student_pairs:
        return ValidatorResult("correct", 1.0)
    return ValidatorResult("incorrect", 0.0)


snap_match_all_pairs = ValidatorRegistration(
    id="validator.snap_match.allPairs",
    archetype="snap_match",
    variant="allPairs",
    fn=_snap_match_all_pairs,
)


# ─────────────────────────────────────────────────────────────────────────────
# 9. equal_or_not
# ─────────────────────────────────────────────────────────────────────────────

def _equal_or_not_area_tolerance(input_: dict, expected: dict) -> ValidatorResult:
    """
    Returns correct if studentSaysEqual matches actuallyEqual.
    area equality is determined by the Phaser layer; expected carries the ground truth.
    expected: { "correctAnswer": bool }
    input:    { "studentAnswer": bool }
    """
    if input_["studentAnswer"] == expected["correctAnswer"]:
        return ValidatorResult("correct", 1.0)
    return ValidatorResult("incorrect", 0.0)


equal_or_not_area_tolerance = ValidatorRegistration(
    id="validator.equal_or_not.areaTolerance",
    archetype="equal_or_not",
    variant="areaTolerance",
    fn=_equal_or_not_area_tolerance,
)


# ─────────────────────────────────────────────────────────────────────────────
# 10. placement
# ─────────────────────────────────────────────────────────────────────────────

def _placement_snap8(input_: dict, expected: dict) -> ValidatorResult:
    """
    EXACT if |placed - target| <= 1/16 (snap zone for 1/8 increments).
    CLOSE if <= 1/8.
    WRONG otherwise.
    per content-pipeline.md §5.1 validator pseudocode / activity-archetypes.md §10
    """
    placed: float = input_["placedDecimal"]
    target: float = expected["targetDecimal"]
    diff = abs(placed - target)

    if diff <= 1 / 16:
        return ValidatorResult("correct", 1.0, "exact")
    if diff <= 1 / 8:
        return ValidatorResult("partial", 0.5, "close")
    return ValidatorResult("incorrect", 0.0, "wrong")


placement_snap8 = ValidatorRegistration(
    id="validator.placement.snap8",
    archetype="placement",
    variant="snap8",
    fn=_placement_snap8,
)


# ── Registry ──────────────────────────────────────────────────────────────────

VALIDATOR_REGISTRY: dict[str, ValidatorRegistration] = {
    v.id: v
    for v in [
        partition_equal_areas,
        partition_equal_count,
        identify_exact_index,
        label_match_target,
        make_fold_and_shade,
        make_halving_by_line,
        compare_greater_than,
        compare_relation,
        benchmark_closest,
        benchmark_sort_to_zone,
        order_sequence,
        snap_match_equivalence,
        snap_match_all_pairs,
        equal_or_not_area_tolerance,
        placement_snap8,
    ]
}


def run_validator(validator_id: str, input_: dict, expected: dict) -> ValidatorResult:
    """Dispatch by validatorId. Raises KeyError if unknown."""
    reg = VALIDATOR_REGISTRY[validator_id]
    return reg.fn(input_, expected)
