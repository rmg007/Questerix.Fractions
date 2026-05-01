#!/usr/bin/env python3
"""
Sanity checker for Questerix Fractions backup JSON exports.

Validates that an export from the app (Settings → Backup my progress) matches
the runtime envelope produced by `src/persistence/backup.ts` and contains no
obvious corruption. Mirrors the shape enforced by `backupEnvelopeSchema` in
`src/persistence/schemas.ts`.

Usage:
    python3 check.py <path-to-export.json> [--student-id <id>]

Exit codes:
    0 = valid
    2 = validation failed (schema, integrity, or cross-record mismatch)
    3 = file not found
"""

import argparse
import json
import sys
from pathlib import Path
from collections import Counter
from typing import Any, Dict, List, Optional, Set, Tuple


# Envelope schema version this checker understands. Must match
# BACKUP_SCHEMA_VERSION in src/persistence/backup.ts.
SUPPORTED_ENVELOPE_VERSION = 1

# Allowed Attempt.outcome values (mirrors attemptSchema in schemas.ts).
VALID_OUTCOMES = {"EXACT", "CLOSE", "WRONG", "ASSISTED", "ABANDONED"}

# Outcomes counted as "correct" for accuracy checks.
CORRECT_OUTCOMES = {"EXACT", "CLOSE"}


class ValidationError(Exception):
    """Raised when validation fails."""


def load_export(filepath: str) -> Dict[str, Any]:
    path = Path(filepath)
    if not path.exists():
        print(f"ERROR: File not found: {filepath}")
        sys.exit(3)
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        raise ValidationError(f"Invalid JSON: {e}")


def validate_envelope(data: Dict[str, Any]) -> Dict[str, Any]:
    """Validate top-level envelope and return the `tables` dict."""
    for key in ("version", "exportedAt", "tables"):
        if key not in data:
            raise ValidationError(f"Envelope missing required key: {key}")

    if not isinstance(data["version"], int):
        raise ValidationError(f"version must be int, got {type(data['version']).__name__}")
    if data["version"] != SUPPORTED_ENVELOPE_VERSION:
        raise ValidationError(
            f"Unsupported envelope version {data['version']} "
            f"(this checker supports {SUPPORTED_ENVELOPE_VERSION})"
        )
    if not isinstance(data["exportedAt"], (int, float)):
        raise ValidationError("exportedAt must be a numeric epoch ms timestamp")
    if not isinstance(data["tables"], dict):
        raise ValidationError("tables must be an object")

    tables = data["tables"]
    for key in (
        "students",
        "sessions",
        "attempts",
        "skillMastery",
        "deviceMeta",
        "bookmarks",
        "sessionTelemetry",
        "hintEvents",
        "misconceptionFlags",
        "progressionStat",
    ):
        if key not in tables:
            raise ValidationError(f"tables.{key} missing (expected array, even if empty)")
        if not isinstance(tables[key], list):
            raise ValidationError(
                f"tables.{key} must be an array, got {type(tables[key]).__name__}"
            )

    content_version = "<unknown>"
    if tables["deviceMeta"]:
        meta = tables["deviceMeta"][0]
        content_version = meta.get("contentVersion", "<missing>")

    print(
        f"OK envelope: version={data['version']}, "
        f"contentVersion={content_version}, "
        f"exportedAt={int(data['exportedAt'])}"
    )
    return tables


def select_student(
    students: List[Dict[str, Any]],
    sessions: List[Dict[str, Any]],
    requested_id: Optional[str],
) -> Dict[str, Any]:
    """Pick the active student record for this playtest export.

    Cycle A protocol expects exactly one student per export. If the device has
    multiple profiles, we pick the one referenced by the sessions in this file
    (or accept --student-id to disambiguate).
    """
    if not students:
        raise ValidationError("tables.students is empty (need at least one student)")

    if requested_id:
        for s in students:
            if s.get("id") == requested_id:
                return s
        raise ValidationError(f"No student matches --student-id {requested_id!r}")

    if len(students) == 1:
        return students[0]

    # Multiple students: pick the one referenced by sessions, error on mixed.
    session_student_ids = {s.get("studentId") for s in sessions if s.get("studentId")}
    if len(session_student_ids) == 0:
        raise ValidationError(
            f"Multiple students ({len(students)}) but no sessions to disambiguate; "
            f"pass --student-id <id>"
        )
    if len(session_student_ids) > 1:
        raise ValidationError(
            f"Sessions reference multiple students: {sorted(session_student_ids)}; "
            f"pass --student-id <id> to pick one"
        )
    sole_id = next(iter(session_student_ids))
    for s in students:
        if s.get("id") == sole_id:
            return s
    raise ValidationError(
        f"Sessions reference studentId={sole_id!r} but no student record matches"
    )


def validate_student(student: Dict[str, Any]) -> None:
    for key in ("id", "displayName", "gradeLevel", "createdAt", "lastActiveAt"):
        if key not in student:
            raise ValidationError(f"Student missing key: {key}")
    if not isinstance(student["id"], str) or not student["id"]:
        raise ValidationError(f"Student.id must be non-empty string, got {student['id']!r}")
    if not isinstance(student["displayName"], str) or not student["displayName"]:
        raise ValidationError("Student.displayName must be non-empty string")
    if student["gradeLevel"] not in (0, 1, 2):
        raise ValidationError(
            f"Student.gradeLevel must be 0, 1, or 2 (got {student['gradeLevel']!r})"
        )
    print(f"OK student: {student['displayName']} (grade {student['gradeLevel']})")


def validate_sessions(
    sessions: List[Dict[str, Any]],
    student_id: str,
) -> Tuple[Set[str], int, int]:
    """Validate sessions belonging to the active student.

    Returns (session_ids, completed_count, in_progress_count).
    """
    if not sessions:
        raise ValidationError("tables.sessions is empty (no playtest data to check)")

    own_sessions = [s for s in sessions if s.get("studentId") == student_id]
    if not own_sessions:
        raise ValidationError(
            f"No sessions found for student {student_id!r} "
            f"(envelope has {len(sessions)} session(s) for other students)"
        )

    session_ids: Set[str] = set()
    completed = 0
    in_progress = 0

    for i, sess in enumerate(own_sessions):
        for key in (
            "id",
            "studentId",
            "activityId",
            "levelNumber",
            "startedAt",
            "endedAt",
            "totalAttempts",
            "correctAttempts",
            "accuracy",
        ):
            if key not in sess:
                raise ValidationError(f"Session #{i} missing key: {key}")

        sid = sess["id"]
        if not isinstance(sid, str) or not sid:
            raise ValidationError(f"Session #{i}.id must be non-empty string, got {sid!r}")
        if sid in session_ids:
            raise ValidationError(f"Duplicate session id: {sid}")
        session_ids.add(sid)

        if not (1 <= sess["levelNumber"] <= 9):
            raise ValidationError(
                f"Session {sid}: levelNumber {sess['levelNumber']} outside 1..9"
            )

        ended = sess["endedAt"]
        if ended is None:
            in_progress += 1
        else:
            if not isinstance(ended, (int, float)):
                raise ValidationError(f"Session {sid}: endedAt must be number or null")
            if sess["startedAt"] > ended:
                raise ValidationError(
                    f"Session {sid}: startedAt ({sess['startedAt']}) > endedAt ({ended})"
                )
            completed += 1

        accuracy = sess["accuracy"]
        if accuracy is not None:
            if not isinstance(accuracy, (int, float)) or not (0.0 <= accuracy <= 1.0):
                raise ValidationError(
                    f"Session {sid}: accuracy {accuracy!r} outside [0, 1]"
                )

    levels = sorted({s["levelNumber"] for s in own_sessions})
    print(
        f"OK sessions: {len(own_sessions)} for this student "
        f"({completed} completed, {in_progress} in-progress); levels touched: {levels}"
    )
    return session_ids, completed, in_progress


def validate_attempts(
    attempts: List[Dict[str, Any]],
    session_ids: Set[str],
    student_id: str,
) -> List[Dict[str, Any]]:
    """Validate attempts belonging to this student's sessions."""
    own_attempts = [a for a in attempts if a.get("sessionId") in session_ids]
    if not own_attempts:
        raise ValidationError(
            f"No attempts found for this student's sessions "
            f"(envelope has {len(attempts)} total attempt rows)"
        )

    for i, att in enumerate(own_attempts):
        for key in (
            "sessionId",
            "studentId",
            "questionTemplateId",
            "outcome",
            "responseMs",
            "submittedAt",
        ):
            if key not in att:
                raise ValidationError(f"Attempt #{i} missing key: {key}")

        if att["studentId"] != student_id:
            raise ValidationError(
                f"Attempt #{i}: studentId {att['studentId']!r} does not match active "
                f"student {student_id!r} (orphaned attempt)"
            )
        if att["outcome"] not in VALID_OUTCOMES:
            raise ValidationError(
                f"Attempt #{i}: outcome {att['outcome']!r} not in {sorted(VALID_OUTCOMES)}"
            )
        if not isinstance(att["responseMs"], (int, float)) or att["responseMs"] < 0:
            raise ValidationError(
                f"Attempt #{i}: responseMs must be non-negative number, "
                f"got {att['responseMs']!r}"
            )

    correct = sum(1 for a in own_attempts if a["outcome"] in CORRECT_OUTCOMES)
    print(
        f"OK attempts: {len(own_attempts)} for this student "
        f"({correct} correct via outcome ∈ {{EXACT, CLOSE}})"
    )
    return own_attempts


def validate_session_attempt_consistency(
    sessions: List[Dict[str, Any]],
    attempts: List[Dict[str, Any]],
    student_id: str,
) -> None:
    """Cross-check that session.totalAttempts and accuracy match the attempt rows.

    Skips in-progress sessions (endedAt is null) — counts there are still
    settling and won't match until closeSession() runs.
    """
    own_sessions = [s for s in sessions if s.get("studentId") == student_id]
    by_session: Counter = Counter(a["sessionId"] for a in attempts)
    correct_by_session: Counter = Counter(
        a["sessionId"] for a in attempts if a["outcome"] in CORRECT_OUTCOMES
    )

    for sess in own_sessions:
        if sess["endedAt"] is None:
            continue
        sid = sess["id"]
        actual = by_session.get(sid, 0)
        if sess["totalAttempts"] != actual:
            raise ValidationError(
                f"Session {sid}: totalAttempts={sess['totalAttempts']} but "
                f"{actual} attempt rows reference it"
            )

        # Accuracy can be null for sessions that ended with zero attempts;
        # otherwise it should match correct/total within float tolerance.
        accuracy = sess["accuracy"]
        if actual == 0:
            if accuracy not in (None, 0, 0.0):
                raise ValidationError(
                    f"Session {sid}: 0 attempts but accuracy={accuracy!r} (expected null or 0)"
                )
            continue
        if accuracy is None:
            raise ValidationError(
                f"Session {sid}: ended with {actual} attempts but accuracy is null"
            )
        expected = correct_by_session.get(sid, 0) / actual
        if abs(accuracy - expected) > 0.001:
            raise ValidationError(
                f"Session {sid}: stored accuracy={accuracy:.3f} disagrees with "
                f"computed {expected:.3f} ({correct_by_session.get(sid, 0)}/{actual})"
            )

    print("OK consistency: session counts + accuracy match attempt rows")


def summarize(
    student: Dict[str, Any],
    sessions: List[Dict[str, Any]],
    attempts: List[Dict[str, Any]],
    student_id: str,
    tables: Dict[str, Any],
) -> None:
    own_sessions = [s for s in sessions if s.get("studentId") == student_id]
    own_attempts = [a for a in attempts if a.get("studentId") == student_id]
    correct = sum(1 for a in own_attempts if a["outcome"] in CORRECT_OUTCOMES)
    levels = sorted({s["levelNumber"] for s in own_sessions})
    activities = Counter(s["activityId"] for s in own_sessions)
    hint_events = [
        h
        for h in tables.get("hintEvents", [])
        if any(a["id"] == h.get("attemptId") for a in own_attempts)
    ]

    print()
    print("=" * 60)
    print("EXPORT SUMMARY")
    print("=" * 60)
    print(f"Student:       {student['displayName']} (grade {student['gradeLevel']})")
    print(f"Sessions:      {len(own_sessions)}")
    print(f"Attempts:      {len(own_attempts)} ({correct} correct)")
    if own_attempts:
        print(f"Accuracy:      {correct / len(own_attempts):.1%}")
    print(f"Levels:        {levels}")
    print(f"Activities:    {dict(activities)}")
    print(f"Hint events:   {len(hint_events)}")
    print(f"Mastery rows:  {sum(1 for m in tables.get('skillMastery', []) if m.get('studentId') == student_id)}")
    print(f"Misconceptions:{sum(1 for m in tables.get('misconceptionFlags', []) if m.get('studentId') == student_id)}")
    print("=" * 60)


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate a Questerix Fractions backup JSON export.")
    parser.add_argument("path", help="Path to the exported JSON file")
    parser.add_argument(
        "--student-id",
        dest="student_id",
        default=None,
        help="Pick a specific student when the device has multiple profiles",
    )
    args = parser.parse_args()

    try:
        data = load_export(args.path)
        tables = validate_envelope(data)
        student = select_student(tables["students"], tables["sessions"], args.student_id)
        validate_student(student)
        session_ids, _completed, _in_progress = validate_sessions(
            tables["sessions"], student["id"]
        )
        validate_attempts(tables["attempts"], session_ids, student["id"])
        validate_session_attempt_consistency(
            tables["sessions"], tables["attempts"], student["id"]
        )
        summarize(student, tables["sessions"], tables["attempts"], student["id"], tables)
        print("\nEXPORT VALID\n")
        sys.exit(0)
    except ValidationError as e:
        print(f"\nVALIDATION FAILED: {e}\n")
        sys.exit(2)


if __name__ == "__main__":
    main()
