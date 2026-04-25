"""
Canonical per-level archetype scope.
Single source of truth — used by generate.py when --archetype is omitted.
per docs/INDEX.md per-level table.
"""

LEVEL_ARCHETYPES: dict[int, list[str]] = {
    1: ["partition", "identify"],
    2: ["identify", "label"],
    3: ["identify", "label"],
    4: ["make", "partition"],
    5: ["make", "partition"],
    6: ["compare", "snap_match"],
    7: ["compare", "label"],
    8: ["benchmark", "placement"],
    9: ["order", "placement"],
}
